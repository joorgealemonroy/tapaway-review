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

const TIMEOUT_MS = 8000;
const BATCH_SIZE = 12;

interface LinkTarget {
  hub_id: string;
  kind: "personal" | "restaurant";
  slug: string | null;
  label: string | null;
  url: string;
}

interface CheckRow extends LinkTarget {
  status: "ok" | "broken" | "malformed" | "unknown";
  http_status: number | null;
  detail: string | null;
  checked_at: string;
}

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

/** Only http(s) links are network-checkable. */
function normalizeUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!/^https?:\/\//i.test(trimmed)) return null;
  return trimmed;
}

async function probe(url: string): Promise<{ status: CheckRow["status"]; http_status: number | null; detail: string | null }> {
  if (isMalformed(url)) {
    return { status: "malformed", http_status: null, detail: "URL looks like a broken legacy social link" };
  }

  const attempt = async (method: "HEAD" | "GET") => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      return await fetch(url, {
        method,
        redirect: "follow",
        headers: FETCH_HEADERS,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    let res = await attempt("HEAD");
    if (res.status === 405 || res.status === 403 || res.status === 404 || res.status === 501) {
      // Many sites reject HEAD outright — retry with GET before calling it broken.
      try {
        res = await attempt("GET");
      } catch {
        /* keep HEAD result */
      }
    }
    if (res.status >= 200 && res.status < 400) {
      return { status: "ok", http_status: res.status, detail: null };
    }
    return { status: "broken", http_status: res.status, detail: `HTTP ${res.status}` };
  } catch (e) {
    const message = e instanceof Error ? e.message : "request failed";
    const timedOut = message.toLowerCase().includes("abort");
    return {
      status: "broken",
      http_status: null,
      detail: timedOut ? `No response within ${TIMEOUT_MS / 1000}s` : message.slice(0, 160),
    };
  }
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

    // ---- Probe in batches -------------------------------------------------
    const rows: CheckRow[] = [];
    for (let i = 0; i < queue.length; i += BATCH_SIZE) {
      const batch = queue.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(batch.map((t) => probe(t.url)));
      batch.forEach((t, idx) => {
        rows.push({ ...t, ...results[idx], checked_at: new Date().toISOString() });
      });
    }

    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await supabase
        .from("hub_link_checks")
        .upsert(rows.slice(i, i + 200), { onConflict: "hub_id,url" });
      if (error) console.error("upsert error", error);
    }

    // Drop rows for links that no longer exist on any hub.
    const keep = new Set(rows.map((r) => `${r.hub_id}|${r.url}`));
    const { data: existing } = await supabase.from("hub_link_checks").select("id, hub_id, url");
    const stale = (existing || []).filter((e) => !keep.has(`${e.hub_id}|${e.url}`)).map((e) => e.id);
    for (let i = 0; i < stale.length; i += 200) {
      await supabase.from("hub_link_checks").delete().in("id", stale.slice(i, i + 200));
    }

    const broken = rows.filter((r) => r.status !== "ok");
    return new Response(
      JSON.stringify({
        success: true,
        checked: rows.length,
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
