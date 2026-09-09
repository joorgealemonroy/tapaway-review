// Admin billing summary — the single source of truth for MRR.
// Sums REAL Stripe recurring revenue (active + trialing + past_due
// subscriptions), so grandfathered and yearly plans are counted at their
// actual billed amounts. Also returns past-due invoices and trials ending
// soon for the command-center "needs action" list.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
    if (!stripeKey) return json({ error: "Stripe not configured" }, 500);

    const admin = createClient(supabaseUrl, serviceKey);

    // Caller must be an admin.
    const authHeader = req.headers.get("authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    let callerId: string | null = null;
    if (jwt) {
      const { data } = await admin.auth.getUser(jwt);
      callerId = data?.user?.id ?? null;
    }
    if (!callerId) return json({ error: "Unauthorized" }, 401);
    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: callerId,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

    // Walk all live subscriptions (active, trialing, past_due).
    let mrrCents = 0;
    let activeCount = 0;
    let trialingCount = 0;
    let pastDueCount = 0;
    const pastDue: Array<{
      email: string;
      name: string;
      amount_due_cents: number;
      subscription_id: string;
      account_id: string | null;
      kind: "personal" | "restaurant" | null;
    }> = [];
    const seenPastDueSubs = new Set<string>();

    let startingAfter: string | undefined;
    for (;;) {
      const page: Stripe.ApiList<Stripe.Subscription> = await stripe.subscriptions.list({
        status: "all",
        limit: 100,
        starting_after: startingAfter,
        expand: ["data.customer"],
      });
      for (const sub of page.data) {
        if (!["active", "trialing", "past_due"].includes(sub.status)) continue;
        let subMrr = 0;
        for (const item of sub.items.data) {
          const price = item.price;
          const unit = price.unit_amount ?? 0;
          const qty = item.quantity ?? 1;
          if (price.recurring?.interval === "month") subMrr += unit * qty;
          else if (price.recurring?.interval === "year") subMrr += Math.round((unit * qty) / 12);
          else if (price.recurring?.interval === "week") subMrr += Math.round(unit * qty * 4.33);
        }
        mrrCents += subMrr;
        if (sub.status === "active") activeCount++;
        if (sub.status === "trialing") trialingCount++;
        if (sub.status === "past_due") {
          pastDueCount++;
          if (!seenPastDueSubs.has(sub.id)) {
            seenPastDueSubs.add(sub.id);
            const cust = sub.customer as Stripe.Customer | null;
            const customerId = typeof cust === "string" ? cust : cust?.id ?? "";
            // Map the Stripe customer to a TapAway account for the nudge action.
            let profileId: string | null = null;
            let kind: "personal" | "restaurant" | null = null;
            if (customerId) {
              const { data: pp } = await admin
                .from("personal_profiles")
                .select("id")
                .eq("stripe_customer_id", customerId)
                .maybeSingle();
              if (pp) {
                profileId = pp.id as string;
                kind = "personal";
              } else {
                const { data: rr } = await admin
                  .from("restaurants")
                  .select("id")
                  .eq("stripe_customer_id", customerId)
                  .maybeSingle();
                if (rr) {
                  profileId = rr.id as string;
                  kind = "restaurant";
                }
              }
            }
            pastDue.push({
              email: typeof cust !== "string" ? cust?.email ?? "" : "",
              name: typeof cust !== "string" ? cust?.name ?? "" : "",
              amount_due_cents: subMrr,
              subscription_id: sub.id,
              account_id: profileId,
              kind,
            });
          }
        }
      }
      if (!page.has_more || !page.data.length) break;
      startingAfter = page.data[page.data.length - 1].id;
    }

    // Trials ending in the next 3 days (DB — these are TapAway profiles).
    const threeDaysOut = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const { data: trialsEnding } = await admin
      .from("personal_profiles")
      .select("id, username, full_name, contact_name, trial_ends_at")
      .eq("subscription_status", "trialing")
      .lte("trial_ends_at", threeDaysOut)
      .order("trial_ends_at", { ascending: true })
      .limit(20);

    return json({
      mrr_cents: mrrCents,
      active_count: activeCount,
      trialing_count: trialingCount,
      past_due_count: pastDueCount,
      past_due: pastDue.slice(0, 20),
      trials_ending: (trialsEnding ?? []).map((t: Record<string, unknown>) => ({
        profile_id: t.id,
        username: t.username,
        name: t.full_name || t.contact_name || t.username,
        ends_at: t.trial_ends_at,
      })),
    });
  } catch (err) {
    console.error("[admin-billing-summary]", err);
    return json({ error: err instanceof Error ? err.message : "Failed" }, 500);
  }
});
