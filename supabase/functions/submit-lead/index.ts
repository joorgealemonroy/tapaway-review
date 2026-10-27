import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { readLimitedText } from "../_shared/requestBody.ts";
import { takeQuota } from "../_shared/storefrontRateLimit.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TYPES = new Set(["text", "email", "phone", "textarea", "select", "number"]);

serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    let body;
    try { body = JSON.parse(await readLimitedText(req, 16000)); } catch { return json({ error: "Please check your form and try again." }, 400); }
    // Pretend success for bots without reading or writing customer data.
    if (typeof body?.website === "string" && body.website.trim()) return json({ success: true });
    if (!body || typeof body.formId !== "string" || !UUID.test(body.formId) || !body.values || typeof body.values !== "object" || Array.isArray(body.values))
      return json({ error: "Please check your form and try again." }, 400);
    if (await takeQuota(req, "lead-submit-network", 10) < 0 || await takeQuota(req, "lead-submit-global", 2000, "all") < 0)
      return json({ error: "You’ve sent several requests. Please try again later." }, 429);
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: form, error } = await db.from("lead_forms").select("id,profile_id,is_active,fields").eq("id", body.formId).maybeSingle();
    if (error) throw new Error("Form lookup unavailable");
    if (!form || form.is_active !== true) return json({ error: "This form is not currently available." }, 404);
    const { data: entitled, error: accessError } = await db.rpc("personal_profile_is_active", { _profile_id: form.profile_id });
    if (accessError) throw new Error("Form access unavailable");
    if (entitled !== true) return json({ error: "This form is not currently available." }, 404);
    if (!Array.isArray(form.fields) || form.fields.length < 1 || form.fields.length > 20 || Object.keys(body.values).length > 20)
      return json({ error: "Please contact this business directly." }, 400);
    const fields = form.fields as { label: string; type: string; required?: boolean; options?: string[] }[];
    const labels = new Set(fields.map(f => f.label));
    if (Object.keys(body.values).some(key => !labels.has(key))) return json({ error: "Please refresh this form and try again." }, 400);
    const values: Record<string, string> = Object.create(null);
    for (const field of fields) {
      if (typeof field.label !== "string" || !field.label.trim() || field.label.length > 160 || field.label.startsWith("_tapaway_") || !TYPES.has(field.type))
        return json({ error: "Please contact this business directly." }, 400);
      const input = body.values[field.label];
      if (input !== undefined && typeof input !== "string") return json({ error: "Please check your answers." }, 400);
      const value = (input || "").trim();
      if (field.required && !value) return json({ error: "Please complete all required fields." }, 400);
      if (value.length > (field.type === "textarea" ? 2000 : 500)) return json({ error: "Please shorten your answer." }, 400);
      if (value && ((field.type === "email" && (value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))) ||
          (field.type === "phone" && (value.length > 40 || !/^[+\d\s().-]{7,40}$/.test(value))) ||
          (field.type === "number" && !Number.isFinite(Number(value))) ||
          (field.type === "select" && (!Array.isArray(field.options) || !field.options.includes(value)))))
        return json({ error: "Please check your answers." }, 400);
      values[field.label] = value;
    }
    // Preserve separate, explicit consent evidence. A lead never automatically
    // creates an SMS subscriber or grants consent to a different campaign.
    if (fields.some(f => f.type === "phone")) values._tapaway_sms_consent = JSON.stringify({
      marketing: body.smsConsent?.marketing === true, transactional: body.smsConsent?.transactional === true,
      marketingText: typeof body.smsConsent?.marketingText === "string" ? body.smsConsent.marketingText.slice(0, 2000) : "",
      transactionalText: typeof body.smsConsent?.transactionalText === "string" ? body.smsConsent.transactionalText.slice(0, 2000) : "",
      recordedAt: new Date().toISOString(),
    });
    if (await takeQuota(req, "lead-submit-form", 100, form.id) < 0) return json({ error: "Please contact this business directly." }, 429);
    const { data: row, error: insertError } = await db.from("lead_submissions").insert({ form_id: form.id, profile_id: form.profile_id, submission_data: values }).select("id").single();
    if (insertError || !row) throw new Error("Submission unavailable");
    return json({ success: true, submissionId: row.id });
  } catch {
    return json({ error: "We couldn’t save your message. Please try again." }, 503);
  }
});
