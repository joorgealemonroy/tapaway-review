import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limit: 60 requests per minute per IP
  const rlKey = getRateLimitKey(req, "serve-og-profile");
  if (!checkRateLimit(rlKey, 60, 60 * 1000)) {
    return rateLimitResponse(corsHeaders);
  }

  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug");

    if (!slug) {
      return new Response("Missing slug parameter", { status: 400, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const frontendUrl = Deno.env.get("FRONTEND_URL") || "https://tapaway.co";
    const canonicalUrl = `${frontendUrl}/${slug}`;
    const defaultImage = `${frontendUrl}/tapaway-logo.svg`;

    // Check personal profile first (priority matching UsernameResolver)
    const { data: profile } = await supabase
      .from("personal_profiles_public")
      .select("id, username, full_name, headline, bio, profile_photo_url, subscription_status")
      .eq("username", slug.toLowerCase())
      .single();

    if (profile && profile.subscription_status === "active") {
      // Personal profile found
      const title = `Check out ${profile.full_name} (@${profile.username}) on TapAway`;
      const description = profile.headline || profile.bio || "Share who you are with a single tap.";
      const image = profile.profile_photo_url || defaultImage;

      const html = generateOgHtml({ title, description, image, canonicalUrl });
      return new Response(html, {
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Check restaurant by custom_slug
    const { data: restaurant } = await supabase
      .from("restaurant_public_info")
      .select("id, restaurant_name, header_title, header_subtitle, logo_url, custom_slug")
      .eq("custom_slug", slug.toLowerCase())
      .single();

    if (restaurant) {
      // Restaurant found
      const title = restaurant.header_title || restaurant.restaurant_name
        ? `${restaurant.header_title || restaurant.restaurant_name} on TapAway`
        : "TapAway";
      const description = restaurant.header_subtitle || "Leave us a review and check out our menu!";
      const image = restaurant.logo_url || defaultImage;

      const html = generateOgHtml({ title, description, image, canonicalUrl });
      return new Response(html, {
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Not found - redirect to homepage with generic OG
    const html = generateOgHtml({
      title: "TapAway - Share Who You Are",
      description: "TapAway makes it easy to share your links, contact info, and more with a single tap.",
      image: defaultImage,
      canonicalUrl: frontendUrl,
    });

    return new Response(html, {
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });

  } catch (error) {
    console.error("Error in serve-og-profile:", error);
    return new Response("Internal server error", { status: 500, headers: corsHeaders });
  }
});

interface OgData {
  title: string;
  description: string;
  image: string;
  canonicalUrl: string;
}

function generateOgHtml({ title, description, image, canonicalUrl }: OgData): string {
  // Escape HTML entities
  const escapeHtml = (str: string) =>
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description.slice(0, 160));
  const safeImage = escapeHtml(image);
  const safeUrl = escapeHtml(canonicalUrl);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDescription}">
  
  <!-- Open Graph -->
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDescription}">
  <meta property="og:image" content="${safeImage}">
  <meta property="og:url" content="${safeUrl}">
  <meta property="og:type" content="profile">
  <meta property="og:site_name" content="TapAway">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDescription}">
  <meta name="twitter:image" content="${safeImage}">
  
  <!-- Instant redirect for real users -->
  <meta http-equiv="refresh" content="0;url=${safeUrl}">
  <link rel="canonical" href="${safeUrl}">
</head>
<body>
  <script>window.location.href = "${safeUrl}";</script>
  <p>Redirecting to <a href="${safeUrl}">${safeUrl}</a>...</p>
</body>
</html>`;
}
