import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, profileId } = await req.json();
    console.log("[manage-personal-subscription] Action:", action, "ProfileId:", profileId);

    if (!profileId) {
      throw new Error("profileId is required");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get the profile
    const { data: profile, error: profileError } = await supabase
      .from("personal_profiles")
      .select("*")
      .eq("id", profileId)
      .single();

    if (profileError || !profile) {
      console.error("[manage-personal-subscription] Profile error:", profileError);
      throw new Error("Profile not found");
    }

    // Handle portal action - redirect to Stripe billing portal
    if (action === "portal") {
      if (!profile.stripe_customer_id) {
        throw new Error("No Stripe customer found");
      }

      const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
        apiVersion: "2023-10-16",
      });

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: profile.stripe_customer_id,
        return_url: `${req.headers.get("origin")}/personal/dashboard`,
      });

      return new Response(
        JSON.stringify({ url: portalSession.url }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle downgrade action
    if (action === "downgrade") {
      console.log("[manage-personal-subscription] Processing downgrade for:", profile.email);

      // Cancel Stripe subscription if exists
      if (profile.stripe_subscription_id) {
        const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
          apiVersion: "2023-10-16",
        });

        try {
          await stripe.subscriptions.cancel(profile.stripe_subscription_id);
          console.log("[manage-personal-subscription] Stripe subscription cancelled");
        } catch (stripeError) {
          console.error("[manage-personal-subscription] Stripe cancel error:", stripeError);
          // Continue even if Stripe fails - subscription might already be cancelled
        }
      }

      // Archive premium blocks (photo_collage, email_capture)
      const { error: blocksError } = await supabase
        .from("personal_blocks")
        .update({ is_archived: true })
        .eq("profile_id", profileId)
        .in("block_type", ["photo_collage", "email_capture"]);

      if (blocksError) {
        console.error("[manage-personal-subscription] Error archiving blocks:", blocksError);
      }

      // Get all active links and archive those beyond first 5
      const { data: links, error: linksError } = await supabase
        .from("personal_links")
        .select("id")
        .eq("profile_id", profileId)
        .eq("is_archived", false)
        .order("sort_order", { ascending: true });

      if (linksError) {
        console.error("[manage-personal-subscription] Error fetching links:", linksError);
      }

      if (links && links.length > 5) {
        const linksToArchive = links.slice(5).map((l) => l.id);
        const { error: archiveLinksError } = await supabase
          .from("personal_links")
          .update({ is_archived: true })
          .in("id", linksToArchive);

        if (archiveLinksError) {
          console.error("[manage-personal-subscription] Error archiving links:", archiveLinksError);
        }
        console.log("[manage-personal-subscription] Archived", linksToArchive.length, "links");
      }

      // Archive custom header if exists
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
        console.log("[manage-personal-subscription] Archived custom header");
      }

      const { error: updateError } = await supabase
        .from("personal_profiles")
        .update(updateData)
        .eq("id", profileId);

      if (updateError) {
        console.error("[manage-personal-subscription] Error updating profile:", updateError);
        throw new Error("Failed to update profile");
      }

      console.log("[manage-personal-subscription] Downgrade complete for:", profile.email);

      return new Response(
        JSON.stringify({ success: true, message: "Successfully downgraded to free plan" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Invalid action");
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[manage-personal-subscription] Error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
