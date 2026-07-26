// Shared helpers for auth + SSRF protection on edge functions.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

export function jsonResponse(body: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

/**
 * Verify the caller is authenticated. Returns { user, userClient } or null.
 */
export async function requireUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user) return null;
  return { user: data.user, userClient, token: authHeader.substring(7) };
}

export function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function isAdmin(userId: string): Promise<boolean> {
  const admin = adminClient();
  const { data } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (data) return true;
  const { data: u } = await admin.auth.admin.getUserById(userId);
  return u?.user?.email === "tap@tapaway.co";
}

/**
 * Reject URLs that would trigger SSRF: non-https, private/loopback/link-local hosts,
 * or hostnames with embedded credentials. Optional allow-list for hostname suffixes.
 */
export function isSafeExternalUrl(raw: string, opts?: { allowHttp?: boolean; allowHosts?: string[] }): boolean {
  let u: URL;
  try { u = new URL(raw); } catch { return false; }
  if (u.protocol !== "https:" && !(opts?.allowHttp && u.protocol === "http:")) return false;
  if (u.username || u.password) return false;
  const host = u.hostname.toLowerCase();
  if (!host) return false;

  // Block obvious loopback / link-local / private literals
  const blockedExact = new Set([
    "localhost", "ip6-localhost", "ip6-loopback",
    "metadata.google.internal", "metadata.goog",
  ]);
  if (blockedExact.has(host)) return false;

  // IPv4 literal check
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [parseInt(ipv4[1]), parseInt(ipv4[2])];
    if (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224 // multicast / reserved
    ) return false;
  }
  // IPv6 literal check — reject anything with a colon (link-local, ULA, loopback)
  if (host.includes(":")) return false;

  if (opts?.allowHosts && opts.allowHosts.length > 0) {
    const ok = opts.allowHosts.some((h) => host === h || host.endsWith("." + h));
    if (!ok) return false;
  }
  return true;
}
