// supabase/functions/parse-menu/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured.");
    }
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured.");
    }

    // ---- 1. Get image URL (JSON or multipart with file) ----
    let imageUrl: string | null = null;
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      // Client sent a file directly
      const formData = await req.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return new Response(
          JSON.stringify({
            error: "No file uploaded (expected field `file`).",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Use service role key so RLS doesn't block us
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: { headers: { "X-Client-Info": "tapaway-menu-parser" } },
      });

      const bucketName = "restaurant-logos"; // change if your bucket is different
      const fileExt = file.name.split(".").pop() || "png";
      const fileName = `menus/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from(bucketName).upload(fileName, file, {
        contentType: file.type || "image/*",
      });

      if (uploadError) {
        console.error("Error uploading file to storage:", uploadError);
        return new Response(
          JSON.stringify({
            error: "Failed to upload image to storage.",
            details: uploadError.message,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(bucketName).getPublicUrl(fileName);

      imageUrl = publicUrl;
    } else {
      // JSON body with { imageUrl }
      const body = (await req.json().catch(() => null)) as { imageUrl?: string } | null;

      if (!body || !body.imageUrl) {
        return new Response(
          JSON.stringify({
            error:
              'Image URL is required. Send JSON `{ "imageUrl": "https://..." }` or multipart/form-data with a `file` field.',
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      imageUrl = body.imageUrl;
    }

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "Unable to determine image URL." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- 2. Basic URL check ----
    if (!imageUrl.startsWith("https://")) {
      return new Response(JSON.stringify({ error: "Only HTTPS image URLs are allowed." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- 3. Call Lovable AI to parse the menu ----
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a menu parser. Extract menu information from the image and return it as JSON.
The JSON should have this structure:
{
  "sections": [
    {
      "name": "Section Name",
      "items": [
        {
          "name": "Item Name",
          "description": "Item description (if available)",
          "price": "Price formatted as $X.XX"
        }
      ]
    }
  ]
}

Be precise and extract all visible menu items. If prices are not visible, use empty string. If descriptions are not visible, use empty string.`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Please extract the menu from this image.",
              },
              {
                type: "image_url",
                image_url: { url: imageUrl },
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_menu",
              description: "Extract structured menu data from the image",
              parameters: {
                type: "object",
                properties: {
                  sections: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        items: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              name: { type: "string" },
                              description: { type: "string" },
                              price: { type: "string" },
                            },
                            required: ["name", "description", "price"],
                          },
                        },
                      },
                      required: ["name", "items"],
                    },
                  },
                },
                required: ["sections"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_menu" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({
            error: "Rate limit exceeded. Please try again later.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({
            error: "AI credits exhausted. Please add credits to continue.",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      throw new Error("Failed to process image with AI.");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      throw new Error("No menu data extracted from image.");
    }

    const menuData = JSON.parse(toolCall.function.arguments);

    // ---- 4. Return structured menu ----
    return new Response(
      JSON.stringify({
        success: true,
        imageUrl,
        menu: menuData,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error parsing menu:", error);
    const message = error instanceof Error ? error.message : "Failed to parse menu image.";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
