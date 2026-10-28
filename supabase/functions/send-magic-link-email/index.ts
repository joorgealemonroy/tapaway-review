import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmailAndLog, wrapEmail } from "../_shared/email.ts";
import { escapeHtml } from "../_shared/sanitize.ts";
import { frontendUrl } from "../_shared/paymentFirst.ts";
import { readAccessBody, normalizedEmail } from "../_shared/accountAccess.ts";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateSecureToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateMagicLinkEmailHtml(fullName: string, magicLink: string): string {
  return wrapEmail({
    preheader: "Your secure link to your TapAway dashboard.",
    headline: "Your dashboard is ready",
    introHtml: `<p>Hi ${escapeHtml(fullName?.split(" ")[0] || "there")},</p>`,
    bodyHtml: "<p>Set your password to access your TapAway dashboard, update your hub and see your activity.</p>",
    ctaLabel: "Access my dashboard", ctaUrl: escapeHtml(magicLink),
    footerNote: "This link expires in 24 hours and can be used once to set your password. Didn't request this? You can ignore this email.",
  });
}

function generateMagicLinkEmailText(fullName: string, magicLink: string): string {
  const firstName = fullName?.split(" ")[0] || "there";
  
  return `TapAway. Set Up Your Business Account

Hey ${firstName},

Click the link below to set your password and access your TapAway business dashboard:

${magicLink}

This link expires in 24 hours. You can close and reopen it anytime before setting your password.
If you didn't request this, you can safely ignore this email.

Need help? Reply to this email.
 TapAway`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  // Anti-abuse: 5 magic-link emails per IP per 15 minutes.
  if (!checkRateLimit(getRateLimitKey(req, "send-magic-link-email"), 5, 15 * 60 * 1000)) {
    return rateLimitResponse(corsHeaders);
  }


  try {
    // Parse body FIRST (can only be read once)
    const { userId, email, fullName } = await readAccessBody(req);

    if (!userId || !email) {
      return new Response(
        JSON.stringify({ error: "userId and email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get auth header to verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Create client with user's token to verify they're admin
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: adminUser }, error: authError } = await userClient.auth.getUser();
    if (authError || !adminUser) {
      console.error("[send-magic-link-email] Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin using the is_admin RPC function (runs with user's context)
    const { data: isAdmin, error: adminCheckError } = await userClient.rpc("is_admin");
    
    if (adminCheckError) {
      console.error("[send-magic-link-email] Admin check error:", adminCheckError);
    }
    
    if (!isAdmin) {
      console.error("[send-magic-link-email] Admin check failed for user:", adminUser.email);
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create service role client for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Recipient comes from Auth, never a mismatched edit-form address.
    const { data: target, error: targetError } = await supabase.auth.admin.getUserById(String(userId));
    const canonicalEmail = normalizedEmail(target?.user?.email);
    if (targetError || !canonicalEmail || canonicalEmail !== normalizedEmail(email)) {
      return new Response(JSON.stringify({ error: "Save the account email change before sending a sign-in link." }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate secure token
    const token = generateSecureToken();
    const tokenHash = await sha256Hex(token);
    // Extended to 24 hours for dummy-proof experience
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Delete any existing magic link tokens for this user
    await supabase
      .from("magic_link_tokens")
      .delete()
      .eq("user_id", userId);

    // Insert new token
    const { error: insertError } = await supabase
      .from("magic_link_tokens")
      .insert({
        user_id: userId,
        email: canonicalEmail,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error("[send-magic-link-email] Error inserting token:", insertError);
      throw new Error("Failed to generate magic link");
    }

    // Use the configured trusted site; caller-supplied origins are ignored.
    const baseUrl = frontendUrl();
    const magicLink = `${baseUrl}/auth/magic?token=${token}`;

    console.log("[send-magic-link-email] Magic link base URL:", baseUrl);

    // Send email
    const html = generateMagicLinkEmailHtml(typeof fullName === "string" ? fullName : "there", magicLink);
    const text = generateMagicLinkEmailText(typeof fullName === "string" ? fullName : "there", magicLink);
    const sent = await sendEmailAndLog({ to: canonicalEmail, subject: "Access your TapAway dashboard", html, text, templateKey: "admin_dashboard_access", replyTo: "tap@tapaway.co" });

    if (!sent.ok) {
      throw new Error("Failed to send magic link email");
    }

    // Log the action
    await supabase.from("admin_audit_log").insert({
      admin_user_id: adminUser.id,
      action: "send_magic_link",
      target_type: "personal_profile",
      target_id: userId,
      details: { email, baseUrl },
    });

    console.log("[send-magic-link-email] Magic link sent successfully to:", email);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("[send-magic-link-email] Error:", error);
    const message = error instanceof Error ? error.message : "Something went wrong";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
