import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowRight, Phone, Nfc } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { VerticalData } from "./verticalData";

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "TapAway",
  url: "https://tapaway.co",
  telephone: "+1-909-285-6321",
  address: {
    "@type": "PostalAddress",
    streetAddress: "16393 E Foothill Blvd",
    addressLocality: "Fontana",
    addressRegion: "CA",
    postalCode: "92335",
    addressCountry: "US",
  },
  founder: { "@type": "Person", name: "Jorge Monroy" },
};

const VerticalPage = ({ data }: { data: VerticalData }) => {
  const Icon = data.icon;
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{data.metaTitle}</title>
        <meta name="description" content={data.metaDescription} />
        <meta property="og:title" content={data.metaTitle} />
        <meta property="og:description" content={data.metaDescription} />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(organizationSchema)}</script>
      </Helmet>

      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-10 max-w-4xl">
          <Link to="/" className="inline-flex items-center gap-2 mb-6 text-sm text-muted-foreground hover:text-foreground">
            <Nfc className="w-4 h-4" /> TapAway
          </Link>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <Icon className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground leading-tight">
              {data.h1}
            </h1>
          </div>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">{data.intro}</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-4xl space-y-12">
        {data.sections.map((section) => (
          <section key={section.heading} className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">{section.heading}</h2>
            {section.body.map((para, i) => (
              <p key={i} className="text-muted-foreground leading-relaxed">
                {para}
              </p>
            ))}
          </section>
        ))}

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Common questions</h2>
          <div className="grid gap-3">
            {data.faqs.map((faq) => (
              <div key={faq.q} className="border border-border rounded-lg p-5 bg-card">
                <h3 className="font-bold text-foreground mb-2">{faq.q}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border border-primary/30 bg-primary/5 rounded-xl p-8 text-center space-y-4">
          <h2 className="text-2xl font-black text-foreground">Try it free for 14 days</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">{data.ctaBody}</p>
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
          <Link to="/terms" className="underline">Terms</Link> ·{" "}
          <Link to="/faq" className="underline">FAQ</Link>
        </div>
      </footer>
    </div>
  );
};

export default VerticalPage;
