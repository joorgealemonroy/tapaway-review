import { admin } from "./paymentFirst.ts";
export async function hashValue(value: string) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(bytes), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
export async function takeQuota(
  req: Request,
  scope: string,
  limit: number,
  visitor?: string,
) {
  const ip =
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (!ip && !visitor) throw new Error("Rate limit identity unavailable");
  const salt =
    Deno.env.get("STOREFRONT_RATE_LIMIT_SALT") ||
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!salt) throw new Error("Rate limit not configured");
  const day = new Date().toISOString().slice(0, 10);
  const key = await hashValue(`${salt}:${day}:${scope}:${visitor || ip}`);
  const { data, error } = await admin().rpc("storefront_take_quota", {
    _key: key,
    _limit: limit,
  });
  if (error) throw error; // Fail closed if the durable limiter is unavailable.
  return typeof data === "number" ? data : -1;
}
