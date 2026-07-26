import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { requireUser, isAdmin, isSafeExternalUrl, jsonResponse } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Only allow overwriting the shared email logo from these trusted upstream hosts.
const ALLOWED_HOSTS = ["googleusercontent.com", "supabase.co", "supabase.in", "tapaway.co"];
const MAX_BYTES = 2 * 1024 * 1024;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await requireUser(req);
    if (!auth) return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);
    if (!(await isAdmin(auth.user.id))) return jsonResponse({ error: "Admins only" }, 403, corsHeaders);

    const { imageUrl } = await req.json();
    if (!imageUrl || typeof imageUrl !== "string") {
      return jsonResponse({ error: "Missing imageUrl" }, 400, corsHeaders);
    }
    if (!isSafeExternalUrl(imageUrl, { allowHosts: ALLOWED_HOSTS })) {
      return jsonResponse({ error: "URL not allowed" }, 400, corsHeaders);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAdmin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const imgResponse = await fetch(imageUrl, { redirect: "follow" });
    if (!imgResponse.ok) {
      return jsonResponse({ error: `Failed to fetch image: ${imgResponse.status}` }, 400, corsHeaders);
    }
    const contentType = imgResponse.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      return jsonResponse({ error: "Fetched resource is not an image" }, 400, corsHeaders);
    }
    const buf = await imgResponse.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) {
      return jsonResponse({ error: "Image too large" }, 400, corsHeaders);
    }

    const { data, error } = await supabaseAdmin.storage
      .from("restaurant-logos")
      .upload("tapaway-email-logo.png", buf, { contentType: "image/png", upsert: true });

    if (error) return jsonResponse({ error: error.message }, 500, corsHeaders);

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/restaurant-logos/tapaway-email-logo.png`;
    return jsonResponse({ success: true, path: data.path, publicUrl }, 200, corsHeaders);
  } catch (error) {
    console.error("[upload-email-logo] Error:", error);
    return jsonResponse({ error: String(error) }, 500, corsHeaders);
  }
});
