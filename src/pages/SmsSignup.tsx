import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SmsConsentBlock } from "@/components/compliance/SmsConsentBlock";
import {
  SMS_MARKETING_CONSENT_TEXT,
  SMS_TRANSACTIONAL_CONSENT_TEXT,
  SMS_HELP_NUMBER,
  SMS_KEYWORD,
} from "@/lib/smsConsent";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Loader2, MessageSquare, CheckCircle2 } from "lucide-react";

const schema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(100, "Name is too long"),
  phone: z
    .string()
    .trim()
    .min(7, "Please enter a valid phone number")
    .max(20, "Phone is too long")
    .regex(/^[\d\s+()\-.]+$/, "Phone number contains invalid characters"),
});

const SmsSignup = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [transactionalConsent, setTransactionalConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!marketingConsent && !transactionalConsent) {
      toast.error("Please check at least one consent box to continue.");
      return;
    }
    const parsed = schema.safeParse({ name, phone });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check your info");
      return;
    }

    setSubmitting(true);
    try {
      const consentAt = new Date().toISOString();
      const { error } = await supabase.from("sms_signup_submissions" as any).insert({
        name: parsed.data.name,
        phone: parsed.data.phone,
        // Legacy — mirror whichever campaign was chosen (marketing wins).
        consent_text: marketingConsent
          ? SMS_MARKETING_CONSENT_TEXT
          : SMS_TRANSACTIONAL_CONSENT_TEXT,
        consent_at: consentAt,
        marketing_consent_text: marketingConsent ? SMS_MARKETING_CONSENT_TEXT : null,
        marketing_consent_at: marketingConsent ? consentAt : null,
        transactional_consent_text: transactionalConsent
          ? SMS_TRANSACTIONAL_CONSENT_TEXT
          : null,
        transactional_consent_at: transactionalConsent ? consentAt : null,
        user_agent: navigator.userAgent,
        source: "/sms-signup",
      } as any);
      if (error) throw error;
      setSuccess(true);
      toast.success("You're on the list! 🎉");
    } catch (err) {
      console.error("SMS signup error:", err);
      toast.error("Something went wrong, please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>SMS VIP Club Signup | TapAway</title>
        <meta
          name="description"
          content="Join the TapAway SMS VIP Club to receive loyalty rewards, exclusive discount alerts, and review reminders from local small businesses you love."
        />
        <link rel="canonical" href="https://tapaway.co/sms-signup" />
        <meta property="og:title" content="TapAway SMS Customer VIP Club Signup" />
        <meta
          property="og:description"
          content="Opt in to loyalty rewards, exclusive discounts, and review reminders from participating local businesses."
        />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary" />
      </Helmet>

      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">TapAway</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Home
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-10 max-w-2xl">
        <header className="text-center mb-8">
          <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <MessageSquare className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">
            TapAway SMS Customer VIP Club Signup
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            TapAway runs TWO independent SMS programs on behalf of participating local small
            businesses (restaurants, bakeries, salons, barbers). Each program has its own opt-in
            below — checking one does <strong>not</strong> enroll you in the other.
          </p>
          <div className="mt-6 grid gap-3 text-left sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <h3 className="text-sm font-semibold mb-1">Program 1 — Marketing Texts</h3>
              <p className="text-xs text-muted-foreground">
                Promotions, discount alerts, and loyalty rewards. Msg frequency varies. Msg & data
                rates may apply. Reply STOP to cancel, HELP for help.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <h3 className="text-sm font-semibold mb-1">
                Program 2 — Review Reminders & Service Notifications
              </h3>
              <p className="text-xs text-muted-foreground">
                Reminders to leave a review after a visit and service-related notices. Msg frequency
                varies. Msg & data rates may apply. Reply STOP to cancel, HELP for help.
              </p>
            </div>
          </div>
        </header>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          {success ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-semibold mb-2">You're subscribed!</h2>
              <p className="text-muted-foreground">
                We'll only text you when a participating business has something worth your attention.
                Reply <strong>STOP</strong> at any time to unsubscribe.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="signup-name">Customer Name</Label>
                <Input
                  id="signup-name"
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
                <Label htmlFor="signup-phone">Phone Number</Label>
                <Input
                  id="signup-phone"
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
                id="signup-consent"
                marketingChecked={marketingConsent}
                onMarketingChange={setMarketingConsent}
                transactionalChecked={transactionalConsent}
                onTransactionalChange={setTransactionalConsent}
                requireMarketing={false}
                requireTransactional={false}
              />

              <Button
                type="submit"
                disabled={
                  submitting ||
                  (!marketingConsent && !transactionalConsent) ||
                  !schema.safeParse({ name, phone }).success
                }
                className="w-full h-12 text-base font-semibold"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Joining...
                  </>
                ) : (
                  "Join Selected Program(s)"
                )}
              </Button>
            </form>
          )}
        </section>

        <section className="mt-8 rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center">
          <h2 className="text-lg font-semibold mb-2">Alternative Opt-In Method</h2>
          <p className="text-muted-foreground">
            Text <strong className="text-foreground">JOIN</strong> or{" "}
            <strong className="text-foreground">{SMS_KEYWORD}</strong> to{" "}
            <strong className="text-foreground">{SMS_HELP_NUMBER}</strong> to join our demo customer
            VIP list.
          </p>
          <p className="text-xs text-muted-foreground mt-3">
            Message & data rates may apply. Message frequency varies. Reply STOP to cancel or HELP for
            help.
          </p>
        </section>

        <footer className="mt-8 text-center text-xs text-muted-foreground space-x-3">
          <a href="/privacy" className="underline">Privacy Policy</a>
          <span>·</span>
          <a href="/terms" className="underline">Terms of Service</a>
          <span>·</span>
          <a href="mailto:tap@tapaway.co" className="underline">tap@tapaway.co</a>
        </footer>
      </main>
    </div>
  );
};

export default SmsSignup;
