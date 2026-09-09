/**
 * Meta Conversions API (server-side) sender for Instagram/Facebook ad tracking.
 *
 * Why server-side: browser pixels get blocked by ad-blockers and iOS
 * privacy prompts. The Conversions API sends the same events from our
 * backend, so purchases and leads still count for retargeting audiences
 * and ROAS measurement.
 *
 * Privacy: events fire ONLY for people who completed a real checkout on
 * tapaway.co (they gave us their email/phone to buy). The browser pixel
 * (src/lib/metaPixel.ts) remains consent-gated — nothing is sent to Meta
 * from the browser without opt-in. Server events carry only SHA-256 hashes
 * of email/phone, never raw values.
 *
 * Configuration: set META_PIXEL_ID and META_CONVERSIONS_API_TOKEN as
 * Supabase/Lovable secrets. Until both are set, every call below is a
 * silent no-op and checkout flows behave exactly as before.
 *
 * Dedup: pass the same event_id the browser pixel uses (when both fire)
 * so Meta counts the event once.
 */

export interface MetaCapiEvent {
  /** Standard Meta event name: Lead, Purchase, InitiateCheckout, StartTrial... */
  eventName: string;
  /** Unique per event — shared with the browser pixel for dedup. */
  eventId: string;
  email?: string | null;
  /** Any format; digits are extracted and hashed. */
  phone?: string | null;
  /** Decimal dollars, e.g. 39.00 */
  value?: number;
  currency?: string;
  /** Unix seconds; defaults to now. */
  eventTime?: number;
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value.trim().toLowerCase());
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function sendMetaCapiEvent(
  e: MetaCapiEvent,
): Promise<{ ok: boolean; skipped?: string; error?: string }> {
  const pixelId = Deno.env.get("META_PIXEL_ID") || "";
  const token = Deno.env.get("META_CONVERSIONS_API_TOKEN") || "";
  if (!pixelId || !token) {
    return { ok: false, skipped: "Meta CAPI not configured" };
  }
  try {
    const userData: Record<string, string> = {};
    if (e.email) userData.em = await sha256Hex(e.email);
    if (e.phone) {
      const digits = e.phone.replace(/\D/g, "");
      if (digits) userData.ph = await sha256Hex(digits);
    }
    const customData: Record<string, unknown> = {};
    if (typeof e.value === "number" && isFinite(e.value)) {
      customData.value = Math.round(e.value * 100) / 100;
    }
    if (e.currency) customData.currency = e.currency;

    const res = await fetch(
      `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: [
            {
              event_name: e.eventName,
              event_time: e.eventTime || Math.floor(Date.now() / 1000),
              event_id: e.eventId,
              action_source: "website",
              user_data: userData,
              custom_data: customData,
            },
          ],
        }),
      },
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `Meta CAPI ${res.status}: ${text.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (err) {
    // Tracking must never break checkout.
    return { ok: false, error: err instanceof Error ? err.message : "unknown" };
  }
}
