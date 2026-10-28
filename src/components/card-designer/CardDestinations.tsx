import {
  Check,
  ExternalLink,
  Link2,
  BarChart3,
  Palette,
  RefreshCw,
} from "lucide-react";
import { type CardDraft } from "@/lib/cardDesign";
export function CardDestinations({
  draft,
  onChange,
}: {
  draft: CardDraft;
  onChange: (draft: CardDraft) => void;
}) {
  return (
    <section className="cd-destinations">
      <div>
        <p className="sf-eyebrow">The card starts the conversation.</p>
        <h2>Where does the tap go?</h2>
        <p>
          Both the tap and QR open the same destination on each card. Choose the
          home for your hello.
        </p>
      </div>
      <div
        className="cd-destination-choices"
        role="radiogroup"
        aria-label="Card destination type"
      >
        <button
          role="radio"
          aria-checked={!draft.hosted}
          onClick={() => onChange({ ...draft, hosted: false })}
        >
          <Link2 />
          <strong>Use a link I already have</strong>
          <span>
            Linktree, Linkme, Instagram, your site, a portfolio… paste it in and
            you're connected.
          </span>
          <small>No ongoing TapAway fee</small>
          {!draft.hosted && <Check className="cd-choice-check" />}
        </button>
        <button
          role="radio"
          aria-checked={draft.hosted}
          onClick={() =>
            onChange({ ...draft, hosted: true, hubName: "", hubLinks: "" })
          }
        >
          <Palette />
          <strong>Create my own TapAway hub</strong>
          <span>
            Your own page, your style, all your good stuff in one place. No
            website needed.
          </span>
          <small>Optional · $5/month</small>
          {draft.hosted && <Check className="cd-choice-check" />}
        </button>
      </div>
      {draft.hosted ? (
        <div className="cd-hub-explainer">
          <div className="cd-hub-address">
            <span>Your own address</span>
            <strong>
              tapaway.co/<em>yourname</em>
            </strong>
            <small>Choose an available name after checkout.</small>
          </div>
          <div>
            <h3>A little home for everything you.</h3>
            <ul className="cd-hub-benefits">
              <li>
                <Palette />
                Build your page with photos, links, text, and your colors.
              </li>
              <li>
                <RefreshCw />
                Your full dashboard, ready to edit 24/7. Change your page
                anytime.
              </li>
              <li>
                <BarChart3 />
                See visits and link activity with built-in analytics.
              </li>
            </ul>
            <p>
              Both cards open your hub. After payment, we'll walk you through
              picking your address and making the page yours. Start from
              scratch—you don't need any links ready.
            </p>
            <p className="cd-hosted-total">
              <strong>$44 today</strong> = your $39 card pair + the first month
              of hosting. Then $5/month until canceled. No personal free trial.
            </p>
          </div>
        </div>
      ) : (
        <div className="cd-link-fields">
          {draft.cards.map((card, i) => (
            <label key={i}>
              Card {i + 1} destination
              <input
                type="text"
                inputMode="url"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={220}
                value={card.destination}
                onChange={(e) =>
                  onChange({
                    ...draft,
                    cards: draft.cards.map((c, j) =>
                      i === j ? { ...c, destination: e.target.value } : c,
                    ) as CardDraft["cards"],
                  })
                }
                placeholder={
                  i === 0
                    ? "linktr.ee/yourname or any public link"
                    : "link.me/yourname or the same link"
                }
              />
            </label>
          ))}
          <button
            className="sf-text-link"
            onClick={() =>
              onChange({
                ...draft,
                cards: [
                  draft.cards[0],
                  {
                    ...draft.cards[1],
                    destination: draft.cards[0].destination,
                  },
                ],
              })
            }
          >
            <Link2 size={15} /> Use card 1's link for both
          </button>
          <p className="sf-price-note">
            The saved destination stays on the printed card. If it's a Linktree
            or Linkme page, you can keep updating that page through its
            provider. No ongoing TapAway fee; the other provider's terms still
            apply.
          </p>
          <p className="cd-inspiration">
            <ExternalLink size={16} /> Inspiration: your socials, a creative
            portfolio, a favorite playlist, a booking page, or a very good meme.
          </p>
        </div>
      )}
    </section>
  );
}
