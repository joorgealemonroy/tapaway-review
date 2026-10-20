import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, Menu, Wifi, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSalesRep } from "@/hooks/useSalesRep";
import {
  getCampaignParams,
  getOnboardingData,
  saveOnboardingData,
} from "@/lib/onboardingData";
import "./storefront.css";

const links = [
  ["Business", "/#business"],
  ["Personal", "/personal"],
  ["How it works", "/#how-it-works"],
  ["Pricing", "/#pricing"],
  ["Examples", "/#examples"],
  ["Help", "/support"],
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
  const { pathname, search } = useLocation();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(false);
    const campaign = getCampaignParams();
    if (Object.keys(campaign).length)
      saveOnboardingData({
        campaign: { ...getOnboardingData().campaign, ...campaign },
      });
  }, [pathname, search]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <header className="sf-nav storefront">
      <a href="#main-content" className="sf-skip">
        Skip to content
      </a>
      <div className="sf-container sf-nav-inner">
        <Brand />
        <nav className="sf-nav-links" aria-label="Main navigation">
          {links.map(([label, href]) => (
            <a key={label} href={href}>
              {label}
            </a>
          ))}
        </nav>
        <div className="sf-nav-account">
          <Link
            className="sf-login"
            to={user ? (isSalesRep ? "/rep" : "/dashboard") : "/auth"}
          >
            {user ? "Dashboard" : "Log in"}
          </Link>
          <a
            href={pathname.startsWith("/personal") ? "/personal/design" : "/#pricing"}
            className="sf-button"
          >
            {pathname.startsWith("/personal") ? "Design cards" : "Get started"} <ArrowRight aria-hidden="true" />
          </a>
          <button
            className="sf-menu-toggle"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="storefront-menu"
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      {open && (
        <nav
          id="storefront-menu"
          className="sf-mobile-menu"
          aria-label="Mobile navigation"
        >
          {links.map(([label, href]) => (
            <a key={label} href={href} onClick={() => setOpen(false)}>
              {label}
            </a>
          ))}
          <Link to={user ? (isSalesRep ? "/rep" : "/dashboard") : "/auth"}>
            {user ? "Dashboard" : "Log in"}
          </Link>
        </nav>
      )}
    </header>
  );
}
