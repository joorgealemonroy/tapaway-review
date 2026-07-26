import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { requireUser, adminClient, isAdmin, jsonResponse } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await requireUser(req);
    if (!auth) return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);

    const { action, profileId } = await req.json();
    if (!profileId) return jsonResponse({ error: "profileId required" }, 400, corsHeaders);
    console.log("[manage-personal-subscription] Action:", action, "ProfileId:", profileId, "by:", auth.user.id);

    const supabase = adminClient();

    const { data: profile, error: profileError } = await supabase
      .from("personal_profiles")
      .select("*")
      .eq("id", profileId)
      .single();

    if (profileError || !profile) return jsonResponse({ error: "Profile not found" }, 404, corsHeaders);

    // Ownership check: caller must own the profile or be an admin.
    const callerIsAdmin = await isAdmin(auth.user.id);
    if (profile.user_id !== auth.user.id && !callerIsAdmin) {
      console.warn("[manage-personal-subscription] Forbidden: profile owner mismatch");
      return jsonResponse({ error: "Forbidden" }, 403, corsHeaders);
    }

    // Portal action
    if (action === "portal") {
      if (!profile.stripe_customer_id) throw new Error("No Stripe customer found");

      const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16" });

      if (!profile.stripe_subscription_id && profile.stripe_customer_id) {
        try {
          const subs = await stripe.subscriptions.list({ customer: profile.stripe_customer_id, status: "active", limit: 1 });
          if (subs.data.length > 0) {
            await supabase.from("personal_profiles").update({ stripe_subscription_id: subs.data[0].id }).eq("id", profileId);
          }
        } catch (e) {
          console.error("[manage-personal-subscription] Backfill error (non-fatal):", e);
        }
      }

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: profile.stripe_customer_id,
        return_url: `${req.headers.get("origin") || "https://tapaway.co"}/dashboard`,
      });

      return jsonResponse({ url: portalSession.url }, 200, corsHeaders);
    }

    if (action === "downgrade") {
      if (profile.stripe_subscription_id) {
        const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16" });
        try { await stripe.subscriptions.cancel(profile.stripe_subscription_id); }
        catch (e) { console.error("[manage-personal-subscription] Stripe cancel error:", e); }
      }

      await supabase.from("personal_blocks")
        .update({ is_archived: true })
        .eq("profile_id", profileId)
        .in("block_type", ["photo_collage", "email_capture"]);

      const { data: links } = await supabase
        .from("personal_links")
        .select("id")
        .eq("profile_id", profileId)
        .eq("is_archived", false)
        .order("sort_order", { ascending: true });

      if (links && links.length > 5) {
        const toArchive = links.slice(5).map((l) => l.id);
        await supabase.from("personal_links").update({ is_archived: true }).in("id", toArchive);
      }

      const updateData: Record<string, unknown> = {
        archived_at: new Date().toISOString(),
        plan_type: "free",
        subscription_status: "canceled",
        stripe_subscription_id: null,
      };
      if (profile.header_type === "image" && profile.header_image_url) {
        updateData.archived_header_type = profile.header_type;
        updateData.archived_header_image_url = profile.header_image_url;
        updateData.header_type = "color";
        updateData.header_image_url = null;
      }

      const { error: updateError } = await supabase
        .from("personal_profiles")
        .update(updateData)
        .eq("id", profileId);
      if (updateError) throw new Error("Failed to update profile");

      return jsonResponse({ success: true, message: "Successfully downgraded to free plan" }, 200, corsHeaders);
    }

    return jsonResponse({ error: "Invalid action" }, 400, corsHeaders);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[manage-personal-subscription] Error:", error);
    return jsonResponse({ error: msg }, 400, corsHeaders);
  }
});
