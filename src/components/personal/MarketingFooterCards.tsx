import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Star,
  Link as LinkIcon,
  UserPlus,
  UtensilsCrossed,
  BarChart3,
  ShoppingBag,
  ExternalLink,
} from "lucide-react";

const exampleOptions = [
  { label: "Bakery", slug: "/sugarbloomcakery" },
  { label: "Barbershop", slug: "/spacestudios" },
  { label: "Car Wraps", slug: "/rebornwraps" },
  { label: "Restaurant", slug: "/islasmarias" },
  { label: "Creator", slug: "/denzel" },
] as const;

const features = [
  { icon: Star, title: "Reviews", desc: "Collect Google reviews with one tap" },
  { icon: LinkIcon, title: "Links & Socials", desc: "All your platforms in one place" },
  { icon: UserPlus, title: "Contact / Save Phone", desc: "Visitors save your contact instantly" },
  { icon: UtensilsCrossed, title: "Menu & Services", desc: "Showcase what you offer" },
  { icon: BarChart3, title: "Analytics", desc: "See who visits and what they click" },
  { icon: ShoppingBag, title: "Shop", desc: "Sell courses, guides & products. TapAway takes 0%" },
];

const cardClass = "bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-5";

export default function MarketingFooterCards({ isDarkBg }: { isDarkBg: boolean }) {
  const [selected, setSelected] = useState(0);

  return (
    <div className="mt-8 space-y-4">
      {/* 1. CTA Pill */}
      <Link
        to="/onboarding"
        className="block w-full rounded-full bg-primary py-4 text-center transition-opacity hover:opacity-90"
      >
        <span className="block text-lg font-bold text-primary-foreground">Try It Free with your logo</span>
        <span className="block text-xs text-primary-foreground/70 mt-0.5">
          We'll cover shipping
        </span>
      </Link>

      {/* 2. Examples Card */}
      <div className={cardClass}>
        <h4 className="text-white font-semibold text-sm mb-3">
          See real businesses using TapAway
        </h4>

        <select
          value={selected}
          onChange={(e) => setSelected(Number(e.target.value))}
          className="w-full rounded-xl bg-white/10 border border-white/10 text-white text-sm px-3 py-2.5 mb-3 focus:outline-none focus:ring-1 focus:ring-primary appearance-none"
        >
          {exampleOptions.map((opt, i) => (
            <option key={opt.label} value={i} className="bg-gray-900 text-white">
              {opt.label}
            </option>
          ))}
        </select>

        <a
          href={`https://tapaway.co${exampleOptions[selected].slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full rounded-full border border-white/20 py-2.5 text-sm font-medium text-white/80 hover:text-white hover:border-white/40 transition-colors"
        >
          View Live Profile
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {/* 3. Features Card */}
      <div className={cardClass}>
        <h4 className="text-white font-semibold text-sm mb-3">Everything in one place</h4>

        <div className="grid grid-cols-2 gap-3">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                <span className="text-white text-xs font-medium truncate">{title}</span>
              </div>
              <p className="text-white/50 text-[10px] leading-tight">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
