// Short-lived signed token that authorises an in-person close presentation
// for one specific solo hub. Payload is readable (the hub id is not a secret);
// the signature is what proves an admin minted it.

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromB64url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const bin = atob(padded);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function hmac(payload: string): Promise<string> {
  const secret = Deno.env.get("HUB_SALES_TOKEN_SECRET");
  if (!secret) throw new Error("HUB_SALES_TOKEN_SECRET not configured");
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return b64url(new Uint8Array(sig));
}

export const HUB_SALES_TOKEN_TTL_SECONDS = 24 * 60 * 60; // 24h — must outlive a sales visit.

/** Mint a token for a hub. Only ever called from an admin-verified path. */
export async function signHubSalesToken(hubId: string, ttlSeconds = HUB_SALES_TOKEN_TTL_SECONDS) {
  const payload = b64url(
    enc.encode(JSON.stringify({ h: hubId, t: "personal_profile", exp: Math.floor(Date.now() / 1000) + ttlSeconds })),
  );
  const sig = await hmac(payload);
  return `${payload}.${sig}`;
}

/** Verify a token. Returns the hub id, or null when invalid/expired. */
export async function verifyHubSalesToken(token: unknown): Promise<string | null> {
  if (typeof token !== "string" || token.length > 800) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;

  let expected: string;
  try {
    expected = await hmac(payload);
  } catch {
    return null;
  }
  if (sig.length !== expected.length) return null;
  // Constant-time-ish comparison.
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff !== 0) return null;

  try {
    const parsed = JSON.parse(new TextDecoder().decode(fromB64url(payload))) as {
      h?: string;
      t?: string;
      exp?: number;
    };
    if (parsed.t !== "personal_profile") return null;
    if (!parsed.h || typeof parsed.exp !== "number") return null;
    if (parsed.exp * 1000 < Date.now()) return null;
    return parsed.h;
  } catch {
    return null;
  }
}

/** Decode without verifying — for logging only. Never use for authorisation. */
export function peekHubSalesToken(token: string): { h?: string; exp?: number } | null {
  try {
    return JSON.parse(new TextDecoder().decode(fromB64url(token.split(".")[0])));
  } catch {
    return null;
  }
}
