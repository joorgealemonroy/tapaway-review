// Payment-first onboarding switch. Off for real visitors until the owner approves go-live.
// Turn on for testing with ?flow=payment_first (remembered for the browser tab).
export const PAYMENT_FIRST_DEFAULT = false;
const KEY = "tapaway_payment_first";

export function paymentFirstEnabled(): boolean {
  try {
    const flow = new URLSearchParams(window.location.search).get("flow");
    if (flow === "payment_first") sessionStorage.setItem(KEY, "1");
    const k = new URLSearchParams(window.location.search).get("pf_key");
    if (k && /^[a-f0-9]{16,64}$/.test(k)) sessionStorage.setItem(KEY + "_key", k);
    if (flow === "classic") sessionStorage.removeItem(KEY);
    return PAYMENT_FIRST_DEFAULT || sessionStorage.getItem(KEY) === "1";
  } catch {
    return PAYMENT_FIRST_DEFAULT;
  }
}

function testKey(): string | null {
  try { return sessionStorage.getItem(KEY + "_key"); } catch { return null; }
}

export const functionsUrl = (name: string) => `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`;

export async function callFunction<T = Record<string, unknown>>(name: string, body: unknown, accessToken?: string): Promise<{ ok: boolean; status: number; data: T }> {
  const res = await fetch(functionsUrl(name), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(testKey() ? { "x-pf-test-key": testKey() as string } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data: data as T };
}
