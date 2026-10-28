// Payment-first onboarding switch. LIVE since go-live; ?flow=classic falls back to the old signup.
// Rollback: set PAYMENT_FIRST_DEFAULT=false and backend PAYMENT_FIRST_ENABLED=false.
export const PAYMENT_FIRST_DEFAULT = true;
const KEY = "tapaway_payment_first";
const CLASSIC_KEY = "tapaway_classic_flow";

export function paymentFirstEnabled(): boolean {
  try {
    const flow = new URLSearchParams(window.location.search).get("flow");
    if (flow === "payment_first") { sessionStorage.setItem(KEY, "1"); sessionStorage.removeItem(CLASSIC_KEY); }
    const k = new URLSearchParams(window.location.search).get("pf_key");
    if (k && /^[a-f0-9]{16,64}$/.test(k)) sessionStorage.setItem(KEY + "_key", k);
    if (flow === "classic") { sessionStorage.removeItem(KEY); sessionStorage.setItem(CLASSIC_KEY, "1"); }
    if (sessionStorage.getItem(CLASSIC_KEY) === "1") return false;
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
    signal: AbortSignal.timeout(20000),
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
