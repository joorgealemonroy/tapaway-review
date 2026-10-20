import { Link } from "react-router-dom";
import { MoonStar, ArrowRight } from "lucide-react";
// An actual seasonal theme, without invented discounts or a scarcity countdown.
export function SeasonalOffer() {
  const now = Date.now();
  if (
    now < Date.parse("2026-10-01T00:00:00-07:00") ||
    now >= Date.parse("2026-11-01T00:00:00-07:00")
  )
    return null;
  return (
    <div className="sf-seasonal">
      <div className="sf-container">
        <MoonStar aria-hidden="true" />
        <p>
          <strong>Make a hauntingly good first impression.</strong>
          <span>Two custom cards · $39 once · Free US shipping</span>
        </p>
        <Link to="/personal/design?template=halloween">
          Make it yours <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
