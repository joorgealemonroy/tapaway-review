import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── Tables Muse AI may read ──
const READABLE_TABLES = new Set([
  "restaurants",
  "google_reviews",
  "google_review_snapshots",
  "analytics_events",
  "personal_profiles",
  "pending_trials",
  "trial_nurture_log",
  "support_requests",
  "lead_forms",
  "lead_submissions",
  "email_sends",
  "fulfillment_orders",
  "admin_audit_log",
]);

// ── Restaurant fields Muse AI may write ──
const RESTAURANT_WRITE_FIELDS = new Set([
  "stripe_customer_id",
  "stripe_subscription_id",
  "google_place_id",
]);

const IDENT_RE = /^[a-z][a-z0-9_]{0,62}$/;
const MAX_LIMIT = 1000;

function makeSlug(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").substring(0, 50);
}

function unauthorized() {
  return json({ error: "Invalid or missing API key" }, 401);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const rlKey = getRateLimitKey(req, "muse-ai-bridge");
  if (!checkRateLimit(rlKey, 120, 60 * 1000)) return rateLimitResponse(corsHeaders);

  // ── API key auth ──
  const expectedKey = Deno.env.get("MUSE_AI_API_KEY");
  if (!expectedKey) {
    console.error("[muse-ai-bridge] MUSE_AI_API_KEY secret is not set");
    return json({ error: "Bridge not configured" }, 500);
  }
  const providedKey = req.headers.get("x-api-key") ?? "";
  if (!providedKey || providedKey !== expectedKey) return unauthorized();

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const url = new URL(req.url);
  // Path after the function name, e.g. /tables/restaurants or /restaurants/<id>
  const path = url.pathname.replace(/^\/muse-ai-bridge\/?/, "").replace(/\/$/, "");
  const segments = path.split("/").filter(Boolean);

  try {
    // ── GET /tables/{table} ──
    if (req.method === "GET" && segments[0] === "tables" && segments.length === 2) {
      const table = segments[1];
      if (!READABLE_TABLES.has(table)) {
        return json({ error: `Table '${table}' is not exposed`, allowed: [...READABLE_TABLES] }, 403);
      }

      let query = adminClient.from(table).select("*");

      // limit (default 100, max 1000)
      const limitParam = url.searchParams.get("limit");
      let limit = 100;
      if (limitParam !== null) {
        const parsed = Number(limitParam);
        if (!Number.isInteger(parsed) || parsed < 1) return json({ error: "limit must be a positive integer" }, 400);
        limit = Math.min(parsed, MAX_LIMIT);
      }

      // order=<column>.asc|desc
      const orderParam = url.searchParams.get("order");
      if (orderParam) {
        const [col, dir] = orderParam.split(".");
        if (!IDENT_RE.test(col ?? "") || (dir !== undefined && dir !== "asc" && dir !== "desc")) {
          return json({ error: "Invalid order parameter; expected <column>.asc or <column>.desc" }, 400);
        }
        query = query.order(col, { ascending: dir !== "desc" });
      } else if (table !== "admin_audit_log") {
        // keep a stable default where a created_at column exists
        query = query.order("created_at", { ascending: false });
      }

      // Equality filters: ?eq:<column>=<value>
      for (const [key, value] of url.searchParams.entries()) {
        if (!key.startsWith("eq:")) continue;
        const col = key.slice(3);
        if (!IDENT_RE.test(col)) return json({ error: `Invalid filter column '${col}'` }, 400);
        if (value.length > 500) return json({ error: "Filter value too long" }, 400);
        query = query.eq(col, value);
      }

      query = query.limit(limit);

      const { data, error } = await query;
      if (error) {
        console.error(`[muse-ai-bridge] read ${table} error:`, error);
        return json({ error: "Query failed" }, 500);
      }
      return json({ table, count: data?.length ?? 0, rows: data ?? [] });
    }

    // ── POST /restaurants (create) ──
    if (req.method === "POST" && segments[0] === "restaurants" && segments.length === 1) {
      const body = await req.json().catch(() => null);
      if (!body || typeof body !== "object") return json({ error: "Invalid JSON body" }, 400);

      const { restaurant_name, email, phone, stripe_customer_id, stripe_subscription_id, google_place_id } = body as Record<string, unknown>;

      if (typeof restaurant_name !== "string" || restaurant_name.trim().length < 2 || restaurant_name.length > 120) {
        return json({ error: "restaurant_name is required (2-120 chars)" }, 400);
      }
      if (email !== undefined && (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255)) {
        return json({ error: "email must be a valid email address" }, 400);
      }
      if (phone !== undefined && (typeof phone !== "string" || phone.length > 40)) {
        return json({ error: "phone must be a string up to 40 chars" }, 400);
      }
      if (stripe_customer_id !== undefined && (typeof stripe_customer_id !== "string" || !/^cus_[A-Za-z0-9]+$/.test(stripe_customer_id))) {
        return json({ error: "stripe_customer_id must look like cus_..." }, 400);
      }
      if (stripe_subscription_id !== undefined && (typeof stripe_subscription_id !== "string" || !/^sub_[A-Za-z0-9]+$/.test(stripe_subscription_id))) {
        return json({ error: "stripe_subscription_id must look like sub_..." }, 400);
      }
      if (google_place_id !== undefined && (typeof google_place_id !== "string" || google_place_id.length > 255)) {
        return json({ error: "google_place_id must be a string up to 255 chars" }, 400);
      }

      // Generate a unique slug
      const base = makeSlug(restaurant_name) || "restaurant";
      let slug = base;
      for (let attempt = 0; attempt < 10; attempt++) {
        const { data: clash } = await adminClient.from("restaurants").select("id").eq("custom_slug", slug).maybeSingle();
        if (!clash) break;
        slug = `${base}-${crypto.randomUUID().slice(0, 6)}`;
      }

      const insert: Record<string, unknown> = {
        restaurant_name: restaurant_name.trim(),
        custom_slug: slug,
        subscription_status: "pending_setup",
        onboarding_completed: false,
      };
      if (email) insert.email = email.trim().toLowerCase();
      if (phone) insert.phone = phone.trim();
      if (stripe_customer_id) insert.stripe_customer_id = stripe_customer_id;
      if (stripe_subscription_id) insert.stripe_subscription_id = stripe_subscription_id;
      if (google_place_id) {
        insert.google_place_id = google_place_id.trim();
        insert.google_review_url = `https://search.google.com/local/writereview?placeid=${(google_place_id as string).trim()}`;
      }

      const { data: created, error } = await adminClient.from("restaurants").insert(insert).select("id, custom_slug").single();
      if (error || !created) {
        console.error("[muse-ai-bridge] create restaurant error:", error);
        return json({ error: "Failed to create restaurant" }, 500);
      }

      await auditLog(adminClient, "muse_ai_create_restaurant", created.id, {
        restaurant_name: restaurant_name.trim(),
        email: email ?? null,
        has_stripe_customer: Boolean(stripe_customer_id),
        has_stripe_subscription: Boolean(stripe_subscription_id),
        has_place_id: Boolean(google_place_id),
      });

      return json({ ok: true, id: created.id, custom_slug: created.custom_slug }, 201);
    }

    // ── POST /restaurants/{id} (update) ──
    if (req.method === "POST" && segments[0] === "restaurants" && segments.length === 2) {
      const id = segments[1];
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        return json({ error: "Invalid restaurant id" }, 400);
      }

      const body = await req.json().catch(() => null);
      if (!body || typeof body !== "object") return json({ error: "Invalid JSON body" }, 400);

      const update: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
        if (!RESTAURANT_WRITE_FIELDS.has(key)) {
          return json({ error: `Field '${key}' is not writable`, writable: [...RESTAURANT_WRITE_FIELDS] }, 400);
        }
        if (value === null) {
          update[key] = null;
          continue;
        }
        if (typeof value !== "string" || value.length > 255) {
          return json({ error: `Field '${key}' must be a string up to 255 chars (or null)` }, 400);
        }
        if (key === "stripe_customer_id" && !/^cus_[A-Za-z0-9]+$/.test(value)) {
          return json({ error: "stripe_customer_id must look like cus_..." }, 400);
        }
        if (key === "stripe_subscription_id" && !/^sub_[A-Za-z0-9]+$/.test(value)) {
          return json({ error: "stripe_subscription_id must look like sub_..." }, 400);
        }
        update[key] = value;
      }
      if (Object.keys(update).length === 0) return json({ error: "No writable fields provided" }, 400);

      if (typeof update.google_place_id === "string") {
        update.google_review_url = `https://search.google.com/local/writereview?placeid=${update.google_place_id}`;
      }

      const { data: updated, error } = await adminClient
        .from("restaurants")
        .update(update)
        .eq("id", id)
        .select("id")
        .maybeSingle();
      if (error) {
        console.error("[muse-ai-bridge] update restaurant error:", error);
        return json({ error: "Failed to update restaurant" }, 500);
      }
      if (!updated) return json({ error: "Restaurant not found" }, 404);

      await auditLog(adminClient, "muse_ai_update_restaurant", id, { fields: Object.keys(update) });

      return json({ ok: true, id, updated: Object.keys(update) });
    }

    return json({
      error: "Not found",
      routes: [
        "GET /muse-ai-bridge/tables/{table}?limit=&order=&eq:<col>=<val>",
        "POST /muse-ai-bridge/restaurants",
        "POST /muse-ai-bridge/restaurants/{id}",
      ],
    }, 404);
  } catch (err) {
    console.error("[muse-ai-bridge] unexpected error:", err);
    return json({ error: "Internal error" }, 500);
  }
});

/** Log to admin_audit_log under the super admin identity so the NOT NULL admin_user_id is satisfied. */
async function auditLog(
  adminClient: ReturnType<typeof createClient>,
  action: string,
  targetId: string,
  details: Record<string, unknown>,
) {
  try {
    const { data: adminUser } = await adminClient.rpc("get_auth_user_by_email", { lookup_email: "tap@tapaway.co" });
    const adminId = Array.isArray(adminUser) && adminUser.length > 0 ? adminUser[0].id : null;
    if (!adminId) {
      console.warn("[muse-ai-bridge] audit skipped: super admin user not found");
      return;
    }
    await adminClient.from("admin_audit_log").insert({
      admin_user_id: adminId,
      action,
      target_type: "restaurant",
      target_id: targetId,
      details: { ...details, source: "muse-ai-bridge" },
    });
  } catch (err) {
    console.warn("[muse-ai-bridge] audit log failed:", err);
  }
}
