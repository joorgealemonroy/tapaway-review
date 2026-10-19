import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { LandingNav } from "@/components/landing/LandingNav";
import { PricingSection } from "@/components/landing/PricingSection";
import { FAQSection } from "@/components/landing/FAQSection";
import {
  MiniCard,
  TrustStrip,
  StorefrontFooter,
  HelpLink,
} from "@/components/landing/StorefrontSections";

export default function Personal() {
  return (
    <div className="storefront min-h-screen">
      <Helmet>
        <title>Personal NFC Cards & Your Own Digital Hub | TapAway</title>
        <meta
          name="description"
          content="Custom NFC cards for your personal brand, portfolio, socials or side project. Start with 4 cards, a digital hub and done-for-you setup."
        />
        <link rel="canonical" href="https://tapaway.co/personal" />
        <meta property="og:title" content="Make it personal | TapAway" />
        <meta property="og:url" content="https://tapaway.co/personal" />
      </Helmet>
      <LandingNav />
      <main id="main-content">
        <section className="sf-hero">
          <div className="sf-container sf-hero-grid">
            <div className="sf-hero-copy">
              <p className="sf-eyebrow">TapAway personal</p>
              <h1>
                Your links.
                <br />
                Your look.
                <br />
                Your TapAway.
              </h1>
              <p>
                A small card that says a lot about you. Share your socials,
                portfolio, booking page or side project with one tap.
              </p>
              <div className="sf-hero-actions">
                <a className="sf-button" href="#pricing">
                  Get my personal cards <ArrowRight />
                </a>
                <Link
                  className="sf-text-link"
                  to="/support?topic=personal#question"
                >
                  Have a design in mind?
                </Link>
              </div>
              <p className="sf-hero-small">
                4 custom cards + a personal hub. Subscription plan. Setup
                included.
              </p>
            </div>
            <div
              className="sf-personal-stage"
              aria-label="Illustrative personal card designs"
            >
              <MiniCard name="Good energy only." tone="pink" />
              <MiniCard name="Nice to meet you." tone="yellow" />
              <MiniCard name="Your name. Your thing." tone="light" />
            </div>
          </div>
        </section>
        <TrustStrip />
        <section className="sf-section sf-container">
          <p className="sf-eyebrow">All the things that make you, you</p>
          <h2 className="sf-title">One place for whatever you're into.</h2>
          <div className="sf-steps">
            {[
              [
                "Your personal brand",
                "Bring your socials, portfolio and contact links together in a hub you can update.",
              ],
              [
                "Your own card design",
                "Tell us your idea during setup or send it to our team. We prepare the artwork for your custom cards.",
              ],
              [
                "Your next connection",
                "Tap a compatible phone or scan the QR code. Your visitor can open your links without a TapAway app.",
              ],
            ].map(([title, body]) => (
              <article key={title}>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>
        <PricingSection audience="personal" />
        <FAQSection />
      </main>
      <StorefrontFooter />
      <HelpLink />
    </div>
  );
}
