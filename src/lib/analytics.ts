/** First-party product usage events. No advertising SDKs or persistent analytics IDs.
 * Visit IDs exist only in memory and rotate after 30 minutes of inactivity.
 */
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track`;
let sessionId = "";
let lastActivity = 0;
let firstPath = "";

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
  | "plan_view"
  | "billing_cycle_change"
  | "continue_click"
  | "trial_start_confirmed"
  | "paid_conversion"
  | "subscription_renewal"
  | "purchase"
  | "landing_cta_clicked"
  | "plan_selection_viewed"
  | "cards_4_selected"
  | "cards_15_selected"
  | "monthly_selected"
  | "yearly_selected"
  | "card_club_offered"
  | "card_club_selected"
  | "card_club_declined"
  | "card_club_decline_prompt"
  | "checkout_clicked"
  | "stripe_checkout_started"
  | "purchase_completed"
  | "purchase_failed"
  | "business_search_started"
  | "business_selected"
  | "business_not_found"
  | "logo_uploaded"
  | "logo_skipped"
  | "onboarding_completed"
  | "dashboard_opened"
  | "card_club_request_viewed"
  | "card_club_replacement_requested"
  | "card_club_replacement_approved"
  | "shipping_confirmed"
  | "card_club_replacement_completed";

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

/** A page-lifetime visit ID; never written to cookies or browser storage. */
export function getSessionId(): { id: string; isNew: boolean } {
  const now = Date.now();
  const isNew = !sessionId || now - lastActivity > SESSION_TIMEOUT_MS;
  if (isNew) sessionId = uid();
  lastActivity = now;
  return { id: sessionId, isNew };
}

function stripQuery(path: string): string {
  return path.split("#")[0].split("?")[0] || "/";
}

function campaign() {
  const params = new URLSearchParams(window.location.search);
  const medium = params.get("utm_medium");
  const source = params.get("src") || params.get("via");
  return {
    utm_source: params.get("utm_source")?.slice(0, 250) ?? null,
    utm_medium: medium?.slice(0, 250) ?? null,
    utm_campaign: params.get("utm_campaign")?.slice(0, 250) ?? null,
    utm_content: params.get("utm_content")?.slice(0, 250) ?? null,
    utm_term: params.get("utm_term")?.slice(0, 250) ?? null,
    campaign_channel: [source, medium].includes("nfc")
      ? "nfc"
      : [source, medium].includes("qr")
        ? "qr"
        : null,
  };
}
function entryPath(): string {
  if (!firstPath) firstPath = stripQuery(window.location.pathname);
  return firstPath;
}
function referrerOrigin(): string | null {
  try {
    return document.referrer ? new URL(document.referrer).origin : null;
  } catch {
    return null;
  }
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

export function track(
  event: AnalyticsEventName,
  options: TrackOptions = {},
): void {
  if (typeof window === "undefined") return;
  // Only server-verified billing events may claim a financial conversion.
  if (["trial_start_confirmed", "paid_conversion", "subscription_renewal", "purchase", "purchase_completed"].includes(event)) return;

  const path = stripQuery(options.path ?? window.location.pathname);
  const guardKey = `${event}|${path}|${options.hubId ?? ""}`;
  const now = Date.now();
  const last = recentlySent.get(guardKey);
  if (
    last &&
    now - last < IN_TAB_WINDOW_MS &&
    event !== "cta_click" &&
    event !== "link_click"
  ) {
    return;
  }
  recentlySent.set(guardKey, now);

  const { id: sessionId } = getSessionId();

  const payload = {
    event_id: uid(),
    event_name: event,
    session_id: sessionId,
    visitor_id: null,
    is_new_visitor: null,
    hub_id: options.hubId ?? null,
    hub_kind: options.hubKind ?? null,
    path,
    entry_path: entryPath(),
    referrer: referrerOrigin(),
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
    (
      window as unknown as { requestIdleCallback: (cb: () => void) => void }
    ).requestIdleCallback(send);
  } else {
    setTimeout(send, 0);
  }
}
