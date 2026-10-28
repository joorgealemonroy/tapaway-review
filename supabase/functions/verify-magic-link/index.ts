import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { readLimitedText } from "../_shared/requestBody.ts";
import { hashValue, takeQuota } from "../_shared/storefrontRateLimit.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
});
const invalid = () => json({ error: "Invalid or expired magic link. Request a new access link." }, 400);

serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  let claimed = false;
  try {
    if (await takeQuota(req, "magic-link-verify", 30) < 0 || await takeQuota(req, "token-verify-global", 10000, "all") < 0)
      return json({ error: "Too many attempts. Please try again later." }, 429);
    let body;
    try { body = JSON.parse(await readLimitedText(req, 4096)); } catch { return invalid(); }
    const token = body?.token, password = body?.newPassword;
    if (typeof token !== "string" || token.length < 16 || token.length > 512) return invalid();
    const complete = password !== undefined && password !== null && password !== "";
    if (complete && (typeof password !== "string" || password.length < 8 || password.length > 256))
      return json({ error: "Use a password with 8 to 256 characters." }, 400);
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const tokenHash = await hashValue(token);
    const { data: record, error } = await db.from("magic_link_tokens").select("id,user_id,email,expires_at")
      .eq("token_hash", tokenHash).is("used_at", null).maybeSingle();
    if (error || !record || !(Date.parse(record.expires_at) > Date.now())) return invalid();
    const { data: userData, error: userError } = await db.auth.admin.getUserById(record.user_id);
    const email = userData?.user?.email;
    if (userError || !email || email.toLowerCase() !== String(record.email).toLowerCase()) return invalid();
    if (!complete) return json({ valid: true, email, userId: record.user_id });

    // Claim before touching Auth. Concurrent replay and ambiguous Auth failure
    // can never mutate the password a second time with this token.
    const now = new Date().toISOString();
    const { data: claim, error: claimError } = await db.from("magic_link_tokens").update({ used_at: now })
      .eq("id", record.id).eq("token_hash", tokenHash).is("used_at", null).gt("expires_at", now).select("id").maybeSingle();
    if (claimError || !claim) return invalid();
    claimed = true;
    const { error: passwordError } = await db.auth.admin.updateUserById(record.user_id, { password });
    if (passwordError) throw new Error("Password update unavailable");
    const { data: link, error: linkError } = await db.auth.admin.generateLink({ type: "magiclink", email });
    const tokenHashForSession = link?.properties?.hashed_token;
    if (linkError || !tokenHashForSession) throw new Error("Sign-in unavailable");
    const { data: signedIn, error: signInError } = await db.auth.verifyOtp({ token_hash: tokenHashForSession, type: "magiclink" });
    if (signInError || !signedIn?.session) throw new Error("Sign-in unavailable");
    return json({ success: true, session: {
      access_token: signedIn.session.access_token, refresh_token: signedIn.session.refresh_token,
      expires_in: signedIn.session.expires_in, token_type: "bearer",
    } });
  } catch {
    return json({ error: claimed
      ? "This link was used. Sign in with your password or request a new access link."
      : "Account access is temporarily unavailable. Please try again later." }, 503);
  }
});
