import { useState } from "react";
import { ExternalLink } from "lucide-react";

const exampleOptions = [
  { label: "Bakery", slug: "/sugarbloomcakery" },
  { label: "Barbershop", slug: "/spacestudios" },
  { label: "Car Wraps", slug: "/rebornwraps" },
  { label: "Restaurant", slug: "/islasmarias" },
  { label: "Creator", slug: "/denzel" },
] as const;

export default function MarketingExamplesCard({ compact = false }: { compact?: boolean }) {
  const [selected, setSelected] = useState(0);

  return (
    <div className={`bg-white/5 backdrop-blur border border-white/10 rounded-2xl ${compact ? "p-4" : "p-5"}`}>
      <h4 className={`text-white font-semibold ${compact ? "text-xs mb-2" : "text-sm mb-3"}`}>
        See real businesses using TapAway
      </h4>

      <select
        value={selected}
        onChange={(e) => setSelected(Number(e.target.value))}
        className={`w-full rounded-xl bg-white/10 border border-white/10 text-white ${compact ? "text-xs px-3 py-2 mb-2" : "text-sm px-3 py-2.5 mb-3 focus:ring-1 focus:ring-primary"} focus:outline-none appearance-none`}
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
        className={`flex items-center justify-center gap-2 w-full rounded-full border border-white/20 ${compact ? "py-2 text-xs" : "py-2.5 text-sm"} font-medium text-white/80 hover:text-white hover:border-white/40 transition-colors`}
      >
        View Live Profile
        {!compact && <ExternalLink className="h-3.5 w-3.5" />}
      </a>
    </div>
  );
}
