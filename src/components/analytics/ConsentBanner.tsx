import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getConsent, onConsentChange, setConsent, type ConsentState } from "@/lib/consent";

/**
 * Cookie/tracking consent banner. Appears once, bottom of the screen, until
 * the visitor accepts or declines. Accepting enables the Meta Pixel (used
 * for Instagram/Facebook retargeting) and persistent analytics; declining
 * keeps everything first-party and ephemeral.
 */
export function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const sync = (state: ConsentState) => setVisible(state === "pending");
    sync(getConsent());
    const unsub = onConsentChange(sync);
    // Re-check shortly after mount in case storage was slow/blocked.
    const t = setTimeout(() => sync(getConsent()), 1500);
    return () => {
      clearTimeout(t);
      unsub();
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Tracking consent"
      className="fixed bottom-0 inset-x-0 z-[90] px-4 pb-4 pt-10 pointer-events-none"
      style={{
        background:
          "linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0))",
      }}
    >
      <div className="pointer-events-auto max-w-md mx-auto rounded-2xl bg-[#101828] text-white shadow-2xl ring-1 ring-white/10 p-5">
        <p className="text-sm font-semibold">We value your privacy</p>
        <p className="text-[13px] text-white/70 mt-1 leading-relaxed">
          We use cookies and similar tech to run TapAway and — with your
          permission — to measure ads and reach people on Instagram and
          Facebook. Read our{" "}
          <Link to="/privacy" className="underline underline-offset-2">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link to="/cookie-policy" className="underline underline-offset-2">
            Cookie Policy
          </Link>
          .
        </p>
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setConsent("declined")}
            className="flex-1 h-11 rounded-full text-sm font-semibold bg-white/10 hover:bg-white/15 active:scale-[0.98] transition"
          >
            Decline
          </button>
          <button
            onClick={() => setConsent("accepted")}
            className="flex-1 h-11 rounded-full text-sm font-semibold bg-white text-gray-900 hover:bg-white/90 active:scale-[0.98] transition"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
