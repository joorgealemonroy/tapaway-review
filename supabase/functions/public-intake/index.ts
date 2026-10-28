import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { readLimitedText } from "../_shared/requestBody.ts";
import { takeQuota } from "../_shared/storefrontRateLimit.ts";
import { requireUser } from "../_shared/security.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const text = (value: unknown, max: number) => typeof value === "string" && value.length <= max ? value.trim() : "";
const emailValid = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
function phoneValue(value: unknown) {
  const raw = text(value, 40);
  if (!raw) return "";
  if (!/^[+\d\s().-]+$/.test(raw)) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return null;
  return "+" + (digits.length === 10 ? "1" : "") + digits;
}

serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    let body;
    try { body = JSON.parse(await readLimitedText(req, 16000)); } catch { return json({ error: "Please check your details and try again." }, 400); }
    if (typeof body?.website === "string" && body.website.trim()) return json({ success: true });
    if (!body || !["capture", "support", "rep_application", "sms_signup"].includes(body.action)) return json({ error: "Unknown request." }, 400);
    const action = body.action as string;
    if (await takeQuota(req, `intake-${action}-network`, action === "rep_application" ? 3 : 10) < 0 ||
        await takeQuota(req, "intake-global", 2000, "all") < 0) return json({ error: "Please try again later." }, 429);
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const name = text(body.name, 100), email = text(body.email, 254).toLowerCase(), phone = phoneValue(body.phone);
    if ((body.name && !name) || (body.email && (!email || !emailValid(email))) || phone === null)
      return json({ error: "Please check your name and contact details." }, 400);

    if (action === "capture" || action === "sms_signup") {
      const marketing = body.marketingConsent === true, transactional = body.transactionalConsent === true;
      const marketingText = text(body.marketingText, 2000), transactionalText = text(body.transactionalText, 2000);
      if ((!email && !phone) || ((marketing || transactional) && !phone) || (marketing && !marketingText) || (transactional && !transactionalText))
        return json({ error: "Add your contact details and select your text preferences." }, 400);
      if (action === "sms_signup" && (!name || !phone || (!marketing && !transactional))) return json({ error: "Add your name, phone and text preferences." }, 400);
      const contact = phone || email;
      if (await takeQuota(req, "intake-contact", 3, contact) < 0) return json({ error: "Please try again later." }, 429);
      if (action === "capture") {
        if (typeof body.profileId !== "string" || !UUID.test(body.profileId)) return json({ error: "This profile is unavailable." }, 404);
        const { data: active, error: accessError } = await db.rpc("personal_profile_is_active", { _profile_id: body.profileId });
        if (accessError) throw new Error("Profile access unavailable");
        if (active !== true) return json({ error: "This profile is unavailable." }, 404);
        if (body.message && !text(body.message, 2000)) return json({ error: "Please shorten your message." }, 400);
        if (await takeQuota(req, "intake-profile", 150, body.profileId) < 0) return json({ error: "Please contact this business directly." }, 429);
        const { error } = await db.rpc("record_personal_capture", {
          p_profile_id: body.profileId, p_name: name || null, p_email: email || null, p_phone: phone || null,
          p_message: text(body.message, 2000) || null, p_marketing_consent: marketing, p_transactional_consent: transactional,
          p_marketing_text: marketing ? marketingText : null, p_transactional_text: transactional ? transactionalText : null,
          p_user_agent: text(req.headers.get("user-agent"), 500) || null,
        });
        if (error) throw new Error("Capture unavailable");
      } else {
        const now = new Date().toISOString();
        const { error } = await db.from("sms_signup_submissions").insert({ name, phone,
          consent_text: marketing ? marketingText : transactionalText, consent_at: now,
          marketing_consent_text: marketing ? marketingText : null, marketing_consent_at: marketing ? now : null,
          transactional_consent_text: transactional ? transactionalText : null, transactional_consent_at: transactional ? now : null,
          user_agent: text(req.headers.get("user-agent"), 500) || null, source: "/sms-signup",
        });
        if (error) throw new Error("Signup unavailable");
      }
    } else if (action === "rep_application") {
      if (!name || !email || (body.message && !text(body.message, 2000))) return json({ error: "Add your name, email and a short message." }, 400);
      if (await takeQuota(req, "intake-rep-email", 2, email) < 0) return json({ success: true });
      const { error } = await db.from("rep_applications").insert({ name, email, phone: phone || null,
        message: text(body.message, 2000) || null, status: "pending", reviewed_at: null, reviewed_by: null,
        created_at: new Date().toISOString(),
      });
      // Do not reveal whether an email already applied.
      if (error && error.code !== "23505") throw new Error("Application unavailable");
    } else {
      const description = text(body.description, 4000), businessName = text(body.businessName, 200);
      if (!name || !email || !description || !["TECH_ISSUE", "BILLING", "OTHER", "NEW_CARDS", "MORE_CARDS"].includes(body.requestType))
        return json({ error: "Add your name, email and a brief message." }, 400);
      if (await takeQuota(req, "intake-support-email", 5, email) < 0) return json({ error: "Please try again later." }, 429);
      const caller = await requireUser(req);
      const details = body.requestDetails && typeof body.requestDetails === "object" && !Array.isArray(body.requestDetails) ? body.requestDetails : {};
      if (JSON.stringify(details).length > 4000) return json({ error: "Please shorten your request." }, 400);
      const now = new Date().toISOString();
      const { error } = await db.from("support_requests").insert({ request_type: body.requestType, name,
        business_name: businessName, email, phone: phone || null, description, request_details: details,
        user_id: caller?.user.id || null, status: "NEW", created_at: now, updated_at: now,
      });
      if (error) throw new Error("Request unavailable");
    }
    return json({ success: true });
  } catch { return json({ error: "We couldn’t save your request. Please try again." }, 503); }
});
