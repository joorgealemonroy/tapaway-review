// Shared helper: report a paid order to Trybe's server-side Orders API.
// Spec per Trybe support: POST https://jointrybe.com/attribution/v1/orders
// with { apiKey, orderId, value, currency, vid, email?, orderTime?, items? }
// in the JSON BODY (apiKey is a body field, NOT a header).
// value = dollars, currency = 3-letter uppercase ISO code, vid = Trybe
// visitor id (required). email recommended (Trybe hashes it server-side).
// apiKey stays server-side only. NEVER import this from frontend code.

const TRYBE_ORDERS_URL = "https://jointrybe.com/attribution/v1/orders";

export interface TrybeOrderInput {
  orderId: string;
  value: number;
  currency: string;
  vid: string;
  email?: string;
  orderTime?: string;
  items?: Array<{ productId?: string; productName?: string; quantity?: number; price?: number }>;
}

export async function reportTrybeOrder(
  input: TrybeOrderInput,
): Promise<{ ok: boolean; reason?: string; status?: number }> {
  const apiKey = Deno.env.get("TRYBE_ORDERS_API_KEY");
  if (!apiKey) {
    console.log("[trybe] TRYBE_ORDERS_API_KEY not set — skipping");
    return { ok: false, reason: "not_configured" };
  }
  if (!input.vid) {
    console.log("[trybe] missing visitor id — skipping (vid is required)");
    return { ok: false, reason: "missing_vid" };
  }

  const res = await fetch(TRYBE_ORDERS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apiKey,
      orderId: input.orderId,
      value: Math.round(input.value * 100) / 100,
      currency: (input.currency || "USD").toUpperCase(),
      vid: input.vid,
      ...(input.email ? { email: input.email } : {}),
      ...(input.orderTime ? { orderTime: input.orderTime } : {}),
      ...(input.items?.length ? { items: input.items } : {}),
    }),
  }).catch((err) => {
    console.error("[trybe] orders API request failed:", err);
    return null;
  });

  if (!res) return { ok: false, reason: "request_failed" };
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error(`[trybe] orders API HTTP ${res.status}: ${detail.slice(0, 300)}`);
    return { ok: false, reason: "http_error", status: res.status };
  }
  console.log(`[trybe] order ${input.orderId} reported`);
  return { ok: true, status: res.status };
}
