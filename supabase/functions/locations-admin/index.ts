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

const PAYMENT_STATES = [
  "paying",
  "complimentary",
  "trialing",
  "past_due",
  "canceled",
  "none",
  "unknown_manual",
] as const;
const BILLING_INTERVALS = ["monthly", "annual", "one_time", "custom", "none", "unknown"] as const;
const BILLING_SOURCES = [
  "stripe_subscription",
  "stripe_payment",
  "manual_invoice",
  "cash",
  "complimentary",
  "legacy_manual",
  "unknown",
] as const;
const VISIT_OUTCOMES = [
  "visited",
  "closed",
  "spoke_with_owner",
  "follow_up",
  "converted",
  "not_interested",
] as const;

const str = (v: unknown, max = 2000) =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;

const dateOrNull = (v: unknown) => {
  if (typeof v !== "string" || !v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  const callerUserId = userData?.user?.id;
  if (userErr || !callerUserId) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Admin-only surface. Authorization is derived server side from the verified JWT.
  const { data: isAdmin } = await admin.rpc("has_role", {
    _user_id: callerUserId,
    _role: "admin",
  });
  let allowed = isAdmin === true;
  if (!allowed) {
    const email = userData?.user?.email?.toLowerCase() ?? "";
    allowed = email === "tap@tapaway.co";
  }
  if (!allowed) return json({ error: "Forbidden" }, 403);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const action = typeof body.action === "string" ? body.action : "";
  const locationId = typeof body.locationId === "string" && UUID_RE.test(body.locationId)
    ? body.locationId
    : null;

  const SELECT =
    "id, business_id, hub_kind, hub_slug, personal_profile_id, restaurant_id, location_id," +
    " display_name, formatted_address, city, state, postal_code, phone, business_category," +
    " google_place_id, place_status, lat, lng, coordinate_source, coordinates_obtained_at," +
    " coordinates_expires_at, place_id_verified_at, access_status, payment_state," +
    " billing_interval, billing_source, classification_is_manual, status_reason, trial_ends_at," +
    " subscription_status_snapshot, last_payment_at, current_billing_period_end, paid_through_at," +
    " payment_evidence_ref, payment_attention, assigned_rep_id, last_visited_at, next_follow_up_at," +
    " internal_notes, visit_eligible, public_directory_opt_in, needs_review, review_reason," +
    " synced_at, created_at, updated_at";

  try {
    switch (action) {
      case "list": {
        const { data, error } = await admin
          .from("business_locations")
          .select(SELECT)
          .order("display_name", { ascending: true })
          .limit(2000);
        if (error) throw error;
        const { data: cfg } = await admin
          .from("places_api_log")
          .select("created_at, ok, endpoint, error")
          .order("created_at", { ascending: false })
          .limit(25);
        return json({ locations: data ?? [], apiLog: cfg ?? [] });
      }

      case "detail": {
        if (!locationId) return json({ error: "locationId required" }, 400);
        const [loc, history, visits] = await Promise.all([
          admin.from("business_locations").select(SELECT).eq("id", locationId).maybeSingle(),
          admin
            .from("location_status_history")
            .select("id, field, previous_value, new_value, reason, source, actor_user_id, created_at")
            .eq("location_id", locationId)
            .order("created_at", { ascending: false })
            .limit(100),
          admin
            .from("location_visits")
            .select("id, visited_at, outcome, notes, rep_id, actor_user_id")
            .eq("location_id", locationId)
            .order("visited_at", { ascending: false })
            .limit(100),
        ]);
        if (loc.error) throw loc.error;
        if (!loc.data) return json({ error: "Not found" }, 404);
        return json({
          location: loc.data,
          history: history.data ?? [],
          visits: visits.data ?? [],
        });
      }

      // Manual payment classification. Records actor, timestamp, reason and previous value,
      // and never touches hub access, subscriptions or billing records.
      case "classify": {
        if (!locationId) return json({ error: "locationId required" }, 400);
        const paymentState = str(body.paymentState, 40);
        const billingInterval = str(body.billingInterval, 40) ?? "unknown";
        const billingSource = str(body.billingSource, 40) ?? "unknown";
        const reason = str(body.reason, 1000);
        const paidThrough = dateOrNull(body.paidThroughAt);
        const lastPayment = dateOrNull(body.lastPaymentAt);
        const periodEnd = dateOrNull(body.currentBillingPeriodEnd);
        const evidence = str(body.paymentEvidenceRef, 300);

        if (!paymentState || !(PAYMENT_STATES as readonly string[]).includes(paymentState)) {
          return json({ error: "Invalid paymentState" }, 400);
        }
        if (!(BILLING_INTERVALS as readonly string[]).includes(billingInterval)) {
          return json({ error: "Invalid billingInterval" }, 400);
        }
        if (!(BILLING_SOURCES as readonly string[]).includes(billingSource)) {
          return json({ error: "Invalid billingSource" }, 400);
        }
        if (!reason) return json({ error: "A reason is required for manual classification" }, 400);
        if (
          paymentState === "paying" &&
          (billingInterval === "annual" || billingInterval === "one_time") &&
          !paidThrough
        ) {
          return json(
            { error: "Annual and one-time classifications require a paid-through date" },
            400,
          );
        }

        const { data: prev, error: prevErr } = await admin
          .from("business_locations")
          .select("payment_state, billing_interval, billing_source, paid_through_at")
          .eq("id", locationId)
          .maybeSingle();
        if (prevErr) throw prevErr;
        if (!prev) return json({ error: "Not found" }, 404);

        const { error: updErr } = await admin
          .from("business_locations")
          .update({
            payment_state: paymentState,
            billing_interval: billingInterval,
            billing_source: billingSource,
            paid_through_at: paidThrough,
            last_payment_at: lastPayment,
            current_billing_period_end: periodEnd,
            payment_evidence_ref: evidence,
            payment_attention: paymentState === "past_due",
            classification_is_manual: true,
            status_reason: reason,
          })
          .eq("id", locationId);
        if (updErr) throw updErr;

        const rows = [
          { field: "payment_state", previous_value: prev.payment_state, new_value: paymentState },
          {
            field: "billing_interval",
            previous_value: prev.billing_interval,
            new_value: billingInterval,
          },
          { field: "billing_source", previous_value: prev.billing_source, new_value: billingSource },
          {
            field: "paid_through_at",
            previous_value: prev.paid_through_at,
            new_value: paidThrough,
          },
        ].map((r) => ({
          ...r,
          location_id: locationId,
          reason,
          source: "admin_manual",
          actor_user_id: callerUserId,
        }));
        await admin.from("location_status_history").insert(rows);
        return json({ ok: true });
      }

      // Operational fields only — never changes access, billing or the live hub.
      case "update_ops": {
        if (!locationId) return json({ error: "locationId required" }, 400);
        const patch: Record<string, unknown> = {};
        if ("internalNotes" in body) patch.internal_notes = str(body.internalNotes, 4000);
        if ("nextFollowUpAt" in body) patch.next_follow_up_at = dateOrNull(body.nextFollowUpAt);
        if ("visitEligible" in body) patch.visit_eligible = body.visitEligible === true;
        if ("needsReview" in body) patch.needs_review = body.needsReview === true;
        if ("reviewReason" in body) patch.review_reason = str(body.reviewReason, 500);
        if ("displayName" in body) patch.display_name = str(body.displayName, 200);
        if ("formattedAddress" in body) patch.formatted_address = str(body.formattedAddress, 400);
        if ("phone" in body) patch.phone = str(body.phone, 60);
        if (Object.keys(patch).length === 0) return json({ error: "Nothing to update" }, 400);
        const { error } = await admin.from("business_locations").update(patch).eq("id", locationId);
        if (error) throw error;
        return json({ ok: true });
      }

      case "log_visit": {
        if (!locationId) return json({ error: "locationId required" }, 400);
        const outcome = str(body.outcome, 40);
        if (!outcome || !(VISIT_OUTCOMES as readonly string[]).includes(outcome)) {
          return json({ error: "Invalid outcome" }, 400);
        }
        const visitedAt = dateOrNull(body.visitedAt) ?? new Date().toISOString();
        const { error } = await admin.from("location_visits").insert({
          location_id: locationId,
          outcome,
          notes: str(body.notes, 2000),
          visited_at: visitedAt,
          actor_user_id: callerUserId,
        });
        if (error) throw error;
        await admin
          .from("business_locations")
          .update({
            last_visited_at: visitedAt,
            next_follow_up_at: dateOrNull(body.nextFollowUpAt),
          })
          .eq("id", locationId);
        return json({ ok: true });
      }

      // Re-derives access/payment classification from the existing hub records.
      // Reads the hub tables only; manual classifications are preserved.
      case "sync": {
        const { data, error } = await admin.rpc("sync_business_locations_admin");
        if (error) throw error;
        return json({ ok: true, result: data });
      }

      default:
        return json({ error: "Unknown action" }, 400);
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("locations-admin failed:", message);
    return json({ error: "Request failed", details: message }, 500);
  }
});
