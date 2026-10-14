/**
 * Meta Pixel (Facebook) integration for Instagram/Facebook retargeting.
 *
 * The pixel script is loaded ONLY after the visitor accepts tracking
 * consent (see @/lib/consent). Without consent nothing from Meta is
 * fetched, so no data leaks before opt-in.
 *
 * The browser uses VITE_META_PIXEL_ID or the production fallback.
 * Every optional event rechecks consent. Revocation uses Meta's consent API.
 * Server CAPI remains fail-closed until current, revocable server evidence exists.
 */

import { getConsent, onConsentChange } from "@/lib/consent";

/** Production pixel. Overridable per-environment via VITE_META_PIXEL_ID. */
const DEFAULT_PIXEL_ID = "1117523280799077";
const ENV_PIXEL_ID = (import.meta.env.VITE_META_PIXEL_ID as string | undefined)?.trim();
const PIXEL_ID = ENV_PIXEL_ID || DEFAULT_PIXEL_ID;

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

let initialized = false;
let loadAttempted = false;
let suppressNextPageView: string | null = null;

function injectPixelScript(): void {
  if (loadAttempted || typeof document === "undefined") return;
  loadAttempted = true;
  try {
    /* eslint-disable */
    (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = "2.0";
      n.queue = [];
      t = b.createElement(e);
      t.async = true;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(
      window,
      document,
      "script",
      "https://connect.facebook.net/en_US/fbevents.js"
    );
    /* eslint-enable */
  } catch {
    /* pixel must never break the page */
  }
}

/** Initialize the pixel if (and only if) consent is accepted and an ID exists. */
export function initMetaPixel(): void {
  if (initialized || !PIXEL_ID) return;
  if (getConsent() !== "accepted") return;
  injectPixelScript();
  try {
    window.fbq?.("init", PIXEL_ID);
    window.fbq?.("track", "PageView");
    initialized = true;
    // init already counted the current page. Swallow a route-level PageView
    // for this same path so the first load is not double counted.
    suppressNextPageView = typeof location !== "undefined" ? location.pathname : "";
  } catch {
    /* ignore */
  }
}

/** Track a standard Meta event. No-op unless the pixel is initialized. */
export function trackMetaEvent(
  eventName: string,
  params?: Record<string, unknown>
): void {
  if (getConsent() !== "accepted" || !initialized || !window.fbq) return;
  try {
    if (params) window.fbq("track", eventName, params);
    else window.fbq("track", eventName);
  } catch {
    /* ignore */
  }
}

/** Convenience: PageView on SPA route changes (dedupe handled by caller). */
export function trackMetaPageView(): void {
  const path = typeof location !== "undefined" ? location.pathname : "";
  if (suppressNextPageView !== null) {
    const skip = suppressNextPageView === path;
    suppressNextPageView = null;
    if (skip) return;
  }
  trackMetaEvent("PageView");
}

/**
 * Call once at app startup. If consent is already accepted it initializes
 * immediately; otherwise it waits for the visitor's choice.
 */
export function watchConsentForPixel(): () => void {
  initMetaPixel();
  return onConsentChange((state) => {
    if (state === "accepted") {
      window.fbq?.("consent", "grant");
      initMetaPixel();
    } else if (initialized) {
      window.fbq?.("consent", "revoke");
    }
  });
}

/** For admin status UI. */
export function isMetaPixelConfigured(): boolean {
  return !!PIXEL_ID;
}
