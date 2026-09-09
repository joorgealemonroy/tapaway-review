import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { ExpiredProfilePreview } from "@/hooks/useProfileData";
import { getOptimizedImageUrl } from "@/components/personal/OptimizedImage";

/**
 * ExpiredSoloHubPreview — the graceful expired-trial experience for
 * solo/personal hubs.
 *
 * When a trial lapses without payment, the hub's content (links, blocks)
 * stays gated and the account's status stays honestly 'expired' — but the
 * visitor gets a warm, on-brand page instead of a dead-end "Profile not
 * found": a tasteful preview of the hub's real branding (photo, name,
 * headline, bio — all already-public info), a kind banner, and ONE call to
 * action that routes the owner into the existing reactivation flow.
 *
 * CTA destination: /dashboard?tab=plan (signed-in owner) or
 * /auth?redirect=/dashboard?tab=plan (signed-out visitor). The Plan tab's
 * upgrade path runs create-personal-upgrade → Stripe checkout — no new
 * billing flow was invented here.
 */
export const ExpiredSoloHubPreview = ({ preview }: { preview: ExpiredProfilePreview }) => {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setSignedIn(!!data.user);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const ctaHref =
    signedIn === false
      ? `/auth?redirect=${encodeURIComponent("/dashboard?tab=plan")}`
      : "/dashboard?tab=plan";

  // Brand-aware styling, mirroring the live hub's contrast rules (lightweight).
  const bgStyle = preview.bg_style || undefined;
  const bgColor = preview.background_color || "#0a0e1a";
  const isDark = bgStyle ? isColorDark(getBaseColor(bgStyle)) : isColorDark(bgColor);
  const textColor = preview.text_color || (isDark ? "#FFFFFF" : "#1A1A1A");
  const subColor = preview.text_color || (isDark ? "rgba(255,255,255,0.75)" : "rgba(26,26,26,0.7)");
  const accent = preview.button_theme || "#2563EB";
  const onAccent = isColorDark(accent) ? "#FFFFFF" : "#1A1A1A";
  const cardBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
  const cardBorder = isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.1)";

  const photoUrl = preview.profile_photo_url
    ? getOptimizedImageUrl(preview.profile_photo_url, 256, 90)
    : null;
  const name = preview.full_name || `@${preview.username}`;
  const pfpCentered = (preview.pfp_position || "center") === "center";

  return (
    <div
      className="min-h-screen"
      style={bgStyle ? { background: bgStyle } : { backgroundColor: bgColor }}
    >
      <div className="mx-auto w-full max-w-[430px] px-5 pt-5 pb-12 flex flex-col min-h-[100dvh]">
        {/* Wordmark */}
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold tracking-tight" style={{ color: textColor }}>
            TapAway
          </span>
          <span
            className="text-xs font-medium px-3 py-1.5 rounded-full"
            style={{ color: subColor, backgroundColor: cardBg, border: `1px solid ${cardBorder}` }}
          >
            Trial ended
          </span>
        </div>

        {/* Kind banner */}
        <div
          className="mt-6 rounded-2xl p-5 sm:p-6"
          style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}` }}
        >
          <h1
            className="text-2xl sm:text-[26px] font-bold tracking-tight leading-snug"
            style={{ color: textColor }}
          >
            Your trial ended — claim your hub.
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed" style={{ color: subColor }}>
            Your free trial ended, but your hub is still here waiting. Claim it
            now and you&rsquo;re back live in a minute.
          </p>
          <a
            href={ctaHref}
            className="mt-5 w-full min-h-[48px] rounded-xl font-bold text-base flex items-center justify-center gap-2 px-6"
            style={{ backgroundColor: accent, color: onAccent }}
          >
            Claim my hub
            <ArrowRight className="h-5 w-5" />
          </a>
          <p className="mt-3 text-xs text-center" style={{ color: subColor }}>
            Everything you built is saved — pick up right where you left off.
          </p>
        </div>

        {/* Tasteful preview of the hub: real branding + public info, not interactive */}
        <div className="mt-6 flex-1" aria-hidden={false}>
          <p
            className="text-xs uppercase tracking-widest font-medium mb-4"
            style={{ color: subColor }}
          >
            Your hub preview
          </p>
          <div className={`flex flex-col ${pfpCentered ? "items-center text-center" : "items-start text-left"} gap-3`}>
            {photoUrl ? (
              <img
                src={photoUrl}
                alt=""
                loading="eager"
                decoding="async"
                className="h-24 w-24 rounded-full object-cover"
                style={{ border: `3px solid ${cardBorder}` }}
              />
            ) : (
              <div
                className="h-24 w-24 rounded-full flex items-center justify-center"
                style={{ backgroundColor: accent }}
              >
                <span className="text-4xl font-bold" style={{ color: onAccent }}>
                  {name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className={pfpCentered ? "text-center" : "text-left"}>
              <h2
                className="text-xl font-bold break-words"
                style={{ color: textColor }}
              >
                {name}
              </h2>
              {preview.headline && (
                <p className="mt-1 text-[15px] break-words" style={{ color: subColor }}>
                  {preview.headline}
                </p>
              )}
            </div>
            {preview.bio && (
              <p
                className={`text-sm leading-relaxed break-words ${pfpCentered ? "text-center" : "text-left"}`}
                style={{ color: subColor }}
              >
                {preview.bio}
              </p>
            )}
            {/* Non-interactive placeholder rows signal "your links live here" */}
            <div className="w-full mt-2 space-y-2.5 pointer-events-none select-none" aria-hidden="true">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="w-full h-12 rounded-xl"
                  style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}`, opacity: 0.65 }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-xs text-center" style={{ color: subColor }}>
          Made with TapAway
        </p>
      </div>
    </div>
  );
};

export default ExpiredSoloHubPreview;

/** Extract the base color from a CSS gradient (first hex/rgb/hsl token). */
function getBaseColor(style: string): string {
  const m = style.match(/#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b|rgba?\([^)]*\)|hsla?\([^)]*\)/);
  return m ? m[0] : "#0a0e1a";
}

/** Rough relative-luminance darkness check for hex/rgb colors. */
function isColorDark(color: string): boolean {
  const hex = color.trim();
  let r = 0;
  let g = 0;
  let b = 0;
  if (hex.startsWith("#")) {
    const h = hex.slice(1);
    const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    if (full.length >= 6) {
      r = parseInt(full.slice(0, 2), 16);
      g = parseInt(full.slice(2, 4), 16);
      b = parseInt(full.slice(4, 6), 16);
    }
  } else {
    const nums = hex.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    [r, g, b] = [nums[0] ?? 0, nums[1] ?? 0, nums[2] ?? 0];
  }
  // Relative luminance (sRGB) — below ~0.35 counts as dark.
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum < 0.35;
}
