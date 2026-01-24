import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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

    // Fetch profile data
    const { data: profile } = await supabase
      .from("personal_profiles_public")
      .select("full_name, username, headline, profile_photo_url, header_type, header_color, header_image_url, banner_image_url, background_color")
      .eq("username", slug.toLowerCase())
      .single();

    // Default values
    const name = profile?.full_name || "TapAway";
    const headline = profile?.headline || "";
    const avatarUrl = profile?.profile_photo_url || null;
    const bannerUrl = profile?.banner_image_url || profile?.header_image_url || null;
    
    // Parse background color for SVG
    let bgColor = "#1a1a2e";
    let bgGradientId = "bgGrad";
    let useGradient = true;
    
    if (profile?.background_color) {
      const bg = profile.background_color;
      if (bg.startsWith("#")) {
        bgColor = bg;
        useGradient = false;
      } else if (bg.startsWith("rgb(")) {
        // Convert rgb to hex
        const match = bg.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (match) {
          const r = parseInt(match[1]).toString(16).padStart(2, '0');
          const g = parseInt(match[2]).toString(16).padStart(2, '0');
          const b = parseInt(match[3]).toString(16).padStart(2, '0');
          bgColor = `#${r}${g}${b}`;
          useGradient = false;
        }
      }
    }

    // Escape text for SVG
    const escapeXml = (str: string) => 
      str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    
    const safeName = escapeXml(name);
    const safeHeadline = escapeXml(headline.length > 50 ? headline.substring(0, 50) + "..." : headline);
    const initial = name.charAt(0).toUpperCase();

    // Build SVG - a clean, modern design
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="${bgGradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a2e"/>
      <stop offset="50%" style="stop-color:#16213e"/>
      <stop offset="100%" style="stop-color:#0f0f23"/>
    </linearGradient>
    <linearGradient id="avatarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea"/>
      <stop offset="100%" style="stop-color:#764ba2"/>
    </linearGradient>
    <clipPath id="avatarClip">
      <circle cx="600" cy="240" r="80"/>
    </clipPath>
    <clipPath id="bannerClip">
      <rect x="0" y="0" width="1200" height="200"/>
    </clipPath>
    <linearGradient id="bannerOverlay" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:rgba(0,0,0,0)"/>
      <stop offset="100%" style="stop-color:rgba(0,0,0,0.7)"/>
    </linearGradient>
    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-opacity="0.3"/>
    </filter>
  </defs>
  
  <!-- Background -->
  <rect width="1200" height="630" fill="${useGradient ? `url(#${bgGradientId})` : bgColor}"/>
  
  ${bannerUrl ? `
  <!-- Banner image -->
  <g clip-path="url(#bannerClip)">
    <image href="${escapeXml(bannerUrl)}" x="0" y="0" width="1200" height="200" preserveAspectRatio="xMidYMid slice"/>
    <rect x="0" y="0" width="1200" height="200" fill="url(#bannerOverlay)"/>
  </g>
  ` : ''}
  
  <!-- Avatar circle -->
  <g filter="url(#shadow)">
    ${avatarUrl ? `
    <circle cx="600" cy="280" r="84" fill="rgba(255,255,255,0.2)"/>
    <image href="${escapeXml(avatarUrl)}" x="516" y="196" width="168" height="168" clip-path="url(#avatarClip)" preserveAspectRatio="xMidYMid slice"/>
    <circle cx="600" cy="280" r="80" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="4"/>
    ` : `
    <circle cx="600" cy="280" r="80" fill="url(#avatarGrad)"/>
    <circle cx="600" cy="280" r="80" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="4"/>
    <text x="600" y="300" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="64" font-weight="bold" fill="white">${initial}</text>
    `}
  </g>
  
  <!-- Name -->
  <text x="600" y="410" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="48" font-weight="bold" fill="white">
    ${safeName}
  </text>
  
  ${safeHeadline ? `
  <!-- Headline -->
  <text x="600" y="460" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="24" fill="rgba(255,255,255,0.8)">
    ${safeHeadline}
  </text>
  ` : ''}
  
  <!-- TapAway branding -->
  <text x="600" y="590" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="20" fill="rgba(255,255,255,0.5)" letter-spacing="1">
    ━━━  TapAway  ━━━
  </text>
</svg>`;

    return new Response(svg, {
      headers: {
        ...corsHeaders,
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (error) {
    console.error("Error generating OG image:", error);
    
    // Fallback SVG
    const fallbackSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a2e"/>
      <stop offset="100%" style="stop-color:#0f0f23"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <text x="600" y="300" text-anchor="middle" font-family="system-ui, sans-serif" font-size="64" font-weight="bold" fill="white">TapAway</text>
  <text x="600" y="360" text-anchor="middle" font-family="system-ui, sans-serif" font-size="24" fill="rgba(255,255,255,0.7)">Share who you are</text>
</svg>`;

    return new Response(fallbackSvg, {
      headers: {
        ...corsHeaders,
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }
});
