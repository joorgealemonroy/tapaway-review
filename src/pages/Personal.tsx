import { Helmet } from "react-helmet-async";
import { StorefrontLink as Link } from "@/lib/storefrontNavigation";
import { ArrowRight, Check, QrCode, Wifi } from "lucide-react";
import { LandingNav } from "@/components/landing/LandingNav";
import { FAQSection } from "@/components/landing/FAQSection";
import {
  StorefrontFooter,
  HelpLink,
} from "@/components/landing/StorefrontSections";
import { PersonalCardGallery } from "@/components/landing/PersonalCardGallery";
import { RealHubDemo } from "@/components/landing/RealHubDemo";
import { SeasonalOffer, HalloweenCountdown } from "@/components/landing/SeasonalOffer";
import { DESIGN_TEMPLATES } from "@/lib/cardDesign";
export default function Personal() {
  return (
    <div className="storefront min-h-screen">
      <Helmet>
        <title>Two Custom NFC Cards for $39 | TapAway Personal</title>
        <meta
          name="description"
          content="Two fully custom NFC and QR cards for $39 once, with free US shipping. Design both sides. Use your own links or add a personal hub for $5/month."
        />
        <link rel="canonical" href="https://tapaway.co/personal" />
        <meta
          property="og:title"
          content="Two cards. Entirely you. | TapAway"
        />
        <meta property="og:url" content="https://tapaway.co/personal" />
      </Helmet>
      <LandingNav />
      <SeasonalOffer />
      <main id="main-content">
        <section className="sf-hero">
          <div className="sf-container sf-hero-grid">
            <div className="sf-hero-copy">
              <p className="sf-eyebrow">TapAway personal · $39 for two</p>
              <h1>
                A little card.
                <br />A lot of you.
              </h1>
              <p>
                Your work. Your socials. Your next great connection. Design two
                cards your way and share a link with a tap or a scan.
              </p>
              <div className="sf-hero-actions">
                <Link className="sf-button" to="/personal/design">
                  Design my two cards · $39 <ArrowRight />
                </Link>
                <a className="sf-text-link" href="#examples">
                  See a real personal hub
                </a>
              </div>
              <p className="sf-hero-small">
                One-time purchase · Two NFC + QR cards · Free US shipping
              </p>
              <p className="sf-price-note mt-3">
                Use your own links with no subscription. A TapAway hub with
                analytics is optional at $5/month.
              </p>
            </div>
            <PersonalCardGallery />
          </div>
        </section>
        <section
          className="sf-personal-explainer sf-container"
          aria-label="How your cards work"
        >
          <div>
            <Wifi />
            <h2>Tap it.</h2>
            <p>
              Hold your card near a compatible phone's NFC reader. Open the
              notification.
            </p>
          </div>
          <div>
            <QrCode />
            <h2>Or scan it.</h2>
            <p>
              Use the phone's camera to scan the QR code. It opens the same
              link.
            </p>
          </div>
          <div>
            <ArrowRight />
            <h2>Make a connection.</h2>
            <p>
              Share a website, portfolio, social profile, or your own TapAway
              hub. No app needed.
            </p>
          </div>
        </section>
        <section className="sf-section sf-container" id="pricing">
          <div className="sf-personal-offer">
            <div>
              <p className="sf-eyebrow">Two cards. Yours to keep.</p>
              <h2 className="sf-title">
                Two cards.
                <br />
                One simple purchase.
              </h2>
              <p className="sf-copy mt-4">
                One for networking. One for your personal world. Or make them a
                matching pair. You choose what each card opens.
              </p>
              <ul className="sf-checklist">
                {[
                  "Two custom NFC + QR cards",
                  "Your design on both sides",
                  "Templates or a completely blank canvas",
                  "Free standard US shipping",
                ].map((t) => (
                  <li key={t}>
                    <Check />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="sf-personal-price">
              <HalloweenCountdown />
              <p>
                <strong>$39</strong> once
              </p>
              <Link className="sf-button" to="/personal/design">
                Make my cards <ArrowRight />
              </Link>
              <p className="sf-price-note">
                Two cards + free US shipping. No required subscription.
              </p>
              <div>
                <h3>Want all your links in one place?</h3>
                <p>
                  Add a TapAway hub with analytics for $5/month at checkout.
                  Update its links without reprinting your cards. Optional, and
                  you can cancel anytime.
                </p>
              </div>
            </div>
          </div>
        </section>
        <section className="sf-section sf-personal-templates">
          <div className="sf-container">
            <p className="sf-eyebrow">Start with a vibe. Make it yours.</p>
            <h2 className="sf-title">
              Your name. Your images.
              <br />
              Your kind of card.
            </h2>
            <div className="sf-template-grid">
              {DESIGN_TEMPLATES.filter(t=>["network","personal","halloween","blank"].includes(t.id)).map((t) => (
                <Link key={t.id} to={`/personal/design?template=${t.id}`}>
                  <div style={{ background: t.color, color: t.ink }}>
                    <small>{t.category}</small>
                    <strong>{t.title || "Your idea goes here."}</strong>
                    <span>TapAway</span>
                  </div>
                  <p>
                    {t.name} <ArrowRight className="h-4 w-4" />
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
        <RealHubDemo personal />
        <FAQSection />
      </main>
      <StorefrontFooter />
      <HelpLink />
    </div>
  );
}
