import { STOREFRONT_FAQS } from "@/lib/storefrontFaqs";
import "@/components/landing/storefront.css";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { MessageCircleQuestion, ArrowRight, MessageCircle, Nfc } from "lucide-react";
import { Button } from "@/components/ui/button";

const faqs = STOREFRONT_FAQS.map(({ question, answer }) => ({ q: question, a: answer }));

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
    <div className="storefront min-h-screen bg-background">
      <Helmet>
        <title>Frequently Asked Questions | TapAway</title>
        <meta
          name="description"
          content="TapAway FAQ: how NFC tap cards work, pricing and billing, phone compatibility, setup, shipping and cancellation. Answered plainly."
        />
        <meta property="og:title" content="Frequently Asked Questions | TapAway" />
        <meta
          property="og:description"
          content="TapAway FAQ: how NFC tap cards work, pricing and billing, setup, shipping and cancellation. Answered plainly."
        />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://tapaway.co/faq" />
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
              <p className="mt-2 text-muted-foreground">Answers before and after your order.</p>
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
            Ask our team. You don't need an account to get help choosing your cards.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/#pricing">
                Choose my cards <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
            <a
              href="/support#question"
              className="inline-flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary"
            >
              <MessageCircle className="w-4 h-4" /> Ask our team
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
