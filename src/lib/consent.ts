/**
 * Tracking consent store (the "Phase 3" consent the analytics client was
 * waiting on). Single source of truth for whether marketing/analytics
 * tracking (Meta Pixel, visitor-id persistence) is allowed.
 *
 * States: "pending" (banner not answered yet), "accepted", "declined".
 * Persisted in localStorage under a versioned key so a future policy
 * change can re-prompt by bumping CONSENT_VERSION.
 */

export type ConsentState = "pending" | "accepted" | "declined";

const CONSENT_VERSION = 1;
const STORAGE_KEY = `tapaway_tracking_consent_v${CONSENT_VERSION}`;

type Listener = (state: ConsentState) => void;
const listeners = new Set<Listener>();

function readStored(): ConsentState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "accepted" || raw === "declined") return raw;
  } catch {
    /* storage unavailable — treat as pending */
  }
  return "pending";
}

let current: ConsentState = readStored();

export function getConsent(): ConsentState {
  return current;
}

/** True only when the visitor explicitly accepted tracking. */
export function consentAllowsTracking(): boolean {
  return getConsent() === "accepted";
}

export function setConsent(state: "accepted" | "declined"): void {
  current = state;
  try {
    localStorage.setItem(STORAGE_KEY, state);
  } catch {
    /* ignore — consent just won't persist this session */
  }
  listeners.forEach((l) => {
    try {
      l(state);
    } catch {
      /* listener errors must never break consent */
    }
  });
}

export function onConsentChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
