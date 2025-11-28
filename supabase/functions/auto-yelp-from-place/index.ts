// supabase/functions/auto-yelp-from-place/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type AutoYelpPayload = {
  restaurantId: string;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// External APIs
const GOOGLE_PLACES_API_KEY = Deno.env.get("VITE_GOOGLE_MAPS_API_KEY");
const YELP_API_KEY = Deno.env.get("YELP_API_KEY");

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

type RestaurantRow = {
  id: string;
  restaurant_name: string | null;
  google_place_id: string | null;
  yelp_business_id: string | null;
  yelp_review_url: string | null;
};

type YelpBusiness = {
  id: string;
  name: string;
  url: string;
  location?: {
    address1?: string | null;
    city?: string | null;
  };
  coordinates?: {
    latitude?: number | null;
    longitude?: number | null;
  };
};

async function fetchPlaceDetails(placeId: string) {
  if (!GOOGLE_PLACES_API_KEY) {
    throw new Error("GOOGLE_PLACES_API_KEY not set");
  }

  const params = new URLSearchParams({
    place_id: placeId,
    key: GOOGLE_PLACES_API_KEY,
    fields: "name,formatted_address,geometry",
  });

  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`
  );

  if (!res.ok) {
    throw new Error(`Google Places API error: ${res.status}`);
  }

  const data = await res.json();
  if (data.status !== "OK" || !data.result) {
    throw new Error(
      `Google Places returned status ${data.status || "UNKNOWN"}`
    );
  }

  const result = data.result;
  return {
    name: result.name as string,
    address: result.formatted_address as string,
    lat: result.geometry?.location?.lat as number | undefined,
    lng: result.geometry?.location?.lng as number | undefined,
  };
}

function normalize(str: string | null | undefined): string {
  return (str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function extractHouseAndStreet(address: string | null | undefined) {
  const norm = (address || "").trim();
  if (!norm) return { house: "", street: "" };
  const parts = norm.split(/\s+/);
  const house = parts[0] || "";
  const street = parts.slice(1, 3).join(" ");
  return { house: house.toLowerCase(), street: street.toLowerCase() };
}

function haversineDistanceKm(
  lat1?: number,
  lon1?: number,
  lat2?: number | null,
  lon2?: number | null
): number | null {
  if (
    lat1 === undefined ||
    lon1 === undefined ||
    lat2 === undefined ||
    lon2 === undefined ||
    lat2 === null ||
    lon2 === null
  ) {
    return null;
  }

  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function scoreYelpBusiness(
  place: { name: string; address: string; lat?: number; lng?: number },
  biz: YelpBusiness
): number {
  const placeNameNorm = normalize(place.name);
  const placeAddrNorm = normalize(place.address);
  const placeCity = placeAddrNorm.split(" ").slice(-1)[0];
  const { house: placeHouse, street: placeStreet } = extractHouseAndStreet(
    place.address
  );

  const bizNameNorm = normalize(biz.name);
  const bizAddrNorm = normalize(biz.location?.address1 || "");
  const bizCityNorm = normalize(biz.location?.city || "");
  const { house: bizHouse, street: bizStreet } = extractHouseAndStreet(
    biz.location?.address1 || ""
  );

  let score = 0;

  // Name similarity
  if (placeNameNorm && bizNameNorm) {
    if (placeNameNorm === bizNameNorm) {
      score += 40;
    } else if (
      placeNameNorm.includes(bizNameNorm) ||
      bizNameNorm.includes(placeNameNorm)
    ) {
      score += 25;
    } else {
      score += 10;
    }
  }

  // City match
  if (placeCity && bizCityNorm && placeAddrNorm.includes(bizCityNorm)) {
    score += 40;
  } else if (bizCityNorm && placeAddrNorm.includes(bizCityNorm)) {
    score += 25;
  }

  // Street + house number
  if (placeHouse && bizHouse && placeHouse === bizHouse) {
    score += 20;
  }
  if (placeStreet && bizStreet && placeStreet === bizStreet) {
    score += 20;
  } else if (placeAddrNorm && bizStreet && placeAddrNorm.includes(bizStreet)) {
    score += 10;
  }

  // Distance bonus
  const distKm = haversineDistanceKm(
    place.lat,
    place.lng,
    biz.coordinates?.latitude ?? undefined,
    biz.coordinates?.longitude ?? undefined
  );
  if (distKm !== null) {
    if (distKm < 0.3) {
      score += 30;
    } else if (distKm < 1.0) {
      score += 15;
    } else if (distKm < 3.0) {
      score += 5;
    }
  }

  return score;
}

async function searchYelpWithScoring(place: {
  name: string;
  address: string;
  lat?: number;
  lng?: number;
}): Promise<YelpBusiness | null> {
  if (!YELP_API_KEY) {
    throw new Error("YELP_API_KEY not set");
  }

  const searchParams = new URLSearchParams({
    term: place.name,
    limit: "5",
  });

  if (place.lat && place.lng) {
    searchParams.set("latitude", String(place.lat));
    searchParams.set("longitude", String(place.lng));
  }

  const res = await fetch(
    `https://api.yelp.com/v3/businesses/search?${searchParams.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${YELP_API_KEY}`,
      },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Yelp API error: ${res.status} ${text}`);
  }

  const data = await res.json();
  const businesses = (data.businesses ?? []) as YelpBusiness[];

  if (!businesses.length) return null;

  let best: YelpBusiness | null = null;
  let bestScore = -1;

  for (const biz of businesses) {
    const s = scoreYelpBusiness(place, biz);
    if (s > bestScore) {
      bestScore = s;
      best = biz;
    }
  }

  if (!best || bestScore < 50) {
    return null;
  }

  return best;
}

function canonicalizeYelpUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    u.search = "";
    u.hash = "";
    return u.toString();
  } catch {
    const idx = rawUrl.indexOf("?");
    if (idx > -1) return rawUrl.slice(0, idx);
    return rawUrl;
  }
}

async function autoYelpForRestaurant(restaurantId: string) {
  const { data: restaurant, error } = await supabaseAdmin
    .from("restaurants")
    .select(
      "id, restaurant_name, google_place_id, yelp_business_id, yelp_review_url"
    )
    .eq("id", restaurantId)
    .single();

  if (error || !restaurant) {
    throw new Error("Restaurant not found");
  }

  const r = restaurant as RestaurantRow;
  if (!r.google_place_id) {
    throw new Error("Restaurant has no google_place_id set");
  }

  const place = await fetchPlaceDetails(r.google_place_id);
  const searchName = place.name || r.restaurant_name || "";

  if (!searchName) {
    throw new Error("No name available to search Yelp");
  }

  const yelpBiz = await searchYelpWithScoring(place);

  if (!yelpBiz) {
    throw new Error("No confident Yelp match found for this address.");
  }

  const yelpBusinessId = yelpBiz.id;
  const rawUrl = yelpBiz.url;
  const yelpUrl = canonicalizeYelpUrl(rawUrl);

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("restaurants")
    .update({
      yelp_business_id: yelpBusinessId,
      yelp_review_url: yelpUrl,
    })
    .eq("id", r.id)
    .select(
      "id, restaurant_name, google_place_id, yelp_business_id, yelp_review_url"
    )
    .single();

  if (updateError) {
    throw updateError;
  }

  return updated;
}

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - authentication required" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Create client for auth check
    const supabaseClient = createClient(
      SUPABASE_URL,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - invalid token" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const payload = (await req.json()) as AutoYelpPayload;
    if (!payload.restaurantId) {
      return new Response(
        JSON.stringify({ error: "Missing restaurantId" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Verify restaurant ownership before proceeding
    const { data: restaurant, error: ownerError } = await supabaseClient
      .from("restaurants")
      .select("owner_id")
      .eq("id", payload.restaurantId)
      .single();

    if (ownerError || !restaurant) {
      return new Response(
        JSON.stringify({ error: "Restaurant not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (restaurant.owner_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Access denied - you do not own this restaurant" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`[auto-yelp-from-place] Processing restaurant: ${payload.restaurantId}`);
    const updated = await autoYelpForRestaurant(payload.restaurantId);
    console.log(`[auto-yelp-from-place] Success:`, updated);

    return new Response(
      JSON.stringify({ success: true, restaurant: updated }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (err) {
    console.error("[auto-yelp-from-place] Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }
});
