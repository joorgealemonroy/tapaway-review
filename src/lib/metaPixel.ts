/**
 * Meta Pixel (Facebook) integration for Instagram/Facebook retargeting.
 *
 * The pixel script is loaded ONLY after the visitor accepts tracking
 * consent (see @/lib/consent). Without consent nothing from Meta is
 * fetched, so no data leaks before opt-in.
 *
 * Configuration: set VITE_META_PIXEL_ID in the hosting environment
 * (Lovable → Project Settings → Environment Variables). Until it is set,
 * every function below is a silent no-op and the site behaves exactly
 * as before.
 *
 * Server-side backup: purchases and leads are also sent via the Conversions
 * API (supabase/functions/_shared/metaCapi.ts) from verify-personal-checkout
 * (Lead/Purchase at signup) and stripe-webhook (Purchase on paid invoices),
 * so ad-blocked browsers still count. Server events use the Stripe session
 * or invoice id as event_id for dedup.
 */

import { getConsent, onConsentChange } from "@/lib/consent";

const PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID as string | undefined;

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

let initialized = false;
let loadAttempted = false;

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
  } catch {
    /* ignore */
  }
}

/** Track a standard Meta event. No-op unless the pixel is initialized. */
export function trackMetaEvent(
  eventName: string,
  params?: Record<string, unknown>
): void {
  if (!initialized || !window.fbq) return;
  try {
    if (params) window.fbq("track", eventName, params);
    else window.fbq("track", eventName);
  } catch {
    /* ignore */
  }
}

/** Convenience: PageView on SPA route changes (dedupe handled by caller). */
export function trackMetaPageView(): void {
  trackMetaEvent("PageView");
}

/**
 * Call once at app startup. If consent is already accepted it initializes
 * immediately; otherwise it waits for the visitor's choice.
 */
export function watchConsentForPixel(): () => void {
  initMetaPixel();
  return onConsentChange((state) => {
    if (state === "accepted") initMetaPixel();
  });
}

/** For admin status UI. */
export function isMetaPixelConfigured(): boolean {
  return !!PIXEL_ID;
}
