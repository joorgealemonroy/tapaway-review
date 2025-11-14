import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({
          success: false,
          step: "env",
          error: "LOVABLE_API_KEY not configured in environment",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Expect JSON body { "imageUrl": "https://..." }
    const body = (await req.json().catch(() => null)) as { imageUrl?: string } | null;

    if (!body || !body.imageUrl) {
      return new Response(
        JSON.stringify({
          success: false,
          step: "input",
          error: 'Image URL is required. Send JSON `{ "imageUrl": "https://..." }`',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const imageUrl = body.imageUrl;

    if (!imageUrl.startsWith("https://")) {
      return new Response(
        JSON.stringify({
          success: false,
          step: "validation",
          error: "Only HTTPS image URLs are allowed.",
          imageUrl,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Call Lovable AI gateway
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
      const text = await aiResponse.text().catch(() => "");
      let message = "Failed to process image with AI.";
      if (aiResponse.status === 429) {
        message = "Rate limit exceeded. Please try again later.";
      } else if (aiResponse.status === 402) {
        message = "AI credits exhausted. Please add credits to continue.";
      }

      return new Response(
        JSON.stringify({
          success: false,
          step: "ai",
          status: aiResponse.status,
          error: message,
          details: text,
        }),
        {
          status: aiResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      return new Response(
        JSON.stringify({
          success: false,
          step: "ai-tool",
          error: "No menu data extracted from image.",
          raw: aiData,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const menuData = JSON.parse(toolCall.function.arguments);

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
    return new Response(
      JSON.stringify({
        success: false,
        step: "exception",
        error: message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
