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
import { Loader2 } from "lucide-react";

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
  headline = "Join our VIP Text List",
  description = "Get exclusive updates and offers via text.",
  buttonText = "Join the VIP List",
}: Props) => {
  const isMobile = useIsMobile();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ name, phone });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check your info");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await (supabase.from("restaurant_sms_subscribers" as any) as any).insert({
        restaurant_id: restaurantId,
        name: parsed.data.name,
        phone: parsed.data.phone,
        sms_opt_in: true,
        sms_opt_in_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast.success("You're on the list! 🎉");
      setName("");
      setPhone("");
      onOpenChange(false);
    } catch (err) {
      console.error("Restaurant SMS opt-in error:", err);
      toast.error("Something went wrong, please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4 px-4 pb-6">
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
      <Button type="submit" disabled={submitting} className="w-full h-12 text-base font-semibold">
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Joining...
          </>
        ) : (
          buttonText
        )}
      </Button>
      <p className="text-xs text-muted-foreground text-center leading-snug">
        By submitting, you agree to receive recurring marketing text messages from this business at the number provided.
        Consent is not a condition of any purchase.{" "}
        <strong>Message and data rates may apply. Message frequency varies. Reply STOP to cancel, HELP for help.</strong>{" "}
        See our <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline">Privacy Policy</a> and{" "}
        <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline">Terms</a>.
      </p>
    </form>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader className="text-center">
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
          <DialogTitle>{headline}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
};
