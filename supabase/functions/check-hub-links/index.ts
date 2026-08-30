import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Admin-only: walks every live hub, collects its outbound links and checks
 * each one server-side (browsers can't, cross-origin). Results are upserted
 * into hub_link_checks keyed on (hub_id, url).
 *
 * Can also run unattended from a scheduled job by passing the service role
 * key as the Authorization bearer token.
 */

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const FETCH_HEADERS = {
  "User-Agent": UA,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

const TIMEOUT_MS = 12000;
const BATCH_SIZE = 10;

/**
 * Detected classification. This is what the checker observed; it never
 * overwrites the admin's persistent `admin_review_state` override.
 *  healthy             2xx/3xx reached, final URL is the same target
 *  redirected          reached, but the final URL differs from the stored one
 *  confirmed_broken    4xx that genuinely means "gone" (404/410) after a GET retry
 *  server_error        5xx from the origin
 *  tls_error           certificate / handshake failure
 *  timeout             no response inside the timeout, after a retry
 *  blocked_unverifiable 401/403/429 or anti-bot walls — says nothing about the link
 */
type Classification =
  | "healthy"
  | "redirected"
  | "confirmed_broken"
  | "server_error"
  | "tls_error"
  | "timeout"
  | "blocked_unverifiable";

interface LinkTarget {
  hub_id: string;
  kind: "personal" | "restaurant";
  slug: string | null;
  label: string | null;
  url: string;
}

interface CheckRow extends LinkTarget {
  status: "ok" | "broken" | "malformed" | "unknown" | "unverified";
  classification: Classification | "malformed";
  http_status: number | null;
  detail: string | null;
  final_url: string | null;
  attempts: number;
  checked_at: string;
}

/**
 * These hosts serve a 403/429 to any server-side request (bot protection) even
 * though the link works perfectly for a real visitor.
 */
const BOT_PROTECTED_HOSTS = [
  "yelp.com",
  "booksy.com",
  "instagram.com",
  "facebook.com",
  "fb.com",
  "linkedin.com",
  "tiktok.com",
  "opentable.com",
  "doordash.com",
  "ubereats.com",
  "grubhub.com",
  "toasttab.com",
  "square.site",
  "squareup.com",
  "clover.com",
  "vagaro.com",
  "resy.com",
  "eventbrite.com",
  "amazon.com",
];

const isBotProtected = (url: string): boolean => {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return BOT_PROTECTED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
};

/** Mirrors src/lib/brokenLinks.ts — malformed legacy social URLs. */
const PLATFORM_DOMAIN_RE =
  /^(?:www\.)?(?:facebook|fb|instagram|tiktok|twitter|x|threads|linkedin|discord|twitch|snapchat|pinterest|telegram|venmo|yelp|t)\.(?:com|net|tv|gg|me)$/i;
const TRUNCATED_SEGMENTS = new Set(["people", "pages", "p", "profile.php", "company", "in", "biz"]);

const pathParts = (url: string): string[] => {
  const withoutScheme = url.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");
  return withoutScheme.split(/[?#]/)[0].split("/").filter(Boolean);
};

function isMalformed(url: string): boolean {
  const parts = pathParts(url);
  if (parts.length > 1 && PLATFORM_DOMAIN_RE.test(parts[parts.length - 1])) return true;
  const handle = parts.length > 1 ? parts.slice(1).join("/") : "";
  return TRUNCATED_SEGMENTS.has(handle.toLowerCase());
}

/**
 * SSRF guard: only public http(s) destinations are probed. Anything pointing at
 * localhost, link-local or RFC1918 space is rejected without a request.
 */
const PRIVATE_HOST_RE =
  /^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?|.*\.local)$/i;

function normalizeUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!/^https?:\/\//i.test(trimmed)) return null;
  try {
    const u = new URL(trimmed);
    if (PRIVATE_HOST_RE.test(u.hostname)) return null;
  } catch {
    return null;
  }
  return trimmed;
}

/** Compares URLs ignoring trailing slash, scheme upgrade and www. */
function sameTarget(a: string, b: string): boolean {
  const norm = (u: string) =>
    u.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/+$/, "").toLowerCase();
  return norm(a) === norm(b);
}

function isTlsError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("certificate") || m.includes("tls") || m.includes("ssl") ||
    m.includes("handshake") || m.includes("cert")
  );
}

