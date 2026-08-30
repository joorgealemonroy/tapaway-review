// Hardened analytics ingest. The ONLY write path into public.analytics_hits.
// Browsers never touch the table directly and never see service-role creds.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getRateLimitKey } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ---- Event-name allowlist -------------------------------------------------
const ALLOWED_EVENTS = new Set([
  "page_view",
  "hub_view",
  "session_start",
  "page_exit",
  "scroll_depth",
  "cta_click",
  "link_click",
  "review_click",
  "social_click",
  "menu_view",
  "directions_click",
  "call_click",
  "text_click",
  "website_click",
  "contact_save",
  "lead_submit",
  "checkout_start",
  "purchase",
]);

const MAX_BODY_BYTES = 8 * 1024;
const MAX_STR = 500;
const DEDUPE_WINDOW_MS = 30_000;

// Origins allowed to send events. Anything else is still accepted but
// classified, never silently trusted as production human traffic.
const PROD_HOSTS = ["tapaway.co", "www.tapaway.co", "tapaway-review.lovable.app"];
const PREVIEW_HOST_PATTERNS = [/\.lovable\.app$/i, /\.lovableproject\.com$/i];
const DEV_HOST_PATTERNS = [/^localhost$/i, /^127\.0\.0\.1$/, /^\[?::1\]?$/, /\.local$/i];

const BOT_UA =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|facebot|whatsapp|telegrambot|discordbot|slackbot|twitterbot|linkedinbot|embedly|quora link preview|pinterest|redditbot|applebot|petalbot|yandex|duckduckbot|ahrefs|semrush|mj12|dotbot|headless|phantomjs|puppeteer|playwright|python-requests|curl\/|wget|go-http-client|okhttp|axios|node-fetch|monitor|uptime|pingdom|statuscake|newrelic|datadog|lighthouse|gtmetrix|checkly/i;

function str(v: unknown, max = MAX_STR): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  return s.slice(0, max);
}
function uuidish(v: unknown): string | null {
  const s = str(v, 100);
  if (!s) return null;
  return /^[A-Za-z0-9_-]{8,100}$/.test(s) ? s : null;
}
function isUuid(v: unknown): string | null {
  const s = str(v, 40);
  if (!s) return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s) ? s : null;
}
function intIn(v: unknown, min: number, max: number): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  const n = Math.round(v);
  return n < min || n > max ? null : n;
}
function hostOf(raw: string | null): string | null {
  if (!raw) return null;
  try {
    return new URL(raw).hostname.toLowerCase();
  } catch {
    return null;
  }
}
/** Strip query + fragment: no query parameters are ever persisted. */
function cleanPath(raw: string | null): string | null {
  if (!raw) return null;
  const noHash = raw.split("#")[0].split("?")[0];
  return noHash.slice(0, MAX_STR) || "/";
}

