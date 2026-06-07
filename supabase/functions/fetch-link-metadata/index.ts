import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function resolveUrl(base: string, relative: string): string {
  if (!relative) return "";
  if (relative.startsWith("http://") || relative.startsWith("https://")) return relative;
  if (relative.startsWith("//")) return "https:" + relative;
  try {
    return new URL(relative, base).href;
  } catch {
    return "";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authenticated caller — this is only invoked from the logged-in dashboard.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.39.7");
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limit: 20 requests per minute per authenticated user
    const rlKey = `fetch-link-metadata:${user.id}`;
    if (!checkRateLimit(rlKey, 20, 60 * 1000)) {
      return rateLimitResponse(corsHeaders);
    }

    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return new Response(
        JSON.stringify({ error: "url is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate protocol
    const trimmedUrl = url.trim();
    if (!/^https?:\/\//i.test(trimmedUrl)) {
      return new Response(
        JSON.stringify({ error: "Only http/https URLs are allowed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the page with a timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    let res: Response;
    try {
      res = await fetch(trimmedUrl, {
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "User-Agent": "TapAway-LinkBot/1.0",
          "Accept": "text/html,application/xhtml+xml",
        },
      });
    } catch (fetchErr) {
      clearTimeout(timeout);
      console.error("[fetch-link-metadata] Fetch failed:", fetchErr);
      return new Response(
        JSON.stringify({ error: "Failed to fetch URL" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    clearTimeout(timeout);

    // Only read first 50KB to avoid memory issues
    const reader = res.body?.getReader();
    if (!reader) {
      return new Response(
        JSON.stringify({ title: null, image: null, favicon: null, description: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let html = "";
    const decoder = new TextDecoder();
    const MAX_BYTES = 50 * 1024;
    let totalBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.length;
      html += decoder.decode(value, { stream: true });
      if (totalBytes >= MAX_BYTES) break;
    }
    reader.cancel().catch(() => {});

    // Parse OG tags with flexible attribute order
    const getMetaContent = (property: string): string | null => {
      // property="..." content="..."
      const r1 = new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, "i");
      const m1 = html.match(r1);
      if (m1) return m1[1];
      // content="..." property="..."
      const r2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, "i");
      const m2 = html.match(r2);
      if (m2) return m2[1];
      return null;
    };

    const getMetaName = (name: string): string | null => {
      const r1 = new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, "i");
      const m1 = html.match(r1);
      if (m1) return m1[1];
      const r2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, "i");
      const m2 = html.match(r2);
      if (m2) return m2[1];
      return null;
    };

    const ogTitle = getMetaContent("og:title");
    const ogImage = getMetaContent("og:image");
    const ogDescription = getMetaContent("og:description");
    const metaDescription = getMetaName("description");

    // Extract <title>
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const pageTitle = titleMatch?.[1]?.trim() || null;

    // Extract favicon
    const faviconMatch = html.match(/<link[^>]+rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]+href=["']([^"']+)["']/i);
    const faviconAlt = html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:icon|shortcut icon|apple-touch-icon)["']/i);
    const rawFavicon = faviconMatch?.[1] || faviconAlt?.[1] || null;

    const finalUrl = res.url || trimmedUrl;
    const favicon = rawFavicon ? resolveUrl(finalUrl, rawFavicon) : null;
    const image = ogImage ? resolveUrl(finalUrl, ogImage) : null;
    const title = ogTitle || pageTitle || null;
    const description = ogDescription || metaDescription || null;

    // If no favicon from HTML, try /favicon.ico
    let finalFavicon = favicon;
    if (!finalFavicon) {
      try {
        const origin = new URL(finalUrl).origin;
        finalFavicon = `${origin}/favicon.ico`;
      } catch {
        // ignore
      }
    }

    console.log(`[fetch-link-metadata] ${trimmedUrl} → title="${title}", favicon="${finalFavicon}", image=${!!image}`);

    return new Response(
      JSON.stringify({ title, image, favicon: finalFavicon, description }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[fetch-link-metadata] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
