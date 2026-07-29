import { useState } from "react";
import { z } from "zod";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Smartphone } from "lucide-react";
import { SmsConsentBlock } from "@/components/compliance/SmsConsentBlock";
import {
  SMS_MARKETING_CONSENT_TEXT,
  SMS_TRANSACTIONAL_CONSENT_TEXT,
} from "@/lib/smsConsent";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileId: string;
  headline?: string;
  description?: string;
  buttonText?: string;
}

const schema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(100, "Name is too long"),
  phone: z
    .string()
    .trim()
    .min(7, "Please enter a valid phone number")
    .max(20, "Phone is too long")
    .regex(/^[\d\s+()\-.]+$/, "Phone number contains invalid characters"),
});

export const SmsOptInDrawer = ({
  open,
  onOpenChange,
  profileId,
  headline = "Join our VIP Text List",
  description = "Get exclusive updates and offers via text.",
  buttonText = "Join the VIP List",
}: Props) => {
  const isMobile = useIsMobile();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [transactionalConsent, setTransactionalConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // VIP list is a MARKETING campaign — marketing consent is required.
    if (!marketingConsent) {
      toast.error("Please check the marketing consent box to join the VIP list.");
      return;
    }

    const parsed = schema.safeParse({ name, phone });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check your info");
      return;
    }

    setSubmitting(true);
    try {
      const optInAt = new Date().toISOString();
      const { error } = await supabase.from("personal_email_captures").insert({
        profile_id: profileId,
        name: parsed.data.name,
        phone: parsed.data.phone,
        email: null,
        // Legacy field — true if the user opted into either program.
        sms_opt_in: marketingConsent || transactionalConsent,
        sms_opt_in_at: optInAt,
        sms_marketing_opt_in: marketingConsent,
        sms_marketing_opt_in_at: marketingConsent ? optInAt : null,
        sms_transactional_opt_in: transactionalConsent,
        sms_transactional_opt_in_at: transactionalConsent ? optInAt : null,
      } as any);

      if (error) throw error;

      // A2P 10DLC audit trail — store the exact consent copy shown per campaign.
      await supabase.from("sms_signup_submissions" as any).insert({
        name: parsed.data.name,
        phone: parsed.data.phone,
        // Legacy field mirrors whichever campaign was chosen (marketing wins).
        consent_text: marketingConsent
          ? SMS_MARKETING_CONSENT_TEXT
          : SMS_TRANSACTIONAL_CONSENT_TEXT,
        consent_at: optInAt,
        marketing_consent_text: marketingConsent ? SMS_MARKETING_CONSENT_TEXT : null,
        marketing_consent_at: marketingConsent ? optInAt : null,
        transactional_consent_text: transactionalConsent
          ? SMS_TRANSACTIONAL_CONSENT_TEXT
          : null,
        transactional_consent_at: transactionalConsent ? optInAt : null,
        user_agent: navigator.userAgent,
        source: `personal-hub:${profileId}`,
      } as any);

      toast.success("You're on the list! 🎉");
      setName("");
      setPhone("");
      setMarketingConsent(false);
      setTransactionalConsent(false);
      onOpenChange(false);
    } catch (err) {
      console.error("SMS opt-in error:", err);
      toast.error("Something went wrong, please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4 px-4 pb-6">
      <div className="space-y-2">
        <Label htmlFor="sms-name">Full Name</Label>
        <Input
          id="sms-name"
          type="text"
          autoComplete="name"
          placeholder="Jane Smith"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          required
          className="h-12"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="sms-phone">Phone Number</Label>
        <Input
          id="sms-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="(555) 123-4567"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          maxLength={20}
          required
          className="h-12"
        />
      </div>
      <SmsConsentBlock
        id="personal-sms-consent"
        marketingChecked={marketingConsent}
        onMarketingChange={setMarketingConsent}
        transactionalChecked={transactionalConsent}
        onTransactionalChange={setTransactionalConsent}
        requireMarketing
      />
      <Button
        type="submit"
        disabled={submitting || !marketingConsent}
        className="w-full h-12 text-base font-semibold"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Joining...
          </>
        ) : (
          buttonText
        )}
      </Button>
    </form>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader className="text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Smartphone className="h-6 w-6 text-primary" />
            </div>
            <DrawerTitle>{headline}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          {formContent}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Smartphone className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle>{headline}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
};
