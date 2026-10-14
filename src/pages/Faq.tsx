import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { MessageCircleQuestion, ArrowRight, Phone, Nfc } from "lucide-react";
import { Button } from "@/components/ui/button";

const faqs = [
  {
    q: "What is TapAway?",
    a: "TapAway gives your business a tap card that puts your whole business in your customer's pocket. One tap opens a custom mobile hub with your Instagram, menu, Google reviews, booking, directions, and contact info, everything in one place. You don't build anything. We do it all for you.",
  },
  {
    q: "How do the NFC tap cards work?",
    a: "We design your cards and set up your hub. Show customers how to tap with a compatible phone or scan the QR code to open your business links.",
  },
  {
    q: "Do the cards work with iPhones?",
    a: "iPhone XS, XR, and newer generally read NFC links without a separate app when the phone is awake. iPhone 7, 8, and X can require an NFC reader or extra steps. Settings and cases can affect tapping. Every card includes a QR fallback.",
  },
  {
    q: "Do they work with Android?",
    a: "NFC-enabled Android phones can open the hub when NFC is enabled and the phone is unlocked. Device support varies. Use the QR code if tapping is unavailable.",
  },
  {
    q: "What's the difference between TapAway's cards and a QR code?",
    a: "Your card includes both. NFC opens your hub on compatible phones; the QR code offers a camera-based alternative. Choose whichever works for your customer.",
  },
  {
    q: "How much does TapAway cost?",
    a: "Choose 4 cards or 15 cards, billed monthly or yearly. See the homepage pricing section for current verified prices and availability. The full yearly total, not the monthly equivalent, is billed after your 14-day trial.",
  },
  {
    q: "What's included in my subscription?",
    a: "Custom printed cards, a custom business hub, done-for-you setup, and dashboard access. Eligible card requests follow your plan allowance, not an unlimited replacement promise.",
  },
  {
    q: "How does the 14-day free trial work?",
    a: "After your 14-day trial, the selected monthly or full annual subscription amount is billed. See the pricing section for current available prices. Renews at your chosen interval until canceled. Cancel before your trial ends to avoid the first subscription charge.",
  },
  {
    q: "What is the $1 verification hold?",
    a: "Card verification uses a temporary $1 authorization with manual capture. We request cancellation without capturing it. Your bank controls when the pending authorization disappears.",
  },
  {
    q: 'What does "done-for-you setup" actually mean?',
    a: "It means you lift no finger. Tell us about your business, send us your links and info, and we build your hub, print your cards, and ship them to you. When the box arrives, you're live. If something needs to change later, new menu, new hours, new Instagram, just tell us and we'll update it.",
  },
  {
    q: "How do my customers leave Google reviews with TapAway?",
    a: "Customers open your hub and choose the Google review link. Invite honest feedback from customers without incentives or preferred ratings. Review activity and outcomes vary.",
  },
  {
    q: "What happens after the trial ends?",
    a: "After your 14-day trial, the selected monthly or full annual subscription amount is billed. See the pricing section for current available prices. Renews at your chosen interval until canceled. Cancel before your trial ends to avoid the first subscription charge.",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "@id": "https://tapaway.co/faq",
  url: "https://tapaway.co/faq",
  name: "TapAway Frequently Asked Questions",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "TapAway",
  url: "https://tapaway.co",
  telephone: "+1-909-285-6321",
};

const Faq = () => {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Frequently Asked Questions | TapAway</title>
        <meta
          name="description"
          content="TapAway FAQ: how NFC tap cards work, current pricing, the 14-day free trial, iPhone & Android compatibility, and canceling anytime. Answered plainly."
        />
        <meta property="og:title" content="Frequently Asked Questions | TapAway" />
        <meta
          property="og:description"
          content="TapAway FAQ: how NFC tap cards work, pricing, the 14-day free trial, and canceling anytime. Answered plainly."
        />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(organizationSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-10 max-w-4xl">
          <Link to="/" className="inline-flex items-center gap-2 mb-6 text-sm text-muted-foreground hover:text-foreground">
            <Nfc className="w-4 h-4" /> TapAway
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <MessageCircleQuestion className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">
                Frequently Asked Questions
              </h1>
              <p className="mt-2 text-muted-foreground">Straight answers, no fine print.</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-4xl space-y-4">
        {faqs.map((faq) => (
          <section key={faq.q} className="border border-border rounded-lg p-5 md:p-6 bg-card">
            <h2 className="text-lg font-bold text-foreground mb-2">{faq.q}</h2>
            <p className="text-muted-foreground leading-relaxed">{faq.a}</p>
          </section>
        ))}

        <section className="border border-primary/30 bg-primary/5 rounded-xl p-8 text-center space-y-4 mt-8">
          <h2 className="text-2xl font-black text-foreground">Still have a question?</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Call or text us at (909) 285-6321. A real person answers.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/start">
                Start your 14-day free trial <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
            <a
              href="tel:+19092856321"
              className="inline-flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary"
            >
              <Phone className="w-4 h-4" /> (909) 285-6321
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-border mt-12 py-6">
        <div className="container mx-auto px-4 max-w-4xl text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} TapAway · 16393 E Foothill Blvd, Fontana, CA 92335 ·{" "}
          <Link to="/privacy" className="underline">Privacy Policy</Link> ·{" "}
          <Link to="/terms" className="underline">Terms</Link>
        </div>
      </footer>
    </div>
  );
};

export default Faq;
