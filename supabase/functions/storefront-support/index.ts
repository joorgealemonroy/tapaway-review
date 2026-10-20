import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  admin,
  cors,
  json,
  sendEmail,
  getStripe,
  verifiedPrice,
} from "../_shared/paymentFirst.ts";
import { SUPPORT_INSTRUCTIONS } from "../_shared/storefrontKnowledge.ts";
import { takeQuota } from "../_shared/storefrontRateLimit.ts";
import { escapeHtml } from "../_shared/sanitize.ts";
let priceCache: { expires: number; facts: string } | null = null;
async function currentBusinessPrices() {
  if (priceCache && priceCache.expires > Date.now()) return priceCache.facts;
  try {
    const stripe = getStripe();
    const rules = [
      "solo_month",
      "solo_year",
      "venue_month",
      "venue_year",
    ] as const;
    const values = await Promise.allSettled(
      rules.map((key) => verifiedPrice(stripe, key)),
    );
    const facts = values
      .map((value, i) =>
        value.status === "fulfilled"
          ? `${rules[i].startsWith("solo") ? 4 : 15} business cards: $${value.value.amount / 100}/${value.value.interval} after the business trial. Full yearly amounts are charged annually.`
          : `${rules[i]} price could not be verified; do not quote it.`,
      )
      .join("\n");
    priceCache = { facts, expires: Date.now() + 120000 };
    return facts;
  } catch {
    return "Current business prices could not be verified. Direct the visitor to the pricing section or the team; do not guess.";
  }
}
const clean = (x: unknown, max: number) =>
  typeof x === "string" ? x.trim().slice(0, max) : "";
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const raw = await req.text();
    if (raw.length > 16000) return json({ error: "Message too long" }, 413);
    const body = JSON.parse(raw);
    if (body.website) return json({ sent: true });
    const visitor = clean(body.visitor, 36);
    if (!/^[a-f0-9-]{36}$/i.test(visitor))
      return json({ error: "Refresh this page and try again." }, 400);
    const history = Array.isArray(body.history)
      ? body.history
          .slice(-10)
          .filter(
            (m: Record<string, unknown>) =>
              m &&
              ["user", "assistant"].includes(String(m.role)) &&
              typeof m.content === "string",
          )
          .map((m: { role: string; content: string }) => ({
            role: m.role,
            content: clean(m.content, 1200),
          }))
      : [];
    if (body.mode === "team") {
      const email = clean(body.email, 254),
        name = clean(body.name, 120),
        message = clean(body.message, 2000);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name || !message)
        return json({ error: "Add your name, email, and question." }, 400);
      if ((await takeQuota(req, "support-team-ip", 5)) < 0)
        return json(
          { error: "Please email tap@tapaway.co for more help today." },
          429,
        );
      const { error } = await admin()
        .from("support_requests")
        .insert({
          request_type: "OTHER",
          name,
          email,
          business_name: "",
          description: message,
          request_details: { source: "storefront_chat", transcript: history },
        });
      if (error) throw error;
      const text = `From ${name} <${email}>\n\n${message}\n\nVisitor-provided chat transcript:\n${history.map((m: { role: string; content: string }) => `${m.role}: ${m.content}`).join("\n")}`;
      // A saved inbox request is the source of truth, even if its notification fails.
      await sendEmail(
        Deno.env.get("EMAIL_INTERNAL") || "tap@tapaway.co",
        "TapAway website question",
        `<pre style="white-space:pre-wrap">${escapeHtml(text)}</pre>`,
        text,
      ).catch(() => false);
      return json({ sent: true });
    }
    if (body.mode !== "ai")
      return json({ error: "Choose AI help or our team." }, 400);
    const message = clean(body.message, 1000);
    if (!message) return json({ error: "Type your question first." }, 400);
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key)
      return json(
        { error: "AI help is unavailable. Send a message to our team below." },
        503,
      );
    if ((await takeQuota(req, "support-ai-ip", 20)) < 0)
      return json(
        {
          error: "Today's AI limit has been reached. Our team can still help.",
          remaining: 0,
        },
        429,
      );
    const used = await takeQuota(req, "support-ai-visitor", 5, visitor);
    if (used < 0)
      return json(
        {
          error:
            "You've used your five AI questions for today. Send any other questions to our team.",
          remaining: 0,
        },
        429,
      );
    const pricing = await currentBusinessPrices();
    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        signal: AbortSignal.timeout(12000),
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          temperature: 0.2,
          max_tokens: 350,
          messages: [
            {
              role: "system",
              content: `${SUPPORT_INSTRUCTIONS}\n\nVerified current business pricing:\n${pricing}`,
            },
            ...history,
            { role: "user", content: message },
          ],
        }),
      },
    );
    if (!response.ok)
      return json(
        {
          error:
            "AI help is unavailable right now. Our team can help by email.",
          remaining: 5 - used,
        },
        503,
      );
    const result = await response.json();
    const answer = clean(result.choices?.[0]?.message?.content, 2200);
    if (!answer) throw new Error("Empty AI response");
    return json({ answer, remaining: 5 - used });
  } catch (error) {
    console.error(
      "[storefront-support]",
      error instanceof Error ? error.message : "failed",
    );
    return json(
      {
        error:
          "We couldn't send that. Please try again or email tap@tapaway.co.",
      },
      503,
    );
  }
});
