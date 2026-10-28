const STORAGE_KEY = "tapaway_checkout_attempt_v1";
type Attempt = { fingerprint: string; id: string };
let memory: Attempt | null = null;

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => [key, canonical(entry)]));
  return value ?? null;
}

/** Reuse an order attempt across retries without keeping business details in storage. */
export async function getCheckoutAttemptId(selection: { plan: string; interval: string; cardClub: boolean; business?: unknown }): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(canonical(selection)));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const fingerprint = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
  try {
    const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null") as Attempt | null;
    if (stored?.fingerprint === fingerprint && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(stored.id)) memory = stored;
  } catch { /* In-memory retries still work when browser storage is unavailable. */ }
  if (memory?.fingerprint === fingerprint) return memory.id;
  memory = { fingerprint, id: crypto.randomUUID() };
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(memory)); } catch { /* memory fallback */ }
  return memory.id;
}

/** Only clear after verified completion or an explicit expired/changed-attempt response. */
export function clearCheckoutAttempt(): void {
  memory = null;
  try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* storage unavailable */ }
}
