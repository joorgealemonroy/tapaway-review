import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Building2, ArrowRight, Phone, Nfc, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
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
  sameAs: [],
};

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
  sameAs: [],
};

const plans = [
  { name: "TapAway Solo", price: "$20/month", note: "For single-location businesses" },
  { name: "TapAway Pro", price: "$39/month", note: "For businesses that need more" },
  { name: "Solo Yearly", price: "$199/year", note: "Two months free" },
  { name: "Pro Yearly", price: "$390/year", note: "Two months free" },
];

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>About TapAway | TapAway</title>
        <meta
          name="description"
          content="TapAway is a done-for-you NFC tap card platform for businesses, founded by Jorge Monroy in Fontana, CA. One tap connects customers to your whole business."
        />
        <meta property="og:title" content="About TapAway | TapAway" />
        <meta
          property="og:description"
          content="TapAway is a done-for-you NFC tap card platform for businesses, founded by Jorge Monroy in Fontana, CA."
        />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(organizationSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(localBusinessSchema)}</script>
      </Helmet>

      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-10 max-w-4xl">
          <Link to="/" className="inline-flex items-center gap-2 mb-6 text-sm text-muted-foreground hover:text-foreground">
            <Nfc className="w-4 h-4" /> TapAway
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">About TapAway</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-4xl space-y-12">
        <section className="space-y-3">
          <h2 className="text-2xl font-bold text-foreground">Who we are</h2>
          <p className="text-muted-foreground leading-relaxed">
            TapAway is a done-for-you digital platform for businesses. We create physical NFC and QR
            tap cards — your customer taps one with their phone, and your entire business opens right in
            their pocket: your Instagram, your Google reviews, your menu, your booking link, directions, and
            your contact info, all in one custom mobile hub.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            No app to download. No QR code fumbling. One tap, and you're connected.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Everything is built for you. You don't design anything, you don't write any code, and you don't
            manage anything technical. Your hub is custom-made for your business, your cards arrive ready to
            use, and your connection to every customer is live from day one.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold text-foreground">The founder</h2>
          <p className="text-muted-foreground leading-relaxed">
            TapAway was founded by Jorge Monroy in Fontana, California. He's a solo operator who builds the
            hubs, prints the cards, and handles the whole operation himself — backed by real businesses in
            his own community that use TapAway every day.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold text-foreground">What TapAway does</h2>
          <p className="text-muted-foreground leading-relaxed">
            Most businesses run on repeat customers and word of mouth — but too many customer relationships
            end the moment someone walks out the door. TapAway changes that.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            A TapAway card sits at your counter, your register, your station, or on your keychain. When a
            customer taps it, they land on a mobile hub built just for your business: follow you on
            Instagram, leave a Google review, browse your menu or services, book their next visit, get
            directions back, or reach out — all from one tap. It's the connection between your business and
            your customer, in their pocket forever.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Owners use TapAway to stay top of mind, turn first-time visitors into regulars, and make it
            effortless for happy customers to leave a review.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold text-foreground">Who it's for</h2>
          <p className="text-muted-foreground leading-relaxed">
            TapAway is built for the businesses that run on relationships: restaurants, barbershops,
            salons, cafés, and auto shops. If your customers come in, sit down, and talk to you — TapAway
            keeps that conversation going after they leave.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Pricing</h2>
          <p className="text-muted-foreground leading-relaxed">
            Simple, month to month, cancel anytime. Every plan starts with a 14-day free trial. A card on
            file is required — we place a $1 hold to verify it, and the hold is voided immediately. Cancel
            anytime; when you cancel, billing stops.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {plans.map((plan) => (
              <div key={plan.name} className="border border-border rounded-lg p-5 bg-card">
                <p className="font-bold text-foreground">{plan.name}</p>
                <p className="text-2xl font-black text-primary mt-1">{plan.price}</p>
                <p className="text-sm text-muted-foreground mt-1">{plan.note}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold text-foreground">Contact</h2>
          <div className="border border-border rounded-lg p-5 bg-card space-y-2 text-sm">
            <p className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4 text-primary shrink-0" /> 16393 E Foothill Blvd, Fontana, CA 92335
            </p>
            <p className="flex items-center gap-2 text-muted-foreground">
              <Phone className="w-4 h-4 text-primary shrink-0" />{" "}
              <a href="tel:+19092856321" className="hover:text-foreground font-semibold">
                (909) 285-6321
              </a>
            </p>
            <p className="text-muted-foreground">
              Website:{" "}
              <Link to="/" className="underline hover:text-foreground">
                tapaway.co
              </Link>
            </p>
          </div>
        </section>

        <section className="border border-primary/30 bg-primary/5 rounded-xl p-8 text-center space-y-4">
          <h2 className="text-2xl font-black text-foreground">Try TapAway free for 14 days</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Your hub built, your cards shipped, everything live. Cancel anytime.
          </p>
          <Button asChild size="lg">
            <Link to="/start">
              Start your 14-day free trial <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
        </section>
      </main>

      <footer className="border-t border-border mt-12 py-6">
        <div className="container mx-auto px-4 max-w-4xl text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} TapAway · <Link to="/privacy" className="underline">Privacy Policy</Link> ·{" "}
          <Link to="/terms" className="underline">Terms</Link> · <Link to="/faq" className="underline">FAQ</Link>
        </div>
      </footer>
    </div>
  );
};

export default About;
