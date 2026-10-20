import { SeasonalOffer } from "@/components/landing/SeasonalOffer";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { LandingNav } from "@/components/landing/LandingNav";
import { PricingSection } from "@/components/landing/PricingSection";
import { FAQSection } from "@/components/landing/FAQSection";
import {
  TrustStrip,
  ProductPaths,
  HubDemo,
  SetupSteps,
  CustomerQuotes,
  StorefrontFooter,
  HelpLink,
  FinalOffer,
} from "@/components/landing/StorefrontSections";
import { TrialBanner } from "@/components/TrialBanner";
import { track } from "@/lib/analytics";

export default function Index() {
  const description =
    "Custom NFC and QR cards with your reviews, menu, bookings and social links in one hub. Done-for-you setup, free US shipping, and clear subscription pricing.";
  return (
    <div className="storefront min-h-screen">
      <Helmet>
        <title>TapAway | Custom NFC Cards. More Customer Connections.</title>
        <meta name="description" content={description} />
        <link rel="canonical" href="https://tapaway.co/" />
        <meta property="og:title" content="Tap into more customers | TapAway" />
        <meta property="og:description" content={description} />
        <meta property="og:url" content="https://tapaway.co/" />
        <meta property="og:image" content="https://tapaway.co/logo-og.png" />
        <meta name="twitter:description" content={description} />
      </Helmet>
      <TrialBanner />
      <LandingNav />
      <main id="main-content">
        <section className="sf-hero">
          <div className="sf-container sf-hero-grid">
            <div className="sf-hero-copy">
              <span className="sf-eyebrow">
                Custom NFC cards + digital hubs
              </span>
              <h1>
                Tap into
                <br />
                more customers.
              </h1>
              <p>
                Put your reviews, menu, bookings and socials one tap away.
                Custom cards. A beautiful hub. All set up for you.
              </p>
              <div className="sf-hero-actions">
                <a
                  className="sf-button"
                  href="#pricing"
                  onClick={() =>
                    track("landing_cta_clicked", {
                      hubKind: "site",
                      props: { placement: "hero_business" },
                    })
                  }
                >
                  Get TapAway for business <ArrowRight />
                </a>
                <Link className="sf-button secondary" to="/personal">
                  Make it personal
                </Link>
              </div>
              <p className="sf-hero-small">
                4 or 15 custom cards · Free US shipping · Done-for-you setup
              </p>
              <a className="sf-text-link mt-5 text-xs" href="#examples">
                See what happens when you tap <ArrowRight className="h-3 w-3" />
              </a>
            </div>
            <div className="sf-hero-media">
              <img
                src="/done-for-you-mockup.png"
                alt="TapAway custom printed card beside examples of branded mobile hubs"
                width="1254"
                height="1254"
                fetchPriority="high"
              />
              <span className="sf-image-caption">
                Custom cards. Your links. One tap.
              </span>
            </div>
          </div>
        </section>
        <TrustStrip />
        <ProductPaths />
        <SeasonalOffer />
        <HubDemo />
        <SetupSteps />
        <PricingSection />
        <CustomerQuotes />
        <FAQSection />
        <FinalOffer />
      </main>
      <StorefrontFooter />
      <HelpLink />
    </div>
  );
}
