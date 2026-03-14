import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { escapeHtml, validateFieldLengths } from "../_shared/sanitize.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DemoRequestNotification {
  fullName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zip: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fullName, addressLine1, addressLine2, city, state, zip }: DemoRequestNotification = await req.json();

    // Server-side length validation
    const tooLong = validateFieldLengths({ fullName, addressLine1, addressLine2, city, state, zip }, 500);
    if (tooLong) {
      return new Response(
        JSON.stringify({ error: `Field '${tooLong}' exceeds maximum length` }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Sending demo request notification for:", fullName);

    // Build address string (escaped)
    const addressParts = [escapeHtml(addressLine1)];
    if (addressLine2) addressParts.push(escapeHtml(addressLine2));
    addressParts.push(`${escapeHtml(city)}, ${escapeHtml(state)} ${escapeHtml(zip)}`);
    const fullAddress = addressParts.join('\n');

    const emailResponse = await resend.emails.send({
      from: Deno.env.get("EMAIL_FROM") || "TapAway <onboarding@resend.dev>",
      to: [Deno.env.get("EMAIL_INTERNAL") || "tap@tapaway.co"],
      subject: "New Demo Kit Request",
      html: `
        <h1>New Demo Kit Request</h1>
        <p>A sales rep has requested a demo kit:</p>
        <h2>Shipping Details</h2>
        <p><strong>Name:</strong> ${escapeHtml(fullName)}</p>
        <p><strong>Address:</strong></p>
        <pre style="background: #f5f5f5; padding: 12px; border-radius: 4px;">${fullAddress}</pre>
        <hr>
        <p style="color: #666; font-size: 12px;">Please ship 8 demo cards to the above address.</p>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("Error sending demo request notification:", error);
    return new Response(
      JSON.stringify({ error: "Failed to send notification" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
