import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  const firstName = fullName?.split(" ")[0] || "there";
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;margin:0 auto;padding:40px 20px;">
    <!-- Header -->
    <tr>
      <td style="text-align:center;padding-bottom:32px;">
        <img src="https://tapaway.co/tapaway-logo-email.png" alt="TapAway" width="120" style="display:inline-block;" />
      </td>
    </tr>
    
    <!-- Main Content Card -->
    <tr>
      <td style="background:#1a1a1a;border-radius:16px;padding:40px 32px;text-align:center;border:1px solid #2a2a2a;">
        <h1 style="margin:0 0 16px 0;font-size:24px;font-weight:700;color:#ffffff;">Sign In to TapAway</h1>
        <p style="margin:0 0 32px 0;font-size:16px;color:#a1a1a1;line-height:1.6;">
          Hey ${firstName}, click the button below to securely sign in to your TapAway account.
        </p>
        
        <!-- CTA Button -->
        <a href="${magicLink}" 
           style="display:inline-block;background:#6BCB77;color:#000000;font-size:16px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;margin-bottom:32px;">
          Sign In to TapAway
        </a>
        
        <p style="margin:24px 0 0 0;font-size:13px;color:#666666;line-height:1.6;">
          This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
        </p>
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="text-align:center;padding-top:32px;">
        <p style="margin:0 0 8px 0;font-size:13px;color:#666666;">
          Need help? Reply to this email — we'll take care of you.
        </p>
        <p style="margin:0;font-size:12px;color:#4a4a4a;">
          © ${new Date().getFullYear()} TapAway. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function generateMagicLinkEmailText(fullName: string, magicLink: string): string {
  const firstName = fullName?.split(" ")[0] || "there";
  
  return `TapAway — Sign In

Hey ${firstName},

Click the link below to sign in to your TapAway account:

${magicLink}

This link expires in 1 hour.
If you didn't request this, you can safely ignore this email.

Need help? Reply to this email.
— TapAway`;
}

async function sendEmail(to: string, subject: string, html: string, text: string): Promise<boolean> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.error("[send-magic-link-email] RESEND_API_KEY not configured");
    return false;
  }

  const fromEmail = Deno.env.get("EMAIL_FROM") || "TapAway <no-reply@tapaway.co>";

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject,
        html,
        text,
        reply_to: "tap@tapaway.co",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[send-magic-link-email] Resend API error:", errorText);
      return false;
    }

    const data = await response.json();
    console.log("[send-magic-link-email] Email sent via Resend:", data.id);
    return true;
  } catch (error) {
    console.error("[send-magic-link-email] Error sending email:", error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
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
      return new Response(
        JSON.stringify({ error: "Not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create service role client for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user is admin
    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", adminUser.id)
      .eq("role", "admin")
      .single();

    if (!adminRole) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { userId, email, fullName } = await req.json();

    if (!userId || !email) {
      return new Response(
        JSON.stringify({ error: "userId and email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[send-magic-link-email] Sending magic link to:", email);

    // Generate secure token
    const token = generateSecureToken();
    const tokenHash = await sha256Hex(token);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

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
        email: email.toLowerCase(),
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error("[send-magic-link-email] Error inserting token:", insertError);
      throw new Error("Failed to generate magic link");
    }

    // Build magic link URL
    const baseUrl = "https://tapaway.co";
    const magicLink = `${baseUrl}/auth/magic?token=${token}`;

    // Send email
    const html = generateMagicLinkEmailHtml(fullName || "there", magicLink);
    const text = generateMagicLinkEmailText(fullName || "there", magicLink);
    const sent = await sendEmail(email, "Sign in to TapAway", html, text);

    if (!sent) {
      throw new Error("Failed to send magic link email");
    }

    // Log the action
    await supabase.from("admin_audit_log").insert({
      admin_user_id: adminUser.id,
      action: "send_magic_link",
      target_type: "personal_profile",
      target_id: userId,
      details: { email },
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
