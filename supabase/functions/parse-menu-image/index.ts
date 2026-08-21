import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_IMAGES = 15;
const MAX_PAYLOAD_BYTES = 40 * 1024 * 1024;

interface MenuItem {
  name: string;
  description: string;
  price: string;
}
interface MenuSection {
  name: string;
  items: MenuItem[];
}

const SYSTEM_PROMPT = `You are a menu OCR engine. Read every menu photo provided and extract the menu exactly as printed.

Rules:
- Preserve the exact wording, spelling and prices as printed. Never invent, translate or "improve" items.
- Keep sections in the printed order. If a section continues onto another photo, keep it as ONE section, do not duplicate it.
- Ignore anything that is not menu content: hours, addresses, phone numbers, social handles, taglines, legal notices.
- If a price is missing, use an empty string. Same for descriptions.
- Format prices as they appear, prefixed with $ (e.g. "$3.50").`;

const TOOL = {
  type: "function",
  function: {
    name: "extract_menu",
    description: "Extract structured menu data from the menu photos",
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
                  additionalProperties: false,
                },
              },
            },
            required: ["name", "items"],
            additionalProperties: false,
          },
        },
      },
      required: ["sections"],
      additionalProperties: false,
    },
  },
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function extractFromImages(
  apiKey: string,
  images: string[],
): Promise<{ sections: MenuSection[] } | { error: string; status: number; details?: string }> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-5.6-sol",
      reasoning_effort: "none",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Extract the full menu from these ${images.length} photo(s), in order.`,
            },
            ...images.map((url) => ({ type: "image_url", image_url: { url } })),
          ],
        },
      ],
      tools: [TOOL],
      tool_choice: { type: "function", function: { name: "extract_menu" } },
    }),
  });

  if (!res.ok) {
    const details = await res.text().catch(() => "");
    let error = "Failed to read the menu photos.";
    if (res.status === 429) error = "Too many requests right now. Try again in a moment.";
    else if (res.status === 402) error = "AI credits exhausted. Add credits to continue.";
    else if (res.status === 403) error = "AI access is blocked for this workspace.";
    return { error, status: res.status, details };
  }

  const data = await res.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) {
    return { error: "No menu could be read from those photos.", status: 422 };
  }

  try {
    const parsed = JSON.parse(toolCall.function.arguments);
    return { sections: Array.isArray(parsed.sections) ? parsed.sections : [] };
  } catch {
    return { error: "The menu data came back malformed. Try again.", status: 502 };
  }
}

function mergeSections(groups: MenuSection[][]): MenuSection[] {
  const merged: MenuSection[] = [];
  const byName = new Map<string, MenuSection>();

  for (const group of groups) {
    for (const section of group || []) {
      const name = String(section?.name ?? "").trim();
      const key = name.toLowerCase();
      let target = byName.get(key);
      if (!target) {
        target = { name: name || "Menu", items: [] };
        byName.set(key, target);
        merged.push(target);
      }
      for (const item of section?.items || []) {
        const itemName = String(item?.name ?? "").trim();
        if (!itemName) continue;
        const price = String(item?.price ?? "").trim();
        const dup = target.items.some(
          (e) => e.name.toLowerCase() === itemName.toLowerCase() && e.price === price,
        );
        if (dup) continue;
        target.items.push({
          name: itemName,
          description: String(item?.description ?? "").trim(),
          price,
        });
      }
    }
  }

  return merged.filter((s) => s.items.length > 0);
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return json({ success: false, step: "env", error: "LOVABLE_API_KEY not configured" }, 500);
    }

    const body = (await req.json().catch(() => null)) as
      | { imageUrl?: string; images?: string[] }
      | null;

    if (!body) {
      return json({ success: false, step: "input", error: "Invalid JSON body." }, 400);
    }

    // Collect sources: legacy single https URL, or a batch of data URLs / https URLs.
    let sources: string[] = [];
    if (Array.isArray(body.images) && body.images.length > 0) {
      sources = body.images.filter((s) => typeof s === "string" && s.length > 0);
    } else if (body.imageUrl) {
      sources = [body.imageUrl];
    }

    if (sources.length === 0) {
      return json(
        { success: false, step: "input", error: 'Send `{ "images": ["data:image/..."] }`.' },
        400,
      );
    }
    if (sources.length > MAX_IMAGES) {
      return json(
        { success: false, step: "input", error: `Up to ${MAX_IMAGES} photos at a time.` },
        400,
      );
    }
    const invalid = sources.find(
      (s) => !s.startsWith("https://") && !s.startsWith("data:image/"),
    );
    if (invalid) {
      return json(
        { success: false, step: "validation", error: "Only HTTPS URLs or image data URLs allowed." },
        400,
      );
    }
    const totalBytes = sources.reduce((n, s) => n + s.length, 0);
    if (totalBytes > MAX_PAYLOAD_BYTES) {
      return json(
        { success: false, step: "validation", error: "Those photos are too large. Try fewer at once." },
        413,
      );
    }

    // Read in small batches so each gateway request stays comfortably sized.
    const BATCH = 3;
    const groups: MenuSection[][] = [];
    const skipped: number[] = [];
    let lastError: { error: string; status: number } | null = null;

    for (let i = 0; i < sources.length; i += BATCH) {
      const batch = sources.slice(i, i + BATCH);
      let result = await extractFromImages(LOVABLE_API_KEY, batch);

      // One retry, transient failures only.
      if ("error" in result && (result.status === 429 || result.status >= 500)) {
        await new Promise((r) => setTimeout(r, 1500));
        result = await extractFromImages(LOVABLE_API_KEY, batch);
      }

      if ("error" in result) {
        // Terminal billing/policy errors stop the whole run.
        if (result.status === 402 || result.status === 403) {
          return json({ success: false, step: "ai", error: result.error }, result.status);
        }
        lastError = { error: result.error, status: result.status };
        for (let k = 0; k < batch.length; k++) skipped.push(i + k + 1);
        continue;
      }

      groups.push(result.sections);
    }

    const sections = mergeSections(groups);

    if (sections.length === 0) {
      return json(
        {
          success: false,
          step: "ai",
          error: lastError?.error ?? "No menu items could be read from those photos.",
          skipped,
        },
        lastError?.status ?? 422,
      );
    }

    return json({ success: true, menu: { sections }, skipped });
  } catch (error) {
    console.error("Error parsing menu:", error);
    const message = error instanceof Error ? error.message : "Failed to parse menu photos.";
    return json({ success: false, step: "exception", error: message }, 500);
  }
});
