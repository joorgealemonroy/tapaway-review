import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { escapeHtml } from "../_shared/sanitize.ts";
import { sendEmailAndLog } from "../_shared/email.ts";
import { requireUser, adminClient } from "../_shared/security.ts";
import { readLimitedText } from "../_shared/requestBody.ts";
import { takeQuota } from "../_shared/storefrontRateLimit.ts";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json", "Cache-Control": "no-store",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") return json({ error: "POST required" }, 405);
  try {
    const auth = await requireUser(req);
    if (!auth) return json({ error: "Sign in to request a demo kit" }, 401);
    const db = adminClient();
    const { data: roles, error: roleError } = await db.from("user_roles").select("role").eq("user_id", auth.user.id);
    if (roleError) return json({ error: "Notification temporarily unavailable" }, 503);
    const isAdmin = roles?.some((r: { role: string }) => r.role === "admin");
    if (!isAdmin) {
      if (!roles?.some((r: { role: string }) => r.role === "sales_rep")) return json({ error: "Rep access required" }, 403);
      const { data: rep, error: repError } = await db.from("sales_reps")
        .select("is_active").eq("id", auth.user.id).maybeSingle();
      if (repError) return json({ error: "Notification temporarily unavailable" }, 503);
      if (rep?.is_active !== true) return json({ error: "Active rep access required" }, 403);
    }
    // Accept the older client's payload only as a bounded compatibility input.
    // Identity and shipping details always come from its saved request.
    try { await readLimitedText(req, 4096); } catch { return json({ error: "Invalid request" }, 400); }
    if (await takeQuota(req, "demo-kit-notification", 3, auth.user.id) < 0 ||
        await takeQuota(req, "demo-kit-notification-budget", 60, "all") < 0) return json({ error: "Please try again later" }, 429);
    const { data: saved, error } = await db.from("rep_demo_requests")
      .select("id,full_name,address_line1,address_line2,city,state,zip,fulfilled")
      .eq("rep_user_id", auth.user.id).maybeSingle();
    if (error) return json({ error: "Notification temporarily unavailable" }, 503);
    if (!saved) return json({ error: "Save your demo request first" }, 409);
    if (saved.fulfilled) return json({ success: true });
    const address = [saved.address_line1, saved.address_line2, `${saved.city}, ${saved.state} ${saved.zip}`]
      .filter(Boolean).map(v => escapeHtml(String(v))).join("\n");
    const result = await sendEmailAndLog({
      to: [Deno.env.get("EMAIL_INTERNAL") || "tap@tapaway.co"],
      templateKey: "internal_demo_request", idempotencyKey: `demo-kit:${saved.id}`,
      subject: "New Demo Kit Request",
      html: `<h1>New demo kit request</h1><p>A verified TapAway rep requested a demo kit.</p><p><strong>Name:</strong> ${escapeHtml(saved.full_name)}</p><pre>${address}</pre><p>Review the saved request in the admin dashboard before fulfillment.</p>`,
    });
    if (!result.ok) return json({ error: "Notification temporarily unavailable" }, 503);
    return json({ success: true });
  } catch {
    console.error("Demo request notification unavailable");
    return json({ error: "Notification temporarily unavailable" }, 503);
  }
});
