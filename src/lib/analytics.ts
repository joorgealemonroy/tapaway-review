/**
 * TapAway centralized analytics client.
 *
 * The single write path for all public-page tracking. Sends to the hardened
 * `track` edge function; the browser never inserts into analytics tables.
 *
 * Identifiers (deliberately two, and distinct):
 *  - session_id: rotates after 30 minutes of inactivity (sessionStorage-backed,
 *    mirrored in localStorage only to carry the inactivity timestamp).
 *  - visitor_id: returning-visitor identifier, persisted ONLY when the
 *    visitor's analytics consent state allows it (Phase 3 wires the real
 *    consent store; until then it defaults to not persisting).
 *
 * No fingerprinting. No raw IP is ever sent from the client. Query strings are
 * stripped before a path leaves the browser.
 */

const SESSION_KEY = "ta_sid";
const SESSION_TS_KEY = "ta_sid_ts";
const VISITOR_KEY = "ta_vid";
const ENTRY_KEY = "ta_entry";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track`;

export type AnalyticsEventName =
  | "page_view"
  | "hub_view"
  | "session_start"
  | "page_exit"
  | "scroll_depth"
  | "cta_click"
  | "link_click"
  | "review_click"
  | "social_click"
  | "menu_view"
  | "directions_click"
  | "call_click"
  | "text_click"
  | "website_click"
  | "contact_save"
  | "lead_submit"
  | "checkout_start"
  | "purchase";

export interface TrackOptions {
  hubId?: string | null;
  hubKind?: "solo" | "business" | "site";
  path?: string;
  timeOnPageMs?: number;
  scrollDepthPct?: number;
  props?: Record<string, string | number | boolean | null>;
}

function uid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

function safeGet(store: Storage | undefined, key: string): string | null {
  try {
    return store?.getItem(key) ?? null;
  } catch {
    return null;
  }
}
function safeSet(store: Storage | undefined, key: string, value: string): void {
  try {
    store?.setItem(key, value);
  } catch {
    /* storage blocked — tracking degrades, app keeps working */
  }
}

/** Session ID that expires after 30 minutes of inactivity. */
export function getSessionId(): { id: string; isNew: boolean } {
  const now = Date.now();
  const last = Number(safeGet(window.localStorage, SESSION_TS_KEY) || 0);
  let id = safeGet(window.localStorage, SESSION_KEY);
  let isNew = false;

  if (!id || !last || now - last > SESSION_TIMEOUT_MS) {
    id = uid();
    isNew = true;
    safeSet(window.localStorage, SESSION_KEY, id);
  }
  safeSet(window.localStorage, SESSION_TS_KEY, String(now));
  return { id, isNew };
}

/**
 * Returning-visitor ID. Persisted only when analytics consent allows it.
 * Phase 3 replaces `consentAllowsVisitorId` with the real consent store.
 */
let visitorIdAllowed = false;
export function setVisitorIdAllowed(allowed: boolean): void {
  visitorIdAllowed = allowed;
  if (!allowed) {
    try {
      window.localStorage.removeItem(VISITOR_KEY);
    } catch {
      /* ignore */
    }
  }
}

function getVisitorId(): { id: string | null; isNew: boolean | null } {
  if (!visitorIdAllowed) return { id: null, isNew: null };
  const existing = safeGet(window.localStorage, VISITOR_KEY);
  if (existing) return { id: existing, isNew: false };
  const id = uid();
  safeSet(window.localStorage, VISITOR_KEY, id);
  return { id, isNew: true };
}

function stripQuery(path: string): string {
  return path.split("#")[0].split("?")[0] || "/";
}

function campaign() {
  const p = new URLSearchParams(window.location.search);
  const src = p.get("utm_source");
  const medium = p.get("utm_medium");
  const explicit = p.get("src") || p.get("via");
  let channel: string | null = null;
  if (explicit === "nfc" || medium === "nfc") channel = "nfc";
  else if (explicit === "qr" || medium === "qr") channel = "qr";
  return {
    utm_source: src,
    utm_medium: medium,
    utm_campaign: p.get("utm_campaign"),
    utm_content: p.get("utm_content"),
    utm_term: p.get("utm_term"),
    campaign_channel: channel,
  };
}

function entryPath(): string {
  const existing = safeGet(window.sessionStorage, ENTRY_KEY);
  if (existing) return existing;
  const value = stripQuery(window.location.pathname);
  safeSet(window.sessionStorage, ENTRY_KEY, value);
  return value;
}

/** Set by the auth layer so staff traffic is labelled, not counted as customers. */
let internalActor = false;
export function setInternalActor(value: boolean): void {
  internalActor = value;
}

// In-tab guard so a React remount / Strict Mode double-effect never
// produces two events. The edge function enforces this again server-side.
const recentlySent = new Map<string, number>();
const IN_TAB_WINDOW_MS = 30_000;

export function track(event: AnalyticsEventName, options: TrackOptions = {}): void {
  if (typeof window === "undefined") return;

  const path = stripQuery(options.path ?? window.location.pathname);
  const guardKey = `${event}|${path}|${options.hubId ?? ""}`;
  const now = Date.now();
  const last = recentlySent.get(guardKey);
  if (last && now - last < IN_TAB_WINDOW_MS && event !== "cta_click" && event !== "link_click") {
    return;
  }
  recentlySent.set(guardKey, now);

  const { id: sessionId } = getSessionId();
  const visitor = getVisitorId();

  const payload = {
    event_id: uid(),
    event_name: event,
    session_id: sessionId,
    visitor_id: visitor.id,
    is_new_visitor: visitor.isNew,
    hub_id: options.hubId ?? null,
    hub_kind: options.hubKind ?? null,
    path,
    entry_path: entryPath(),
    referrer: document.referrer || null,
    ...campaign(),
    time_on_page_ms: options.timeOnPageMs ?? null,
    scroll_depth_pct: options.scrollDepthPct ?? null,
    internal: internalActor,
    props: options.props ?? {},
  };

  const send = () => {
    fetch(FN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      /* never let tracking break the page */
    });
  };

  if ("requestIdleCallback" in window) {
    (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(send);
  } else {
    setTimeout(send, 0);
  }
}
