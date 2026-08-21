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
import { Loader2, MessageSquareHeart, ShieldCheck, BellOff, Ban } from "lucide-react";
import { SmsConsentBlock } from "@/components/compliance/SmsConsentBlock";
import {
  SMS_MARKETING_CONSENT_TEXT,
  SMS_TRANSACTIONAL_CONSENT_TEXT,
} from "@/lib/smsConsent";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantId: string;
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

export const RestaurantSmsOptInDrawer = ({
  open,
  onOpenChange,
  restaurantId,
  headline = "Get VIP text perks",
  description = "Be first to know about specials, events and members-only deals.",
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
      const { error } = await (supabase.from("restaurant_sms_subscribers" as any) as any).insert({
        restaurant_id: restaurantId,
        name: parsed.data.name,
        phone: parsed.data.phone,
        sms_opt_in: marketingConsent || transactionalConsent,
        sms_opt_in_at: optInAt,
        sms_marketing_opt_in: marketingConsent,
        sms_marketing_opt_in_at: marketingConsent ? optInAt : null,
        sms_transactional_opt_in: transactionalConsent,
        sms_transactional_opt_in_at: transactionalConsent ? optInAt : null,
      });

      if (error) throw error;

      // A2P 10DLC audit trail — persist the exact consent copy per campaign.
      await supabase.from("sms_signup_submissions" as any).insert({
        name: parsed.data.name,
        phone: parsed.data.phone,
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
        source: `restaurant-hub:${restaurantId}`,
      } as any);


      toast.success("You're on the list! 🎉");
      setName("");
      setPhone("");
      setMarketingConsent(false);
      setTransactionalConsent(false);
      onOpenChange(false);
    } catch (err) {
      console.error("Restaurant SMS opt-in error:", err);
      toast.error("Something went wrong, please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const trustChips = (
    <div className="flex flex-wrap justify-center gap-1.5">
      {[
        { icon: BellOff, label: "No spam" },
        { icon: ShieldCheck, label: "Text STOP anytime" },
        { icon: Ban, label: "We never sell your info" },
      ].map(({ icon: Icon, label }) => (
        <span
          key={label}
          className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground"
        >
          <Icon className="h-3 w-3" />
          {label}
        </span>
      ))}
    </div>
  );

  const headerMark = (
    <div className="mx-auto h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
      <MessageSquareHeart className="h-5 w-5 text-primary" strokeWidth={1.75} />
    </div>
  );

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4 px-4 pb-6">
      {trustChips}
      <div className="space-y-2">
        <Label htmlFor="r-sms-name">Full Name</Label>
        <Input
          id="r-sms-name"
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
        <Label htmlFor="r-sms-phone">Phone Number</Label>
        <Input
          id="r-sms-phone"
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
        id="restaurant-sms-consent"
        marketingChecked={marketingConsent}
        onMarketingChange={setMarketingConsent}
        transactionalChecked={transactionalConsent}
        onTransactionalChange={setTransactionalConsent}
        requireMarketing
      />
      <div className="space-y-1.5">
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
        <p className="text-center text-[11px] text-muted-foreground">Takes 5 seconds</p>
      </div>
    </form>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[88dvh]">
          <div className="overflow-y-auto overscroll-contain">
            <DrawerHeader className="text-center pb-2">
              {headerMark}
              <DrawerTitle>{headline}</DrawerTitle>
              <DrawerDescription>{description}</DrawerDescription>
            </DrawerHeader>
            {formContent}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[88vh] overflow-y-auto">
        <DialogHeader className="text-center pb-1">
          {headerMark}
          <DialogTitle>{headline}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
};

