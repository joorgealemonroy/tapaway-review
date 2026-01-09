import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { profileId } = await req.json();
    console.log("[restore-premium-content] ProfileId:", profileId);

    if (!profileId) {
      throw new Error("profileId is required");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get the profile to check for archived header
    const { data: profile, error: profileError } = await supabase
      .from("personal_profiles")
      .select("archived_header_type, archived_header_image_url")
      .eq("id", profileId)
      .single();

    if (profileError) {
      console.error("[restore-premium-content] Profile error:", profileError);
      throw new Error("Profile not found");
    }

    // Restore all archived blocks
    const { error: blocksError } = await supabase
      .from("personal_blocks")
      .update({ is_archived: false })
      .eq("profile_id", profileId)
      .eq("is_archived", true);

    if (blocksError) {
      console.error("[restore-premium-content] Error restoring blocks:", blocksError);
    } else {
      console.log("[restore-premium-content] Restored archived blocks");
    }

    // Restore all archived links
    const { error: linksError } = await supabase
      .from("personal_links")
      .update({ is_archived: false })
      .eq("profile_id", profileId)
      .eq("is_archived", true);

    if (linksError) {
      console.error("[restore-premium-content] Error restoring links:", linksError);
    } else {
      console.log("[restore-premium-content] Restored archived links");
    }

    // Restore header if archived
    const updateData: Record<string, unknown> = {
      archived_at: null,
    };

    if (profile?.archived_header_type === "image" && profile?.archived_header_image_url) {
      updateData.header_type = profile.archived_header_type;
      updateData.header_image_url = profile.archived_header_image_url;
      updateData.archived_header_type = null;
      updateData.archived_header_image_url = null;
      console.log("[restore-premium-content] Restored custom header");
    }

    const { error: updateError } = await supabase
      .from("personal_profiles")
      .update(updateData)
      .eq("id", profileId);

    if (updateError) {
      console.error("[restore-premium-content] Error updating profile:", updateError);
      throw new Error("Failed to update profile");
    }

    console.log("[restore-premium-content] Restore complete for profile:", profileId);

    return new Response(
      JSON.stringify({ success: true, message: "Premium content restored" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[restore-premium-content] Error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
