import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Check,
  Headphones,
  Instagram,
  Link2,
  MapPin,
  PackageCheck,
  Star,
  Truck,
  Utensils,
  Wifi,
} from "lucide-react";
import { Brand } from "./LandingNav";
import { openConsentSettings } from "@/lib/consent";
import { SupportChat } from "./SupportChat";
import victor from "@/assets/victor-ramirez.jpg.asset.json";
import sonia from "@/assets/sonia-berumen.jpg.asset.json";
import manuel from "@/assets/manuel-monroy.jpg.asset.json";
export { RealHubDemo as HubDemo } from "./RealHubDemo";

export function MiniCard({
  name,
  label = "TapAway",
  tone = "",
}: {
  name: string;
  label?: string;
  tone?: string;
}) {
  return (
    <div className={`sf-mini-card ${tone}`}>
      <Wifi aria-hidden="true" />
      <small>{label}</small>
      <strong>{name}</strong>
    </div>
  );
}

export function TrustStrip() {
  return (
    <div className="sf-trust">
      <div className="sf-container sf-trust-inner">
        {[
          [PackageCheck, "We set it up", "Your cards. Your hub. Done."],
          [Truck, "Free US shipping", "Custom cards, delivered"],
          [Wifi, "Tap or scan", "No app needed to open your hub"],
          [Headphones, "A real team", "Help from setup onward"],
        ].map(([Icon, title, desc]) => {
          const I = Icon as typeof Wifi;
          return (
            <div className="sf-trust-item" key={String(title)}>
              <I aria-hidden="true" />
              <div>
                <strong>{String(title)}</strong>
                <span>{String(desc)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ProductPaths() {
  return (
    <section className="sf-section sf-container" id="business">
      <p className="sf-eyebrow">One little card. A lot of possibilities.</p>
      <h2 className="sf-title">
        Made for your business.
        <br />
        Or just for you.
      </h2>
      <div className="sf-products">
        <article className="sf-product business">
          <p className="sf-eyebrow">TapAway for business</p>
          <h3>
            We build it.
            <br />
            You grow it.
          </h3>
          <p>
            Your reviews, menu, bookings and socials in one hub. Custom cards
            and the setup, handled for you.
          </p>
          <a className="sf-button" href="#pricing">
            View business plans <ArrowRight />
          </a>
          <div className="sf-product-photo business-photo">
            <img
              src="/product-photos/business-cards-in-hands.webp"
              alt="Hands holding custom TapAway cards for Fish Hook Seafood and Las Islas"
              width="1024"
              height="1536"
              loading="lazy"
              decoding="async"
            />
          </div>
        </article>
        <article className="sf-product personal">
          <p className="sf-eyebrow">TapAway personal</p>
          <h3>
            A little card.
            <br />A lot of you.
          </h3>
          <p>
            Two custom cards for your work, socials, or whatever you love. $39
            once. Free US shipping. Tap or scan to open your link.
          </p>
          <Link className="sf-button" to="/personal">
            Get two cards · $39 <ArrowRight />
          </Link>
          <div className="sf-product-photo personal-photo">
            <img
              src="/product-photos/personal-networking-and-meme-cards.webp"
              alt="Custom TapAway examples: Jorge Monroy networking card and a John Pork meme card"
              width="1024"
              height="1536"
              loading="lazy"
              decoding="async"
            />
          </div>
        </article>
      </div>
      <div className="sf-benefits">
        {[
          [Star, "Get more reviews", "Make honest feedback easy to leave."],
          [
            Utensils,
            "Share your menu",
            "Put your menu or services a tap away.",
          ],
          [
            Instagram,
            "Grow your socials",
            "Help customers find and follow you.",
          ],
          [MapPin, "Get found", "Share directions to your business."],
          [Link2, "Share any link", "Bookings, a portfolio, your website."],
          [
            BarChart3,
            "See what gets tapped",
            "Understand visits and link activity.",
          ],
        ].map(([Icon, title, copy]) => {
          const I = Icon as typeof Star;
          return (
            <div key={String(title)}>
              <I aria-hidden="true" />
              <h3>{String(title)}</h3>
              <p>{String(copy)}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function SetupSteps() {
  return (
    <section className="sf-section sf-container" id="how-it-works">
      <p className="sf-eyebrow">Less work for you</p>
      <h2 className="sf-title">From checkout to your counter.</h2>
      <div className="sf-steps">
        {[
          [
            "Choose your cards",
            "Pick 4 or 15 cards and monthly or yearly billing. Complete secure checkout without creating an account first.",
          ],
          [
            "Tell us a little about you",
            "Confirm your business or brand, add your logo if you have one, and check your shipping address.",
          ],
          [
            "We get you ready to tap",
            "We build your hub and prepare your custom cards. Manage your links, see activity and get help in your dashboard.",
          ],
        ].map(([title, copy], i) => (
          <article key={title}>
            <span className="sf-step-number">0{i + 1}</span>
            <h3>{title}</h3>
            <p>{copy}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function CustomerQuotes() {
  // Existing approved customer copy from HeroSection, without unverified uplift statistics.
  const quotes = [
    [
      "Victor Ramirez",
      victor.url,
      "TapAway makes it easy for customers to find everything about our business in one place. Simple, professional, and convenient.",
    ],
    [
      "Sonia Berumen",
      sonia.url,
      "My favorite part is that they handle the setup. As a business owner, having one less thing to figure out means a lot.",
    ],
    [
      "Manuel Monroy",
      manuel.url,
      "TapAway makes it easy to stay connected with our customers. We can send a quick text with a special or reminder and give them a reason to come back through the door.",
    ],
  ];
  return (
    <section className="sf-section sf-proof" id="reviews">
      <div className="sf-container">
        <p className="sf-eyebrow">From the people using it</p>
        <h2 className="sf-title">
          Less to figure out.
          <br />
          More time for your business.
        </h2>
        <div className="sf-quotes">
          {quotes.map(([name, photo, quote]) => (
            <article className="sf-quote" key={name}>
              <blockquote>“{quote}”</blockquote>
              <footer>
                <img
                  className="sf-customer-photo"
                  src={photo}
                  alt={name}
                  loading="lazy"
                  width="56"
                  height="56"
                />
                <div>
                  <strong>{name}</strong>
                  <small>TapAway customer</small>
                </div>
              </footer>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function StorefrontFooter() {
  return (
    <footer className="sf-footer">
      <div className="sf-container">
        <div className="sf-footer-top">
          <div>
            <Brand />
            <p className="mt-3 text-xs text-[#72796c]">
              Your world, one tap away.
            </p>
          </div>
          <div className="sf-footer-links">
            <a href="/#pricing">Business plans</a>
            <Link to="/personal">Personal</Link>
            <Link to="/examples">Examples</Link>
            <Link to="/support">Get help</Link>
            <a
              href="https://www.instagram.com/tapawayco"
              target="_blank"
              rel="noopener noreferrer"
            >
              Instagram
            </a>
          </div>
        </div>
        <div className="sf-footer-bottom">
          <p>© {new Date().getFullYear()} TapAway</p>
          <div className="sf-footer-legal">
            <Link to="/terms">Terms</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/refund">Refund policy</Link>
            <button onClick={openConsentSettings}>Cookie settings</button>
          </div>
        </div>
      </div>
    </footer>
  );
}
export function HelpLink() {
  return <SupportChat />;
}

export function FinalOffer() {
  return (
    <div className="sf-container">
      <section className="sf-final">
        <p className="sf-eyebrow">Let's make it easy</p>
        <h2 className="sf-title">
          Your next customer connection
          <br />
          starts with a tap.
        </h2>
        <p className="sf-copy">
          You bring the business. We handle the cards and hub. Choose your plan
          and we'll take it from there.
        </p>
        <a className="sf-button" href="#pricing">
          Find my plan <ArrowRight />
        </a>
        <Link className="sf-text-link ml-6 mt-4" to="/support#question">
          Ask us a question
        </Link>
      </section>
    </div>
  );
}
