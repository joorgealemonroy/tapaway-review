import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  ChevronRight,
  Headphones,
  Instagram,
  Link2,
  MapPin,
  MessageCircle,
  PackageCheck,
  Star,
  Truck,
  Utensils,
  Wifi,
} from "lucide-react";
import { Brand } from "./LandingNav";
import { openConsentSettings } from "@/lib/consent";
import { track } from "@/lib/analytics";

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
          <div
            className="sf-product-art"
            aria-label="Illustrative custom card designs"
          >
            <MiniCard name="THE LOCAL" label="Coffee & good company" />
            <MiniCard name="Your brand. Your card." tone="light" />
          </div>
        </article>
        <article className="sf-product personal">
          <p className="sf-eyebrow">TapAway personal</p>
          <h3>
            A little card.
            <br />A lot of you.
          </h3>
          <p>
            Your personal brand, side project or favorite links. A custom card
            with a hub that feels like you.
          </p>
          <Link className="sf-button" to="/personal">
            Explore personal <ArrowRight />
          </Link>
          <div
            className="sf-product-art"
            aria-label="Illustrative personal card designs"
          >
            <MiniCard name="Good energy only." tone="pink" />
            <MiniCard name="Nice to meet you." tone="yellow" />
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

const examples = [
  {
    category: "Restaurant",
    name: "The Local",
    initials: "the\nlocal",
    subtitle: "Good food. Better company.",
    action: "View our menu",
    icon: Utensils,
    detail: "Your menu, right there.",
    copy: "Open your existing menu link, so guests can browse without searching or downloading an app.",
  },
  {
    category: "Barber",
    name: "Studio North",
    initials: "SN",
    subtitle: "Good cuts. Good conversation.",
    action: "Book your next cut",
    icon: CalendarDays,
    detail: "Make the next visit easy.",
    copy: "Send clients to the booking tool you already use. Keep your portfolio and socials beside it.",
  },
  {
    category: "Creator",
    name: "Alex Rivera",
    initials: "AR",
    subtitle: "Creative work. Real connections.",
    action: "See my work",
    icon: Link2,
    detail: "Your work, in their hands.",
    copy: "Share a portfolio, shop or project with a tap. Update your hub links as your work grows.",
  },
];
const actionDetails = [
  [
    "Make feedback easy.",
    "A review button opens your review destination. Invite honest feedback from all customers; TapAway does not guarantee ratings or review counts.",
  ],
  ["", ""],
  [
    "Keep the connection going.",
    "Open your social profile so visitors can follow you, browse your work and stay in touch.",
  ],
  [
    "One hub. The links you choose.",
    "Bring your website and other useful destinations together. You can change links in your dashboard without reprinting your cards.",
  ],
];
export function HubDemo() {
  const [example, setExample] = useState(0);
  const [action, setAction] = useState(1);
  const current = examples[example];
  const options = [
    [Star, "Leave a Google review"],
    [current.icon, current.action],
    [Instagram, "Follow on Instagram"],
    [Link2, "Visit website"],
  ] as const;
  const detail =
    action === 1 ? [current.detail, current.copy] : actionDetails[action];
  return (
    <section
      className="sf-section sf-demo"
      id="examples"
      aria-labelledby="demo-title"
    >
      <div className="sf-container sf-demo-grid">
        <div>
          <p className="sf-eyebrow">Try the experience</p>
          <h2 id="demo-title" className="sf-title">
            One tap opens
            <br />
            your whole world.
          </h2>
          <p className="sf-copy mt-5">
            Pick an example. Tap a button. See how simple the next step feels
            for your customer.
          </p>
          <div className="sf-demo-options" aria-label="Choose a sample hub">
            {examples.map((e, i) => (
              <button
                key={e.category}
                aria-pressed={example === i}
                onClick={() => {
                  setExample(i);
                  setAction(1);
                  track("cta_click", {
                    hubKind: "site",
                    props: { placement: "hub_demo", example: e.category },
                  });
                }}
              >
                {e.category}
              </button>
            ))}
          </div>
          <div className="sf-demo-note" aria-live="polite">
            <h3>{detail[0]}</h3>
            <p>{detail[1]}</p>
          </div>
          <Link to="/examples" className="sf-text-link">
            Explore customer hubs <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div>
          <div className="sf-phone">
            <div className="sf-phone-notch" />
            <div className="sf-phone-avatar whitespace-pre-line">
              {current.initials}
            </div>
            <h3>{current.name}</h3>
            <p className="sf-phone-subtitle">{current.subtitle}</p>
            {options.map(([Icon, label], i) => (
              <button
                key={label}
                className="sf-phone-action"
                aria-pressed={action === i}
                onClick={() => setAction(i)}
              >
                <Icon />
                <span>{label}</span>
                <ChevronRight />
              </button>
            ))}
            <p className="sf-phone-footer">Your world, one TapAway.</p>
          </div>
          <p className="mt-5 text-center text-[10px] text-[#737c6c]">
            Interactive example. Illustrative names and content.
          </p>
        </div>
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
      "VR",
      "TapAway makes it easy for customers to find everything about our business in one place. Simple, professional, and convenient.",
    ],
    [
      "Sonia Berumen",
      "SB",
      "My favorite part is that they handle the setup. As a business owner, having one less thing to figure out means a lot.",
    ],
    [
      "Amelia Zavala",
      "AZ",
      "I love how TapAway brings our links together in a way that feels organized and professional. It’s such a nice touch for our business.",
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
          {quotes.map(([name, initials, quote]) => (
            <article className="sf-quote" key={name}>
              <blockquote>“{quote}”</blockquote>
              <footer>
                <span className="sf-initials">{initials}</span>
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
  return (
    <Link
      to="/support#question"
      className="sf-help"
      onClick={() =>
        track("cta_click", { hubKind: "site", props: { placement: "help" } })
      }
    >
      <MessageCircle />
      Have a question?
    </Link>
  );
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
