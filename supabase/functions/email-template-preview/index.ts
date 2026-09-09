// email-template-preview — canonical template previews for the admin UI.
//
// The /admin/emails Templates tab currently previews from a UI-side mirror
// (src/lib/admin/emailTemplates.ts). That mirror can drift from what clients
// actually receive. This endpoint renders from the canonical backend registry
// (supabase/functions/_shared/email.ts), so the admin UI can preview the
// single source of truth instead.
//
// Admin-gated (Jorge's JWT + is_admin()). Rate-limited (600/hour per
// caller — high enough for the /admin/emails gallery plus the Compose tab's
// debounced live preview while typing; still throttled against abuse).
//
// Request (POST):  { template_key: "welcome", vars?: { ... } }
// Response:        { key, subject, preheader, html, text }
//
// If vars are omitted, sensible sample data is used (never real client data).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireUser, isAdmin } from "../_shared/security.ts";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rateLimit.ts";
import { TEMPLATES, renderTemplate } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Sample data for previews — plausible but obviously fake.
const SAMPLE_VARS: Record<string, Record<string, string>> = {
  welcome: {
    name: "Alex",
    businessName: "Sunrise Café",
    hubUrl: "https://tapaway.co/sunrisecafe",
    dashboardUrl: "https://tapaway.co/dashboard",
  },
  // welcome_paid takes the same vars as welcome — paid-today copy.
  welcome_paid: {
    name: "Alex",
    businessName: "Sunrise Café",
    hubUrl: "https://tapaway.co/sunrisecafe",
    dashboardUrl: "https://tapaway.co/dashboard",
  },
  card_printed: {
    name: "Alex",
    businessName: "Sunrise Café",
    hubUrl: "https://tapaway.co/sunrisecafe",
  },
  card_delivered: {
    name: "Alex",
    businessName: "Sunrise Café",
    dashboardUrl: "https://tapaway.co/dashboard",
    deliveryNote:
      "Your TapAway cards for Sunrise Café are delivered — in your hands and ready to work.",
  },
  trial_ending: {
    name: "Alex",
    businessName: "Sunrise Café",
    chargeDate: "September 23, 2026",
    amount: "$20.00",
    dashboardUrl: "https://tapaway.co/dashboard",
  },
  payment_failed: {
    name: "Alex",
    businessName: "Sunrise Café",
    amount: "$20.00",
    dashboardUrl: "https://tapaway.co/dashboard",
  },
  password_setup: {
    firstName: "Alex",
    business: "Sunrise Café",
    setupLink: "https://tapaway.co/auth/reset-password#sample-link",
  },
  feature_update: {
    subject: "TapAway update: Slow-day deals are here",
    preheader: "A new way to fill empty tables, straight from your dashboard.",
    headline: "Slow-day deals are here",
    body: "You can now schedule a deal that only goes out on your slowest days.\n\nSet it once in your dashboard and TapAway texts your regulars automatically when you need the boost.",
    ctaLabel: "Try it now",
    ctaUrl: "https://tapaway.co/dashboard",
    name: "Alex",
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const caller = await requireUser(req);
    if (!caller) return json(401, { error: "Unauthorized" });
    if (!(await isAdmin(caller.user.id))) return json(403, { error: "Admin only" });

    if (!checkRateLimit(getRateLimitKey(req, "email-template-preview"), 600, 60 * 60 * 1000)) {
      return rateLimitResponse(corsHeaders);
    }

    const { template_key, vars } = await req.json().catch(() => ({}));
    if (typeof template_key !== "string" || !TEMPLATES[template_key]) {
      return json(400, {
        error: `Unknown template_key. Valid: ${Object.keys(TEMPLATES).join(", ")}`,
      });
    }

    const merged = { ...(SAMPLE_VARS[template_key] || {}), ...((vars as Record<string, string>) || {}) };
    const rendered = renderTemplate(template_key, merged);
    return json(200, rendered);
  } catch (err) {
    console.error("[email-template-preview] unexpected error", err);
    return json(500, { error: err instanceof Error ? err.message : "Unknown error" });
  }
});