async function probe(
  url: string,
): Promise<{ classification: CheckRow["classification"]; http_status: number | null; detail: string | null; final_url: string | null; attempts: number }> {
  if (isMalformed(url)) {
    return {
      classification: "malformed",
      http_status: null,
      detail: "URL looks like a broken legacy social link",
      final_url: null,
      attempts: 0,
    };
  }

  let attempts = 0;
  const attempt = async (method: "HEAD" | "GET") => {
    attempts++;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      // redirect: "follow" only follows http(s); the SSRF guard above already
      // rejected private destinations for the initial hop.
      return await fetch(url, { method, redirect: "follow", headers: FETCH_HEADERS, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  };

  let lastError = "";
  for (let round = 0; round < 2; round++) {
    try {
      let res = await attempt(round === 0 ? "HEAD" : "GET");
      if (res.status === 405 || res.status === 403 || res.status === 404 || res.status === 501 || res.status === 429) {
        // Many origins reject HEAD outright — always confirm with a GET.
        try {
          res = await attempt("GET");
        } catch {
          /* keep the HEAD result */
        }
      }
      const finalUrl = res.url || url;

      if (res.status >= 200 && res.status < 400) {
        if (!sameTarget(url, finalUrl)) {
          return {
            classification: "redirected",
            http_status: res.status,
            detail: `Redirects to ${finalUrl.slice(0, 160)}`,
            final_url: finalUrl,
            attempts,
          };
        }
        return { classification: "healthy", http_status: res.status, detail: null, final_url: finalUrl, attempts };
      }

      // Never call an auth/anti-bot wall a broken link.
      if (res.status === 401 || res.status === 403 || res.status === 429) {
        return {
          classification: "blocked_unverifiable",
          http_status: res.status,
          detail: isBotProtected(url)
            ? "Host blocks automated checks — verify manually"
            : `HTTP ${res.status} to automated checks — not proof the link is broken`,
          final_url: finalUrl,
          attempts,
        };
      }

      if (res.status >= 500) {
        return {
          classification: "server_error",
          http_status: res.status,
          detail: `Origin returned HTTP ${res.status}`,
          final_url: finalUrl,
          attempts,
        };
      }

      if (res.status === 404 || res.status === 410) {
        return {
          classification: "confirmed_broken",
          http_status: res.status,
          detail: `HTTP ${res.status}`,
          final_url: finalUrl,
          attempts,
        };
      }

      return {
        classification: "blocked_unverifiable",
        http_status: res.status,
        detail: `Unexpected HTTP ${res.status}`,
        final_url: finalUrl,
        attempts,
      };
    } catch (e) {
      lastError = e instanceof Error ? e.message : "request failed";
      if (isTlsError(lastError)) {
        return { classification: "tls_error", http_status: null, detail: lastError.slice(0, 160), final_url: null, attempts };
      }
      // Retry once on transport failure/timeout before classifying.
    }
  }

  const timedOut = lastError.toLowerCase().includes("abort");
  return {
    classification: timedOut ? "timeout" : "confirmed_broken",
    http_status: null,
    detail: timedOut
      ? `No response within ${TIMEOUT_MS / 1000}s after ${attempts} attempts`
      : lastError.slice(0, 160) || "Host unreachable",
    final_url: null,
    attempts,
  };
}

/** Legacy status column stays populated so nothing that reads it breaks. */
function legacyStatus(c: CheckRow["classification"]): CheckRow["status"] {
  if (c === "healthy" || c === "redirected") return "ok";
  if (c === "malformed") return "malformed";
  if (c === "blocked_unverifiable") return "unverified";
  return "broken";
}


serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cron jobs authenticate with the service role key; humans must be admins.
    const isServiceCall = token === supabaseServiceKey;
    if (!isServiceCall) {
      const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: isAdminResult } = await supabaseUser.rpc("is_admin");
      if (!isAdminResult) {
        return new Response(JSON.stringify({ error: "Admin access required" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ---- Collect targets -------------------------------------------------
    const targets: LinkTarget[] = [];

    const { data: profiles } = await supabase
      .from("personal_profiles")
      .select("id, username, subscription_status, is_approved, contact_website")
      .or("subscription_status.eq.active,and(subscription_status.eq.trialing,is_approved.eq.true)");

    const profileIds = (profiles || []).map((p) => p.id);
    const slugById = new Map((profiles || []).map((p) => [p.id, p.username as string | null]));

    for (const p of profiles || []) {
      const site = normalizeUrl(p.contact_website as string | null);
      if (site) {
        targets.push({ hub_id: p.id, kind: "personal", slug: p.username, label: "Contact website", url: site });
      }
    }

    if (profileIds.length) {
      // Chunk the IN filter so the URL stays a sane length.
      for (let i = 0; i < profileIds.length; i += 50) {
        const slice = profileIds.slice(i, i + 50);
        const { data: links } = await supabase
          .from("personal_links")
          .select("profile_id, url, label, link_type, is_active, is_archived")
          .in("profile_id", slice);
        for (const l of links || []) {
          if (l.is_active === false || l.is_archived === true) continue;
          const url = normalizeUrl(l.url as string | null);
          if (!url) continue;
          targets.push({
            hub_id: l.profile_id as string,
            kind: "personal",
            slug: slugById.get(l.profile_id as string) ?? null,
            label: (l.label as string) || (l.link_type as string) || "Link",
            url,
          });
        }
      }
    }

    const { data: restaurants } = await supabase
      .from("restaurants")
      .select("id, custom_slug, is_approved, google_review_url, yelp_review_url, directions_url, instagram_url, website_url, meal_order_url")
      .eq("is_approved", true);

    for (const r of restaurants || []) {
      const fields: Array<[string, unknown]> = [
        ["Google review", r.google_review_url],
        ["Yelp", r.yelp_review_url],
        ["Directions", r.directions_url],
        ["Instagram", r.instagram_url],
        ["Website", r.website_url],
        ["Order online", r.meal_order_url],
      ];
      for (const [label, value] of fields) {
        const url = normalizeUrl(value as string | null);
        if (!url) continue;
        targets.push({ hub_id: r.id as string, kind: "restaurant", slug: r.custom_slug as string | null, label, url });
      }
    }

    // De-duplicate on (hub_id, url) so the upsert never conflicts with itself.
    const unique = new Map<string, LinkTarget>();
    for (const t of targets) unique.set(`${t.hub_id}|${t.url}`, t);
    const queue = [...unique.values()];

    // ---- Record the run ---------------------------------------------------
    const { data: runRow } = await supabase
      .from("link_check_runs")
      .insert({ status: "running", links_total: queue.length })
      .select("id")
      .single();
    const runId = runRow?.id as string | undefined;

    // ---- Probe in batches -------------------------------------------------
    const rows: CheckRow[] = [];
    for (let i = 0; i < queue.length; i += BATCH_SIZE) {
      const batch = queue.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(batch.map((t) => probe(t.url)));
      batch.forEach((t, idx) => {
        const r = results[idx];
        rows.push({
          ...t,
          classification: r.classification,
          status: legacyStatus(r.classification),
          http_status: r.http_status,
          detail: r.detail,
          final_url: r.final_url,
          attempts: r.attempts,
          checked_at: new Date().toISOString(),
        });
      });
      if (runId && i % (BATCH_SIZE * 5) === 0) {
        await supabase.from("link_check_runs").update({ links_checked: rows.length }).eq("id", runId);
      }
    }

    // The admin's persistent false-positive/acknowledged override is never
    // touched here — the upsert only writes detected fields.
    let upsertError: string | null = null;
    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await supabase
        .from("hub_link_checks")
        .upsert(rows.slice(i, i + 200), { onConflict: "hub_id,url" });
      if (error) {
        upsertError = error.message;
        console.error("upsert error", error);
      }
    }

    // Drop rows for links that no longer exist on any hub.
    const keep = new Set(rows.map((r) => `${r.hub_id}|${r.url}`));
    const { data: existing } = await supabase.from("hub_link_checks").select("id, hub_id, url");
    const stale = (existing || []).filter((e) => !keep.has(`${e.hub_id}|${e.url}`)).map((e) => e.id);
    for (let i = 0; i < stale.length; i += 200) {
      await supabase.from("hub_link_checks").delete().in("id", stale.slice(i, i + 200));
    }

    const count = (c: string) => rows.filter((r) => r.classification === c).length;
    const breakdown = {
      healthy: count("healthy"),
      redirected: count("redirected"),
      confirmed_broken: count("confirmed_broken"),
      server_error: count("server_error"),
      tls_error: count("tls_error"),
      timeout: count("timeout"),
      blocked_unverifiable: count("blocked_unverifiable"),
      malformed: count("malformed"),
    };

    const complete = !upsertError && rows.length === queue.length;
    if (runId) {
      await supabase
        .from("link_check_runs")
        .update({
          finished_at: new Date().toISOString(),
          status: complete ? "complete" : "failed",
          is_complete: complete,
          links_checked: rows.length,
          hubs_checked: new Set(rows.map((r) => r.hub_id)).size,
          error: upsertError,
        })
        .eq("id", runId);
    }

    // Only genuinely-broken classes count as broken. 401/403/429 never do.
    const broken = rows.filter(
      (r) => r.classification === "confirmed_broken" || r.classification === "malformed",
    );
    return new Response(
      JSON.stringify({
        success: true,
        run_id: runId,
        is_complete: complete,
        checked: rows.length,
        total: queue.length,
        breakdown,
        broken: broken.length,
        hubs_with_broken: new Set(broken.map((b) => b.hub_id)).size,
        removed_stale: stale.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

  } catch (error) {
    console.error("check-hub-links error", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
