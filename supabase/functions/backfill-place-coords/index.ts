import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Admin-only: fills place_lat / place_lng on personal_profiles that already
 * carry a google_place_id, using Places API (New) place details.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const googleApiKey = Deno.env.get("GOOGLE_PLACES_API_KEY_SERVER");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
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

    if (!googleApiKey) {
      return new Response(JSON.stringify({ error: "Google Places API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Math.max(Number(body?.limit) || 200, 1), 500);

    const { data: rows, error: rowsError } = await supabase
      .from("personal_profiles")
      .select("id, google_place_id")
      .not("google_place_id", "is", null)
      .is("place_lat", null)
      .limit(limit);
    if (rowsError) throw rowsError;

    let updated = 0;
    let failed = 0;

    for (const row of rows ?? []) {
      const placeId = String(row.google_place_id ?? "").trim();
      if (!placeId) continue;
      try {
        const resp = await fetch(
          `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
          {
            headers: {
              "X-Goog-Api-Key": googleApiKey,
              "X-Goog-FieldMask": "location,formattedAddress",
            },
          }
        );
        if (!resp.ok) {
          const text = await resp.text().catch(() => "");
          console.error(`[backfill-place-coords] ${placeId} [${resp.status}]: ${text}`);
          failed++;
          continue;
        }
        const detail = await resp.json();
        const lat = detail?.location?.latitude;
        const lng = detail?.location?.longitude;
        if (typeof lat !== "number" || typeof lng !== "number") {
          failed++;
          continue;
        }
        const { error: updateError } = await supabase
          .from("personal_profiles")
          .update({ place_lat: lat, place_lng: lng })
          .eq("id", row.id);
        if (updateError) {
          console.error("[backfill-place-coords] update failed:", updateError.message);
          failed++;
          continue;
        }
        updated++;
      } catch (err) {
        console.error("[backfill-place-coords] error:", err);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ scanned: rows?.length ?? 0, updated, failed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[backfill-place-coords] fatal:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
