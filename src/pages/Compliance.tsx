import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Smartphone, Check, MessageSquare } from "lucide-react";

const Compliance = () => {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>SMS Compliance & Opt-In Flow | TapAway</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="description" content="TapAway SMS opt-in flow, sample messages, and carrier compliance documentation." />
      </Helmet>

      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6 max-w-4xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <Smartphone className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">TapAway — SMS Compliance & Opt-In Flow</h1>
            <p className="text-sm text-muted-foreground">For carrier / Twilio reviewer use. Last updated: May 7, 2026</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-4xl space-y-12">
        {/* Brand & use case */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold">Brand & Use Case</h2>
          <p className="text-muted-foreground leading-relaxed">
            <strong>Brand:</strong> TapAway (tapaway.co) — a platform that gives local businesses NFC-enabled
            "tap" cards. Customers tap a card with their phone, land on the business's profile page, and may
            voluntarily join that business's VIP text list to receive promotions, updates, and offers from
            that specific business.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            <strong>Use case:</strong> Marketing / promotional messages, sent only to recipients who have
            actively submitted their phone number through an opt-in form on a TapAway business profile.
          </p>
          <p className="text-sm text-muted-foreground">
            Compliance contact: <a href="mailto:support@tapaway.co" className="underline">support@tapaway.co</a>
          </p>
        </section>

        {/* Opt-in flow with screenshots */}
        <section className="space-y-6">
          <h2 className="text-xl font-bold">Step-by-Step Opt-In Flow</h2>

          {[
            { n: 1, title: "Customer taps an NFC card", desc: "A physical TapAway card is tapped against a customer's phone (no app required). The phone reads the embedded URL and opens the business's profile.", img: "/compliance/step-1-tap.png" },
            { n: 2, title: "Customer lands on the business profile", desc: "The profile clearly identifies the business and displays a 'Join VIP Text List' call-to-action button. The customer must actively press this button — no auto-prompts.", img: "/compliance/step-2-profile.png" },
            { n: 3, title: "Customer fills out the opt-in form", desc: "A drawer/dialog opens with Name + Phone fields. Directly below the Submit button, the carrier-required disclosure is visible (rates, frequency, STOP/HELP, links to Privacy Policy and Terms). The user must type their phone number and tap Submit.", img: "/compliance/step-3-form.png" },
            { n: 4, title: "Confirmation", desc: "On submission a success toast confirms enrollment. A welcome SMS is sent to the recipient.", img: "/compliance/step-4-confirmation.png" },
          ].map((s) => (
            <div key={s.n} className="border border-border rounded-lg overflow-hidden bg-card">
              <div className="p-4 border-b border-border flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                  {s.n}
                </div>
                <div>
                  <h3 className="font-semibold">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.desc}</p>
                </div>
              </div>
              <div className="bg-muted/30 p-4 flex items-center justify-center">
                <img
                  src={s.img}
                  alt={`Step ${s.n}: ${s.title}`}
                  loading="lazy"
                  className="max-h-[480px] w-auto rounded-md border border-border"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            </div>
          ))}
        </section>

        {/* Sample messages */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <MessageSquare className="w-5 h-5" /> Sample Messages
          </h2>

          <div className="grid gap-3">
            {[
              { label: "Welcome (sent on opt-in)", body: "[Business Name]: You're in! Thanks for joining our VIP list. Expect ~2-4 msgs/mo with offers. Msg&data rates may apply. Reply HELP for help, STOP to cancel." },
              { label: "Marketing", body: "[Business Name]: Flash deal — 20% off today only. Show this text in store. Reply STOP to cancel." },
              { label: "HELP reply", body: "[Business Name]: For help, email support@tapaway.co. Msg&data rates may apply. Msg frequency varies. Reply STOP to cancel." },
              { label: "STOP reply", body: "You have been unsubscribed from [Business Name] and will not receive any more messages. Reply START to resubscribe." },
            ].map((m) => (
              <div key={m.label} className="border border-border rounded-lg p-4 bg-card">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{m.label}</p>
                <p className="text-sm font-mono">{m.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Required disclosure */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold">CTA Disclosure (shown on every opt-in form)</h2>
          <div className="border border-primary/30 bg-primary/5 p-4 rounded-lg text-sm space-y-2">
            <p>By submitting, you agree to receive recurring marketing text messages at the number provided. Consent is not a condition of any purchase.</p>
            <p className="font-semibold">Message and data rates may apply. Message frequency varies. Reply STOP to cancel, HELP for help.</p>
            <p>See our <Link to="/privacy" className="underline">Privacy Policy</Link> and <Link to="/terms" className="underline">Terms</Link>.</p>
          </div>
        </section>

        {/* Privacy clause */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold">Privacy Policy — Mobile Data Clause</h2>
          <div className="border border-border rounded-lg p-4 bg-card text-sm">
            <p>
              "Mobile information will not be shared with third parties/affiliates for marketing/promotional
              purposes. All other categories exclude text messaging originator opt-in data and consent; this
              information will not be shared with any third parties."
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            Full policy: <Link to="/privacy" className="underline">tapaway.co/privacy</Link>
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Check className="w-5 h-5 text-primary" /> Summary for Reviewer
          </h2>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            <li>Opt-in is single-step, user-initiated, with name + phone.</li>
            <li>Disclosure with rates, frequency, STOP/HELP, and Privacy/Terms links is shown directly at point of consent.</li>
            <li>No third-party sharing of mobile opt-in data.</li>
            <li>STOP and HELP keywords are honored automatically.</li>
          </ul>
        </section>
      </main>

      <footer className="border-t border-border mt-12 py-6">
        <div className="container mx-auto px-4 max-w-4xl text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} TapAway · <Link to="/privacy" className="underline">Privacy Policy</Link> · <Link to="/terms" className="underline">Terms</Link>
        </div>
      </footer>
    </div>
  );
};

export default Compliance;
