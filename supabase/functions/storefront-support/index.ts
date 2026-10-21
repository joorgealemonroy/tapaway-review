import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  admin,
  cors,
  json,
  sendEmail,
  getStripe,
  verifiedPrice,
} from "../_shared/paymentFirst.ts";
import {
  SUPPORT_INSTRUCTIONS,
  STOREFRONT_FAQS,
} from "../_shared/storefrontKnowledge.ts";
import { seasonalOfferFacts } from "../_shared/storefrontOffers.ts";
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

// Give common product questions a reviewed answer if the provider times out or truncates.
// Pricing comes from Stripe; this fallback never supplies an unverified business price.
export function reviewedAnswer(question: string, pricing: string) {
  const q = question.toLowerCase();
  if (/where.*(my|our) order|track.*(my|our) order|order status|refund.*(my|our)|charged.*twice/.test(q))
    return "I can't look up orders or payments. Choose Talk to our team or email tap@tapaway.co with your order email or order number. Please don't send card numbers or passwords. Our team will reply by email.";
  if (/halloween|sale|promotion|discount/.test(q)) return seasonalOfferFacts();
  if (/both.*(qr|nfc)|(?:qr.*nfc|nfc.*qr).*different/.test(q))
    return "Each personal card has one destination: its NFC tap and printed QR code open the same link. Your two cards can open different links. Choose a website, Linktree, Linkme, social profile, or the optional $5/month TapAway hub.";
  if (/what (is|are).*(nfc|tapaway|tap card)|what.*(sell|selling)|never.*(used|heard)|how.*(card|tapaway).*work|need.*app|other person.*app/.test(q)) return STOREFRONT_FAQS[0].answer;
  if (/(design|customi[sz]e|edit).*(card|sides|front|back)|(card|sides).*(design|customi[sz]e)/.test(q)) return STOREFRONT_FAQS[3].answer;
  if (/card club/.test(q)) return STOREFRONT_FAQS[7].answer;
  if (/personal.*trial|trial.*personal/.test(q)) return STOREFRONT_FAQS[2].answer;
  if (/difference|business or personal|personal or business/.test(q)) return STOREFRONT_FAQS[1].answer;
  if (/(personal|two cards|2 cards).*(price|cost|how much)|how much.*(personal|two cards|2 cards)|when.*charg/.test(q)) return STOREFRONT_FAQS[2].answer;
  if (
    /price|cost|how much|plan/.test(q) &&
    /business|\b4\b|\bfour\b|\b15\b|\bfifteen\b/.test(q)
  ) {
    const quantity = /\b15\b|\bfifteen\b/.test(q)
      ? "15"
      : /\b4\b|\bfour\b/.test(q)
        ? "4"
        : "";
    const facts = pricing
      .split("\n")
      .filter(
        (line) =>
          /^\d+ business cards:/.test(line) &&
          (!quantity || line.startsWith(quantity + " ")),
      );
    return facts.length
      ? facts.join("\n")
      : "Please check the pricing section or ask our team for the current business price. I couldn't verify it just now.";
  }
  if (
    /linktree|linkme|own (link|website)|require.*subscription|need.*subscription/.test(
      q,
    )
  )
    return "Personal cards are $39 once for two, with free standard US shipping. They can open your existing Linktree, Linkme, social profile, or website with no ongoing TapAway fee. A TapAway hub is optional at $5/month. Third-party terms apply.";
  if (/cancel/.test(q)) return STOREFRONT_FAQS[4].answer;
  if (/\$5|hosting|personal hub|add.*hub|hub.*(before|after|checkout|pay)/.test(q))
    return "The optional $5/month TapAway hub gives you a tapaway.co/yourname address (subject to availability), your dashboard, analytics, and editing access anytime. No website is needed. Select this add-on in the card designer BEFORE checkout. After payment, customize that purchased hub in your dashboard. For changes to an existing card-only order, ask our team. With your $39 card pair, the initial total is $44, then $5/month until canceled.";
  const topic = /design|template|both sides|print/.test(q)
    ? 3
    : /cancel/.test(q)
      ? 4
      : /change.*links?/.test(q)
        ? 5
        : /shipping|delivery/.test(q)
          ? 6
          : /card club/.test(q)
            ? 7
            : /iphone|android|phone|nfc/.test(q)
              ? 8
              : /after.*order/.test(q)
                ? 9
                : /what is tapaway|how.*work/.test(q)
                  ? 0
                  : -1;
  return topic < 0 ? null : STOREFRONT_FAQS[topic].answer;
}
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
    // Reviewed answers keep common questions fast and consistent; the AI handles the rest.
    const needsPrices = /price|cost|how much|plan/i.test(message) && /business|\b4\b|\bfour\b|\b15\b|\bfifteen\b/i.test(message);
    const pricing = needsPrices ? await currentBusinessPrices() : "";
    const reviewed = reviewedAnswer(message, pricing);
    if (reviewed) return json({ answer: reviewed, remaining: 5 - used, source: "reviewed_faq" });
    const verifiedPricing = pricing || await currentBusinessPrices();
    const fallback = () => {
      const answer = reviewedAnswer(message, pricing);
      return answer
        ? json({ answer, remaining: 5 - used, source: "reviewed_faq" })
        : json(
            {
              error:
                "I couldn't get a complete answer. Please ask our team below.",
              remaining: 5 - used,
            },
            503,
          );
    };
    try {
      const response = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          signal: AbortSignal.timeout(20000),
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model:
              Deno.env.get("STOREFRONT_AI_MODEL") ||
              "google/gemini-3.1-flash-lite",
            temperature: 0.2,
            max_tokens: 1200,
            messages: [
              {
                role: "system",
                content: `${SUPPORT_INSTRUCTIONS}\n\nCurrent seasonal offer:\n${seasonalOfferFacts()}\n\nVerified current business pricing:\n${verifiedPricing}`,
              },
              ...history,
              { role: "user", content: message },
            ],
          }),
        },
      );
      if (!response.ok) {
        console.error("[storefront-support] provider status", response.status);
        return fallback();
      }
      const result = await response.json();
      const choice = result.choices?.[0];
      const content = choice?.message?.content;
      if (
        choice?.finish_reason === "length" ||
        typeof content !== "string" ||
        content.length > 2200
      )
        return fallback();
      const answer = content.trim();
      if (!answer) return fallback();
      return json({ answer, remaining: 5 - used, source: "ai" });
    } catch (error) {
      console.error(
        "[storefront-support] provider unavailable",
        error instanceof Error ? error.name : "unknown",
      );
      return fallback();
    }
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
