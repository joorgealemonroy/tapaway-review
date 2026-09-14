import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { MessageCircleQuestion, ArrowRight, Phone, Nfc } from "lucide-react";
import { Button } from "@/components/ui/button";

const faqs = [
  {
    q: "What is TapAway?",
    a: "TapAway gives your business a tap card that puts your whole business in your customer's pocket. One tap opens a custom mobile hub with your Instagram, menu, Google reviews, booking, directions, and contact info \u2014 everything in one place. You don't build anything. We do it all for you.",
  },
  {
    q: "How do the NFC tap cards work?",
    a: "Your customer holds their phone near the card and your hub opens instantly \u2014 no app, no scanning, no typing a web address. It uses NFC, the same tap technology as contactless payments. It's the fastest way to get a customer from standing at your counter to looking at your whole business on their phone.",
  },
  {
    q: "Do the cards work with iPhones?",
    a: "Yes. iPhone 7 and newer all support NFC tap \u2014 your customers just hold their phone near the card and it works. No app to download, nothing to set up on their end.",
  },
  {
    q: "Do they work with Android?",
    a: "Yes. Most Android phones have NFC built in, and the tap works the same way \u2014 hold the phone near the card and the hub opens. No app needed.",
  },
  {
    q: "What's the difference between TapAway's cards and a QR code?",
    a: "Speed and completion. A tap takes one second \u2014 your customer holds their phone near the card and they're in. A QR code means opening the camera, lining it up, and hoping it scans. In a busy moment, that friction is the difference between a customer who sees your whole business and one who gives up.",
  },
  {
    q: "How much does TapAway cost?",
    a: "TapAway Solo is $20/month for single-location businesses, and TapAway Pro is $39/month for businesses that need more. Yearly plans save you two months: Solo is $199/year, Pro is $390/year. Every plan starts with a 14-day free trial.",
  },
  {
    q: "What's included in my subscription?",
    a: "Everything, honestly. We build your custom hub for you, print and ship your tap cards, track every tap so you can see it's working, and handle any changes or questions along the way. You run your business \u2014 we handle the TapAway side.",
  },
  {
    q: "How does the 14-day free trial work?",
    a: "You get full access for 14 days \u2014 your hub built, your cards shipped, everything live. We ask for a card on file at signup so we can verify it, but if you cancel before day 14, you're never billed. No charges, no games.",
  },
  {
    q: "What is the $1 verification hold?",
    a: "When you sign up, we place a temporary $1 authorization on your card to make sure it's valid. It's immediately voided \u2014 it drops off your statement on its own and you're never actually charged. It's just a check, not a fee.",
  },
  {
    q: 'What does "done-for-you setup" actually mean?',
    a: "It means you lift no finger. Tell us about your business, send us your links and info, and we build your hub, print your cards, and ship them to you. When the box arrives, you're live. If something needs to change later \u2014 new menu, new hours, new Instagram \u2014 just tell us and we'll update it.",
  },
  {
    q: "How do my customers leave Google reviews with TapAway?",
    a: "They tap your card, your hub opens, and they hit the review button that takes them straight to your Google review page. That one-tap path is why it works \u2014 Victor Ramirez picked up 44 new reviews in 30 days, Sonia Berumen added 33, and Amelia Zavala added 20. The connection is the whole product; more reviews are one of the biggest things that flow through it.",
  },
  {
    q: "What happens after the trial ends?",
    a: "Your subscription starts automatically and your billing begins \u2014 that's it. There are no contracts, and you can cancel anytime. If TapAway isn't earning its keep, walk away. We'd rather earn the next month than lock you into this one.",
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
          content="TapAway FAQ: how NFC tap cards work, pricing ($20-$39/mo), the 14-day free trial, iPhone & Android compatibility, and canceling anytime. Answered plainly."
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
            Call or text us at (909) 285-6321 — a real person answers.
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
