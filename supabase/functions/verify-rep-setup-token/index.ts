import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { readLimitedText } from "../_shared/requestBody.ts";
import { takeQuota } from "../_shared/storefrontRateLimit.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
});
const invalid = () => json({ error: "Invalid or expired setup link. Contact support for a new invite." }, 400);

serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  let claimed = false;
  try {
    if (await takeQuota(req, "rep-setup-verify", 30) < 0 || await takeQuota(req, "token-verify-global", 10000, "all") < 0)
      return json({ error: "Too many attempts. Please try again later." }, 429);
    let body;
    try { body = JSON.parse(await readLimitedText(req, 4096)); } catch { return invalid(); }
    const token = body?.setupToken, password = body?.newPassword;
    if (typeof token !== "string" || token.length < 16 || token.length > 512) return invalid();
    const complete = password !== undefined && password !== null && password !== "";
    if (complete && (typeof password !== "string" || password.length < 8 || password.length > 256))
      return json({ error: "Use a password with 8 to 256 characters." }, 400);
    if (complete && body.agreementAccepted !== true)
      return json({ error: "Accept the Sales Partner Agreement to continue." }, 400);
    const signature = typeof body.signatureName === "string" ? body.signatureName.trim() : "";
    if (complete && (signature.length > 120 || signature.split(/\s+/).length < 2))
      return json({ error: "Enter your full legal name (first and last name)." }, 400);
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: record, error } = await db.from("rep_setup_tokens").select("id,user_id,expires_at")
      .eq("token", token).is("used_at", null).maybeSingle();
    if (error || !record || !(Date.parse(record.expires_at) > Date.now())) return invalid();
    const { data: userData, error: userError } = await db.auth.admin.getUserById(record.user_id);
    const email = userData?.user?.email;
    if (userError || !email) return invalid();
    if (!complete) return json({ valid: true, email, userId: record.user_id });

    const now = new Date().toISOString();
    const { data: claim, error: claimError } = await db.from("rep_setup_tokens").update({ used_at: now })
      .eq("id", record.id).eq("token", token).is("used_at", null).gt("expires_at", now).select("id").maybeSingle();
    if (claimError || !claim) return invalid();
    claimed = true;
    const { error: passwordError } = await db.auth.admin.updateUserById(record.user_id, { password });
    if (passwordError) throw new Error("Password update unavailable");
    const { data: rep, error: repError } = await db.from("sales_reps").update({ agreement_accepted: true,
      agreement_accepted_at: now, agreement_version: "1.0", signature_name: signature, signature_at: now,
    }).eq("id", record.user_id).select("id").maybeSingle();
    if (repError || !rep) throw new Error("Agreement could not be saved");
    return json({ success: true, email, message: "Password set successfully" });
  } catch {
    return json({ error: claimed
      ? "This invite was used. Sign in with your password or contact support for a new invite."
      : "Account access is temporarily unavailable. Please try again later." }, 503);
  }
});
