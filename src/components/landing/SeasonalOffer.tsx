import { useEffect, useState } from "react";
import { StorefrontLink as Link } from "@/lib/storefrontNavigation";
import { MoonStar, ArrowRight, X } from "lucide-react";

import {
  HALLOWEEN_START,
  HALLOWEEN_END,
} from "../../../shared/storefrontOffers";
const DISMISS_KEY = "tapaway-halloween-2026-dismissed";
function useHalloweenTime() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now >= HALLOWEEN_START && now < HALLOWEEN_END
    ? HALLOWEEN_END - now
    : 0;
}
export function HalloweenCountdown() {
  const remaining = useHalloweenTime();
  if (!remaining) return null;
  const minutes = Math.floor(remaining / 60000);
  return (
    <div
      className="sf-sale-countdown"
      aria-label="Halloween sale ends October 31, 2026 at 11:59 PM Pacific time"
    >
      <span>
        <MoonStar aria-hidden="true" /> Halloween sale
      </span>
      <time
        dateTime="2026-11-01T00:00:00-07:00"
        title="Ends October 31 at 11:59 PM Pacific"
      >
        {Math.floor(minutes / 1440)}d <b>·</b>{" "}
        {String(Math.floor(minutes / 60) % 24).padStart(2, "0")}h <b>·</b>{" "}
        {String(minutes % 60).padStart(2, "0")}m
      </time>
      <small>Ends Oct 31 · Pacific time</small>
    </div>
  );
}
export function SeasonalOffer() {
  const remaining = useHalloweenTime();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });
  if (!remaining || dismissed) return null;
  return (
    <aside className="sf-seasonal" aria-label="Halloween offer">
      <div className="sf-container sf-seasonal-inner">
        <MoonStar className="sf-seasonal-icon" aria-hidden="true" />
        <p>
          <strong>Make a hauntingly good first impression.</strong>
          <span>
            Halloween sale · 2 custom cards for $39 · Free US shipping
          </span>
        </p>
        <Link to="/personal/design?template=halloween">
          Design your cards <ArrowRight aria-hidden="true" />
        </Link>
        <button
          aria-label="Dismiss Halloween offer"
          onClick={() => {
            setDismissed(true);
            try {
              sessionStorage.setItem(DISMISS_KEY, "1");
            } catch {
              /* Dismiss still works for this page. */
            }
          }}
        >
          <X aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
