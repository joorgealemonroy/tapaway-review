// supabase/functions/attribute-google-reviews/index.ts
//
// Daily per-review attribution pass (triggered by pg_cron, service role).
//
// For each restaurant with a Google Place ID AND review-button tap activity in
// the last 7 days:
//   1. Pulls the newest Google reviews via the Places API (New), NEWEST sort.
//   2. Refreshes that restaurant's rows in google_reviews.
//   3. Marks each review attributed_to_tapaway when at least one google_click
//      event exists for the restaurant in the 48 hours before the review's
//      publish time.
//
// No per-client OAuth needed (uses GOOGLE_PLACES_API_KEY_SERVER). The manual
// sync-google-reviews function remains as the on-demand "refresh now" path;
// this is the scheduled batch path that also writes attribution flags.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_PLACES_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY_SERVER");

/** A review counts as likely-from-TapAway when a tap happened within this window before publish. */
const ATTRIBUTION_WINDOW_HOURS = 48;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

type NewApiReview = {
  authorAttribution?: { displayName?: string; photoUri?: string };
  rating?: number;
  text?: { text?: string };
  originalText?: { text?: string };
  publishTime?: string;
  relativePublishTimeDescription?: string;
};

async function fetchNewestReviews(
  placeId: string
): Promise<{ rating: number | null; total: number | null; reviews: NewApiReview[] } | null> {
  try {
    const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      headers: {
        "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY!,
        "X-Goog-FieldMask": "rating,userRatingCount,reviews",
        "X-Goog-Reviews-Sort": "NEWEST",
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      rating: typeof data.rating === "number" ? data.rating : null,
      total: typeof data.userRatingCount === "number" ? data.userRatingCount : null,
      reviews: Array.isArray(data.reviews) ? data.reviews : [],
    };
  } catch {
    return null;
  }
}

async function countTapsBefore(
  restaurantId: string,
  reviewTime: Date
): Promise<number> {
  const windowStart = new Date(
    reviewTime.getTime() - ATTRIBUTION_WINDOW_HOURS * 60 * 60 * 1000
  ).toISOString();
  const { count } = await supabaseAdmin
    .from("analytics_events")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId)
    .eq("event_type", "google_click")
    .gte("created_at", windowStart)
    .lte("created_at", reviewTime.toISOString());
  return count ?? 0;
}

serve(async (_req) => {
  if (!GOOGLE_PLACES_API_KEY) {
    return new Response(
      JSON.stringify({ ok: false, error: "GOOGLE_PLACES_API_KEY_SERVER not set" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // Only restaurants with review-button taps in the last 7 days. Attribution
  // only matters where there is tap activity to match against.
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: activeEvents, error: eventsError } = await supabaseAdmin
    .from("analytics_events")
    .select("restaurant_id")
    .eq("event_type", "google_click")
    .gte("created_at", weekAgo);

  if (eventsError) {
    return new Response(JSON.stringify({ ok: false, error: eventsError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const activeIds = [...new Set((activeEvents ?? []).map((e) => e.restaurant_id as string))];
  if (activeIds.length === 0) {
    return new Response(JSON.stringify({ ok: true, polled: 0, newReviews: 0, attributed: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: restaurants, error: restError } = await supabaseAdmin
    .from("restaurants")
    .select("id, google_place_id")
    .in("id", activeIds)
    .not("google_place_id", "is", null);

  if (restError) {
    return new Response(JSON.stringify({ ok: false, error: restError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const queue = (restaurants ?? []).filter((r) =>
    ((r as { google_place_id?: string | null }).google_place_id ?? "").trim()
  ) as { id: string; google_place_id: string }[];

  let polled = 0;
  let newReviews = 0;
  let attributed = 0;
  const failed: string[] = [];

  const BATCH_SIZE = 10;
  for (let i = 0; i < queue.length; i += BATCH_SIZE) {
    const batch = queue.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (r) => {
        const placeId = r.google_place_id.trim();
        const place = await fetchNewestReviews(placeId);
        if (!place) throw new Error("places_lookup_failed");
        polled++;

        // Refresh this restaurant's stored reviews (same pattern as the
        // manual sync-google-reviews function).
        const del = await supabaseAdmin.from("google_reviews").delete().eq("restaurant_id", r.id);
        if (del.error) throw new Error("reviews_delete_failed");

        for (const rev of place.reviews) {
          const reviewTimeStr = rev.publishTime ? new Date(rev.publishTime).toISOString() : null;
          if (!reviewTimeStr) continue;
          const matched = await countTapsBefore(r.id, new Date(reviewTimeStr));
          const { error: insErr } = await supabaseAdmin.from("google_reviews").insert({
            restaurant_id: r.id,
            place_id: placeId,
            author_name: rev.authorAttribution?.displayName || "Anonymous",
            rating: typeof rev.rating === "number" ? rev.rating : 0,
            text: rev.text?.text || rev.originalText?.text || "",
            review_time: reviewTimeStr,
            relative_time_description: rev.relativePublishTimeDescription || "",
            profile_photo_url: rev.authorAttribution?.photoUri || null,
            attributed_to_tapaway: matched > 0,
            matched_clicks: matched,
          });
          if (insErr) throw new Error("reviews_insert_failed");
          newReviews++;
          if (matched > 0) attributed++;
        }

        await supabaseAdmin
          .from("restaurants")
          .update({
            google_rating: place.rating,
            google_user_ratings_total: place.total,
            last_google_sync_at: new Date().toISOString(),
          })
          .eq("id", r.id);
      })
    );
    results.forEach((res, idx) => {
      if (res.status === "rejected") failed.push(batch[idx].id);
    });
  }

  return new Response(
    JSON.stringify({ ok: true, polled, newReviews, attributed, failed: failed.length }),
    { headers: { "Content-Type": "application/json" } }
  );
});
