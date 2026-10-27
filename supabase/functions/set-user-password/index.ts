// Password changes require an independently authenticated account. A paid
// Checkout session and mutable user metadata are never identity evidence.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireUser } from "../_shared/security.ts";
import { readAccessBody } from "../_shared/accountAccess.ts";
import { takeQuota } from "../_shared/storefrontRateLimit.ts";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });
serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const body = await readAccessBody(req).catch(() => null);
    if (!body) return json({ error: "Invalid request." }, 400);
    const auth = await requireUser(req);
    if (!auth?.user?.email_confirmed_at) return json({ error: "Confirm your email and sign in before setting a password.", requiresEmailVerification: true }, 401);
    if (body.userId != null && body.userId !== auth.user.id) return json({ error: "Sign in to the account you want to update." }, 403);
    if (typeof body.password !== "string" || body.password.length < 8 || body.password.length > 128) return json({ error: "Use a password between 8 and 128 characters." }, 400);
    if (await takeQuota(req, "authenticated-password-change", 5, auth.user.id) < 0) return json({ error: "Please try again later." }, 429);
    // User-scoped Auth preserves GoTrue's own reauthentication and password rules.
    const result = await auth.userClient.auth.updateUser({ password: body.password,
      data: { ...auth.user.user_metadata, must_set_password: false } });
    if (result.error) return json({ error: "We could not change your password. Sign in again or use the email recovery link." }, 400);
    return json({ success: true });
  } catch {
    return json({ error: "We could not change your password. Please try again." }, 503);
  }
});
