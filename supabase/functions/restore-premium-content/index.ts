import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rateLimit.ts";
import { requireUser, adminClient, isAdmin, jsonResponse } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const rlKey = getRateLimitKey(req, "restore-premium-content");
  if (!checkRateLimit(rlKey, 10, 60 * 60 * 1000)) return rateLimitResponse(corsHeaders);

  try {
    const { profileId } = await req.json();
    if (!profileId) return jsonResponse({ error: "profileId required" }, 400, corsHeaders);

    // Allow either: (a) service-role internal caller, or (b) authenticated owner/admin.
    const authHeader = req.headers.get("Authorization") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const isInternal = serviceKey.length > 0 && authHeader === `Bearer ${serviceKey}`;

    const supabase = adminClient();

    if (!isInternal) {
      const auth = await requireUser(req);
      if (!auth) return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);
      const { data: p } = await supabase
        .from("personal_profiles")
        .select("user_id, subscription_status")
        .eq("id", profileId)
        .single();
      if (!p) return jsonResponse({ error: "Profile not found" }, 404, corsHeaders);
      const admin = await isAdmin(auth.user.id);
      if (p.user_id !== auth.user.id && !admin) {
        return jsonResponse({ error: "Forbidden" }, 403, corsHeaders);
      }
      // Only restore when profile has an active/paid subscription (prevents paywall bypass)
      if (!admin && p.subscription_status !== "active") {
        return jsonResponse({ error: "Subscription not active" }, 402, corsHeaders);
      }
    }

    const { data: profile, error: profileError } = await supabase
      .from("personal_profiles")
      .select("archived_header_type, archived_header_image_url")
      .eq("id", profileId)
      .single();
    if (profileError) return jsonResponse({ error: "Profile not found" }, 404, corsHeaders);

    await supabase.from("personal_blocks")
      .update({ is_archived: false })
      .eq("profile_id", profileId)
      .eq("is_archived", true);

    await supabase.from("personal_links")
      .update({ is_archived: false })
      .eq("profile_id", profileId)
      .eq("is_archived", true);

    const updateData: Record<string, unknown> = { archived_at: null };
    if (profile?.archived_header_type === "image" && profile?.archived_header_image_url) {
      updateData.header_type = profile.archived_header_type;
      updateData.header_image_url = profile.archived_header_image_url;
      updateData.archived_header_type = null;
      updateData.archived_header_image_url = null;
    }
    const { error: updateError } = await supabase
      .from("personal_profiles").update(updateData).eq("id", profileId);
    if (updateError) throw new Error("Failed to update profile");

    return jsonResponse({ success: true, message: "Premium content restored" }, 200, corsHeaders);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[restore-premium-content] Error:", error);
    return jsonResponse({ error: msg }, 400, corsHeaders);
  }
});
