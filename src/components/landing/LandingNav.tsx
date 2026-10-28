import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  ArrowRight,
  Menu,
  Wifi,
  Building2,
  CreditCard,
  CircleHelp,
  Sparkles,
  Play,
  Tag,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSalesRep } from "@/hooks/useSalesRep";
import {
  getCampaignParams,
  getOnboardingData,
  saveOnboardingData,
} from "@/lib/onboardingData";
import { StorefrontLink as Link } from "@/lib/storefrontNavigation";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import "./storefront.css";

const links = [
  {
    label: "Business",
    href: "/#business",
    detail: "Custom cards + a hub, set up for you",
    icon: Building2,
  },
  {
    label: "Personal",
    href: "/personal",
    detail: "2 custom cards · $39 once",
    icon: CreditCard,
  },
  {
    label: "How it works",
    href: "/#how-it-works",
    detail: "A tap. A link. A new connection.",
    icon: Play,
  },
  {
    label: "Pricing",
    href: "/#pricing",
    detail: "Personal cards & business plans",
    icon: Tag,
  },
  {
    label: "Examples",
    href: "/#examples",
    detail: "Try real TapAway hubs",
    icon: Sparkles,
  },
  {
    label: "Help",
    href: "/support",
    detail: "Quick answers or our real team",
    icon: CircleHelp,
  },
];
export const Brand = () => (
  <Link to="/" className="sf-logo" aria-label="TapAway home">
    TapAway
    <Wifi aria-hidden="true" />
  </Link>
);

export function LandingNav() {
  const { user } = useAuth();
  const { isSalesRep } = useSalesRep();
  const { pathname, search, hash } = useLocation();
  const [open, setOpen] = useState(false);
  const accountUrl = user ? (isSalesRep ? "/rep" : "/dashboard") : "/auth";
  useEffect(() => {
    setOpen(false);
    const campaign = getCampaignParams();
    if (Object.keys(campaign).length)
      saveOnboardingData({
        campaign: { ...getOnboardingData().campaign, ...campaign },
      });
  }, [pathname, search, hash]);
  useEffect(() => {
    const media = matchMedia("(min-width: 901px)");
    const closeOnDesktop = () => {
      if (media.matches) setOpen(false);
    };
    media.addEventListener("change", closeOnDesktop);
    return () => media.removeEventListener("change", closeOnDesktop);
  }, []);
  return (
    <header className="sf-nav storefront">
      <a href="#main-content" className="sf-skip">
        Skip to content
      </a>
      <div className="sf-container sf-nav-inner">
        <Brand />
        <nav className="sf-nav-links" aria-label="Main navigation">
          {links.map(({ label, href }) => (
            <Link key={label} to={href}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="sf-nav-account">
          <Link className="sf-login" to={accountUrl}>
            {user ? "Dashboard" : "Log in"}
          </Link>
          <Link
            to={
              pathname.startsWith("/personal")
                ? "/personal/design"
                : "/#pricing"
            }
            className="sf-button"
          >
            {pathname.startsWith("/personal") ? "Design cards" : "Get started"}
            <ArrowRight aria-hidden="true" />
          </Link>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                className="sf-menu-toggle"
                aria-label="Open menu"
                aria-controls="storefront-menu"
              >
                <Menu aria-hidden="true" />
              </button>
            </SheetTrigger>
            <SheetContent className="storefront sf-mobile-sheet">
              <SheetTitle className="sf-mobile-title">
                TapAway <Wifi aria-hidden="true" />
              </SheetTitle>
              <SheetDescription>Your world, one tap away.</SheetDescription>
              <nav
                id="storefront-menu"
                className="sf-mobile-menu"
                aria-label="Mobile navigation"
              >
                {links.map(({ label, href, detail, icon: Icon }) => (
                  <Link
                    key={label}
                    to={href}
                    aria-label={label}
                    onClick={() => setOpen(false)}
                  >
                    <Icon aria-hidden="true" />
                    <span>
                      <strong>{label}</strong>
                      <small>{detail}</small>
                    </span>
                    <ArrowRight aria-hidden="true" />
                  </Link>
                ))}
              </nav>
              <Link
                to={accountUrl}
                className="sf-button secondary"
                onClick={() => setOpen(false)}
              >
                {user ? "Open dashboard" : "Log in to your account"}
              </Link>
              <p className="sf-mobile-note">
                No app needed to open your card's link.
              </p>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