function deviceCategory(ua: string): string {
  if (/ipad|tablet|playbook|silk/i.test(ua)) return "tablet";
  if (/mobi|iphone|android.*mobile|windows phone/i.test(ua)) return "mobile";
  return "desktop";
}
function osOf(ua: string): string {
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
  if (/android/i.test(ua)) return "Android";
  if (/mac os x/i.test(ua)) return "macOS";
  if (/windows/i.test(ua)) return "Windows";
  if (/linux/i.test(ua)) return "Linux";
  return "Other";
}
function browserOf(ua: string): string {
  if (/edg\//i.test(ua)) return "Edge";
  if (/opr\/|opera/i.test(ua)) return "Opera";
  if (/chrome\//i.test(ua) && !/chromium/i.test(ua)) return "Chrome";
  if (/firefox\//i.test(ua)) return "Firefox";
  if (/safari\//i.test(ua)) return "Safari";
  return "Other";
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Daily rotating salt, backend-only table, purged after 14 days. */
async function currentSalt(admin: ReturnType<typeof createClient>): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await admin
    .from("analytics_ip_salt")
    .select("salt")
    .eq("salt_date", today)
    .maybeSingle();
  if (data?.salt) return data.salt as string;
  const salt = crypto.randomUUID() + crypto.randomUUID();
  await admin.from("analytics_ip_salt").upsert({ salt_date: today, salt }, { onConflict: "salt_date" });
  const { data: after } = await admin
    .from("analytics_ip_salt")
    .select("salt")
    .eq("salt_date", today)
    .maybeSingle();
  return (after?.salt as string) ?? salt;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // ---- payload size limit -------------------------------------------
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) {
      return new Response(JSON.stringify({ error: "Payload too large" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(raw);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- strict validation --------------------------------------------
    const eventId = uuidish(body.event_id);
    const eventName = str(body.event_name, 60);
    const sessionId = uuidish(body.session_id);
    if (!eventId || !eventName || !sessionId || !ALLOWED_EVENTS.has(eventName)) {
      return new Response(JSON.stringify({ error: "Invalid event payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- rate limiting (per IP, per session) ---------------------------
    if (!checkRateLimit(getRateLimitKey(req, "track"), 300, 60_000)) {
      return new Response(JSON.stringify({ error: "Rate limited" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!checkRateLimit(`session:${sessionId}`, 120, 60_000)) {
      return new Response(JSON.stringify({ error: "Rate limited" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- origin classification -----------------------------------------
    const originHost = hostOf(req.headers.get("origin")) ?? hostOf(req.headers.get("referer"));
    const ua = req.headers.get("user-agent") ?? "";
    let trafficClass = "human";
    let reason: string | null = null;

    if (originHost && DEV_HOST_PATTERNS.some((r) => r.test(originHost))) {
      trafficClass = "dev";
      reason = "localhost/dev origin";
    } else if (originHost && PREVIEW_HOST_PATTERNS.some((r) => r.test(originHost)) && !PROD_HOSTS.includes(originHost)) {
      trafficClass = "preview";
      reason = "lovable preview origin";
    } else if (originHost && !PROD_HOSTS.includes(originHost)) {
      trafficClass = "bot";
      reason = "unrecognized origin";
    }

    if (trafficClass === "human" && (!ua || BOT_UA.test(ua))) {
      trafficClass = "bot";
      reason = ua ? "bot user agent" : "missing user agent";
    }
    if (trafficClass === "human" && body.internal === true) {
      trafficClass = "internal";
      reason = "authenticated tapaway staff";
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // ---- short-window dedupe (remounts, retries, refresh double-fires) ---
    const path = cleanPath(str(body.path));
    const { data: recent } = await admin
      .from("analytics_hits")
      .select("id")
      .eq("session_id", sessionId)
      .eq("event_name", eventName)
      .eq("path", path ?? "/")
      .gte("occurred_at", new Date(Date.now() - DEDUPE_WINDOW_MS).toISOString())
      .limit(1);
    if (recent && recent.length > 0) {
      return new Response(JSON.stringify({ ok: true, deduped: "window" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- IP-derived hash: rotating salt, 7-day expiry, never surfaced ----
    const cfg = await admin
      .from("analytics_config")
      .select("ip_hash_retention_days")
      .eq("id", true)
      .maybeSingle();
    const retentionDays = (cfg.data?.ip_hash_retention_days as number) ?? 7;
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
    let ipHash: string | null = null;
    if (ip) {
      const salt = await currentSalt(admin);
      ipHash = await sha256Hex(`${salt}:${ip}`);
    }

    const referrer = str(body.referrer, 300);
    const props = (body.props && typeof body.props === "object" && !Array.isArray(body.props))
      ? JSON.parse(JSON.stringify(body.props).slice(0, 2000).replace(/[^\x20-\x7E{}":,\[\].\-_\/ ]/g, "")) ?? {}
      : {};

    const row = {
      event_id: eventId,
      event_name: eventName,
      session_id: sessionId,
      visitor_id: uuidish(body.visitor_id),
      hub_id: isUuid(body.hub_id),
      hub_kind: ["solo", "business", "site"].includes(String(body.hub_kind)) ? String(body.hub_kind) : null,
      path: path ?? "/",
      entry_path: cleanPath(str(body.entry_path)),
      referrer,
      referrer_host: hostOf(referrer),
      utm_source: str(body.utm_source, 120),
      utm_medium: str(body.utm_medium, 120),
      utm_campaign: str(body.utm_campaign, 120),
      utm_content: str(body.utm_content, 120),
      utm_term: str(body.utm_term, 120),
      campaign_channel: str(body.campaign_channel, 40),
      device_category: deviceCategory(ua),
      os: osOf(ua),
      browser: browserOf(ua),
      country: str(req.headers.get("cf-ipcountry"), 4),
      region: str(req.headers.get("cf-region"), 60),
      traffic_class: trafficClass,
      classification_reason: reason,
      is_validated: trafficClass === "human",
      is_new_visitor: typeof body.is_new_visitor === "boolean" ? body.is_new_visitor : null,
      time_on_page_ms: intIn(body.time_on_page_ms, 0, 24 * 60 * 60 * 1000),
      scroll_depth_pct: intIn(body.scroll_depth_pct, 0, 100),
      consent_analytics: typeof body.consent_analytics === "boolean" ? body.consent_analytics : null,
      consent_advertising: typeof body.consent_advertising === "boolean" ? body.consent_advertising : null,
      props,
      ip_hash: ipHash,
      ip_hash_expires_at: ipHash
        ? new Date(Date.now() + retentionDays * 86_400_000).toISOString()
        : null,
    };

    // ---- idempotency on event_id ---------------------------------------
    const { error } = await admin.from("analytics_hits").insert(row);
    if (error) {
      if (error.code === "23505") {
        return new Response(JSON.stringify({ ok: true, deduped: "event_id" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("track insert failed", error.message);
      return new Response(JSON.stringify({ error: "Insert failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, traffic_class: trafficClass }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("track error", e instanceof Error ? e.message : "unknown");
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
