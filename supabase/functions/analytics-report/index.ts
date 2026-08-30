import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Body = {
  action?: string;
  hubId?: string;
  since?: string;
  until?: string;
};

function parseDate(v: unknown): string | null {
  if (typeof v !== "string" || !v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // --- 1. Verify the caller's JWT with a user-scoped client -----------------
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  const callerUserId = userData?.user?.id;
  if (userErr || !callerUserId) return json({ error: "Unauthorized" }, 401);

  // --- 2. Isolated service-role client (never sees the caller's header) -----
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const action = typeof body.action === "string" ? body.action : "";
  const since = parseDate(body.since);
  const until = parseDate(body.until);
  const hubId = typeof body.hubId === "string" && UUID_RE.test(body.hubId) ? body.hubId : null;

  const { data: cfg } = await admin
    .from("analytics_config")
    .select("cutover_at, meta_enabled, meta_test_mode, last_retention_run_at")
    .maybeSingle();
  const cutoverAt: string | null = cfg?.cutover_at ?? null;

  // Session labelling per the approved methodology.
  const sessionLabel = (() => {
    if (!cutoverAt) return "Estimated sessions";
    const c = new Date(cutoverAt).getTime();
    const s = since ? new Date(since).getTime() : 0;
    const u = until ? new Date(until).getTime() : Date.now();
    if (s >= c) return "Verified sessions";
    if (u <= c) return "Estimated sessions";
    return "Estimated total sessions";
  })();
  const methodology =
    sessionLabel === "Estimated total sessions"
      ? "This range spans the analytics cutover. Sessions before the cutover are a heuristic estimate from legacy events (no session identifiers were recorded); sessions after it are distinct verified session IDs. The two are shown separately and are never summed as an exact figure."
      : sessionLabel === "Estimated sessions"
        ? "Legacy period: no session identifiers were recorded, so sessions are a heuristic estimate from device/referrer/time grouping."
        : "Distinct verified session IDs counted across the full requested range (daily uniques are never summed).";

  const meta = { cutoverAt, sessionLabel, methodology };

  try {
    if (action === "overview") {
      const { data, error } = await admin.rpc("admin_overview", {
        _caller_user_id: callerUserId,
        _since: since,
        _until: until,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return json({ error: "Forbidden" }, 403);
      return json({ meta, overview: row });
    }

    if (action === "hub_table") {
      const { data, error } = await admin.rpc("admin_hub_table", {
        _caller_user_id: callerUserId,
        _since: since,
        _until: until,
      });
      if (error) throw error;
      const rows = (data ?? []) as Array<{ hub_id: string; hub_kind: string | null }>;
      if (!rows.length) return json({ meta, hubs: [] });

      const ids = rows.map((r) => r.hub_id);
      const [{ data: profiles }, { data: restaurants }] = await Promise.all([
        admin.from("personal_profiles").select("id, username, full_name").in("id", ids),
        admin.from("restaurants").select("id, custom_slug, restaurant_name").in("id", ids),
      ]);
      const labels = new Map<string, { slug: string | null; name: string | null }>();
      (profiles ?? []).forEach((p) =>
        labels.set(p.id, { slug: p.username, name: p.full_name }),
      );
      (restaurants ?? []).forEach((r) =>
        labels.set(r.id, { slug: r.custom_slug, name: r.restaurant_name }),
      );

      return json({
        meta,
        hubs: rows.map((r) => ({
          ...r,
          slug: labels.get(r.hub_id)?.slug ?? null,
          name: labels.get(r.hub_id)?.name ?? null,
        })),
      });
    }

    if (action === "hub_summary" || action === "hub_detail") {
      if (!hubId) return json({ error: "hubId required" }, 400);

      const { data: summary, error } = await admin.rpc("hub_analytics_summary", {
        _caller_user_id: callerUserId,
        _hub_id: hubId,
        _since: since,
        _until: until,
      });
      if (error) throw error;

      // The private function returns zero rows for an unauthorised caller.
      // Distinguish "not authorised" from "authorised but no traffic".
      const { data: authz } = await admin.rpc("hub_sources", {
        _caller_user_id: callerUserId,
        _hub_id: hubId,
        _since: since,
        _until: until,
      });

      if ((summary ?? []).length === 0 && (authz ?? []).length === 0) {
        const [{ count: ownsProfile }, { count: ownsRestaurant }, { data: isAdmin }] =
          await Promise.all([
            admin
              .from("personal_profiles")
              .select("id", { count: "exact", head: true })
              .eq("id", hubId)
              .eq("user_id", callerUserId),
            admin
              .from("restaurants")
              .select("id", { count: "exact", head: true })
              .eq("id", hubId)
              .eq("owner_id", callerUserId),
            admin.rpc("has_role", { _user_id: callerUserId, _role: "admin" }),
          ]);
        if (!ownsProfile && !ownsRestaurant && !isAdmin) {
          return json({ error: "Forbidden" }, 403);
        }
      }

      if (action === "hub_summary") return json({ meta, events: summary ?? [] });
      return json({ meta, events: summary ?? [], sources: authz ?? [] });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("analytics-report failure", (e as Error)?.message);
    return json({ error: "Report failed" }, 500);
  }
});
