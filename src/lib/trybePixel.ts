/**
 * Trybe attribution pixel (custom domain: track.tapaway.co).
 *
 * Loaded ONLY after the visitor accepts tracking consent (see @/lib/consent) —
 * the exact same gate as the Meta Pixel. Before consent, nothing is fetched
 * from Trybe and no data leaves the browser.
 *
 * Loaded at most once per page (guarded by a module flag + data attribute).
 *
 * What it tracks: pageview/attribution data via the Trybe-hosted pixel.js
 * (served from our own domain, track.tapaway.co). Pixel only — no server-side
 * order events. Trial/purchase events require the Trybe Orders API and its
 * key, which must stay in edge-function secrets, never in frontend code.
 */

import { getConsent, onConsentChange } from "@/lib/consent";

const PIXEL_CODE = "px_16f9a31a6a94";
const STORE_ID = "17c69a15-f5e2-4ec1-8ecd-74ef5997b076";
const TRACK_ORIGIN = "https://track.tapaway.co";

declare global {
  interface Window {
    _trybe?: Record<string, unknown>;
  }
}

let loadAttempted = false;

function injectTrybeScript(): void {
  if (loadAttempted || typeof document === "undefined") return;
  loadAttempted = true;
  try {
    /* eslint-disable */
    // Snippet preserved verbatim from Trybe, minus the outer IIFE wrapper.
    (function (w: any, d: any, p: any, s: any, u: any, pl: any, at: any) {
      w._trybe = w._trybe || {
        pixelCode: p,
        storeId: s,
        platform: pl,
        autoTracking: at,
        customDomain: "track.tapaway.co",
        serviceUrl:
          "https://prod-trybe-platform-6mi3j.ondigitalocean.app/attribution",
      };
      var script = d.createElement("script");
      script.src = u + "/pixel.js";
      script.async = true;
      script.setAttribute("data-pixel-code", p);
      script.setAttribute("data-store-id", s);
      script.setAttribute("data-platform", pl);
      script.setAttribute("data-auto-tracking", at);
      d.head.appendChild(script);
    })(window, document, PIXEL_CODE, STORE_ID, TRACK_ORIGIN, "CUSTOM", "false");
    /* eslint-enable */
  } catch {
    /* the pixel must never break the page */
  }
}

/** Initialize the pixel if (and only if) consent is accepted. */
export function initTrybePixel(): void {
  if (getConsent() !== "accepted") return;
  injectTrybeScript();
}

/**
 * Call once at app startup. If consent is already accepted it initializes
 * immediately; otherwise it waits for the visitor's choice.
 */
export function watchConsentForTrybePixel(): () => void {
  initTrybePixel();
  return onConsentChange((state) => {
    if (state === "accepted") initTrybePixel();
  });
}

/**
 * Trybe visitor id, if the consent-gated pixel has loaded and exposes it.
 * Returns "" when tracking was declined or the pixel isn't ready — callers
 * pass it through to checkout, where an empty value simply means "no
 * creator attribution for this order".
 */
export function getTrybeVisitorId(): string {
  try {
    const w = window as any;
    const vid = w?.trybe?.getVisitorId?.() ?? w?._trybe?.getVisitorId?.();
    return typeof vid === "string" ? vid.slice(0, 128) : "";
  } catch {
    return "";
  }
}
