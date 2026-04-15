import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { escapeHtml } from "../_shared/sanitize.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ShippingEmailRequest {
  firstName: string;
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { firstName, email }: ShippingEmailRequest = await req.json();

    if (!email || !firstName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: firstName, email" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your TapAway cards are shipping</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <!-- Header -->
                <tr>
                  <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #f3f4f6;">
                    <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #111827;">TapAway</h1>
                  </td>
                </tr>
                
                <!-- Main Content -->
                <tr>
                  <td style="padding: 32px;">
                    <h2 style="margin: 0 0 16px; font-size: 22px; font-weight: 700; color: #111827;">
                      Hi ${escapeHtml(firstName)},
                    </h2>
                    
                    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #4b5563;">
                      Your TapAway NFC cards have shipped and will arrive soon.
                    </p>
                    
                    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #4b5563;">
                      We're finishing your setup now so everything is ready when they arrive.
                    </p>
                    
                    <!-- What to expect -->
                    <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                      <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">
                        What to expect next
                      </h3>
                      <ul style="margin: 0; padding: 0 0 0 20px; color: #374151; font-size: 15px; line-height: 1.8;">
                        <li>Your custom review + social hub will be ready</li>
                        <li>Your cards arrive in 1–2 business days</li>
                        <li>We'll send simple instructions once everything is live</li>
                      </ul>
                    </div>
                    
                    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #4b5563;">
                      You don't need to install anything or train staff — just place the cards and let TapAway do the rest.
                    </p>
                    
                    <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #4b5563;">
                      If you have any questions, just reply to this email. We're here to help.
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 24px 32px; background-color: #f9fafb; border-top: 1px solid #f3f4f6;">
                    <p style="margin: 0 0 8px; font-size: 14px; color: #6b7280;">
                      — The TapAway Team
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                      Free 14-day trial • No charge today • Cancel anytime before day 14
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "TapAway <hello@tapaway.co>",
        to: [email],
        subject: "Your TapAway cards are on the way 🚚",
        html: emailHtml,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Resend API error: ${error}`);
    }

    const data = await res.json();
    console.log("Shipping email sent successfully:", data);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-cards-shipping-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
