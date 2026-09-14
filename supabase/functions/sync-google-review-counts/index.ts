// supabase/functions/sync-google-review-counts/index.ts
//
// Weekly snapshot of each restaurant's Google review count (and rating) via
// the Places API Place Details endpoint. Powers the client dashboard's
// "new Google reviews in the last N days" card. No per-client OAuth required —
// uses the server-side GOOGLE_PLACES_API_KEY_SERVER secret (same key as
// auto-yelp-from-place). Runs weekly via pg_cron; safe to invoke manually.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_PLACES_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY_SERVER");

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function fetchReviewCount(
  placeId: string
): Promise<{ reviewCount: number; rating: number | null } | null> {
  try {
    const params = new URLSearchParams({
      place_id: placeId,
      key: GOOGLE_PLACES_API_KEY!,
      fields: "user_ratings_total,rating",
    });
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== "OK" || !data.result) return null;
    const total = data.result.user_ratings_total;
    if (typeof total !== "number") return null;
    return {
      reviewCount: total,
      rating: typeof data.result.rating === "number" ? data.result.rating : null,
    };
  } catch {
    return null;
  }
}

serve(async (_req) => {
  if (!GOOGLE_PLACES_API_KEY) {
    return new Response(
      JSON.stringify({ ok: false, error: "GOOGLE_PLACES_API_KEY_SERVER not set" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const { data: restaurants, error } = await supabaseAdmin
    .from("restaurants")
    .select("id, google_place_id")
    .not("google_place_id", "is", null);

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let synced = 0;
  let skipped = 0;
  const failed: string[] = [];

  const queue = (restaurants ?? []).filter((r) => {
    const placeId = ((r as { google_place_id?: string | null }).google_place_id ?? "").trim();
    if (!placeId) {
      skipped++;
      return false;
    }
    return true;
  }) as { id: string; google_place_id: string }[];

  // Batched parallel requests: a sequential loop (one Places call at a time)
  // risks hitting the edge function timeout once most restaurants have a
  // Place ID. Batches of 10 keep it fast without hammering the API.
  const BATCH_SIZE = 10;
  for (let i = 0; i < queue.length; i += BATCH_SIZE) {
    const batch = queue.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (r) => {
        const place = await fetchReviewCount(r.google_place_id.trim());
        if (!place) throw new Error("places_lookup_failed");
        const { error: insErr } = await supabaseAdmin.from("google_review_snapshots").insert({
          restaurant_id: r.id,
          review_count: place.reviewCount,
          rating: place.rating,
        });
        if (insErr) throw new Error("snapshot_insert_failed");
      })
    );
    results.forEach((res, idx) => {
      if (res.status === "fulfilled") synced++;
      else failed.push(batch[idx].id);
    });
  }

  return new Response(
    JSON.stringify({ ok: true, synced, skipped, failed: failed.length, total: queue.length }),
    { headers: { "Content-Type": "application/json" } }
  );
});
