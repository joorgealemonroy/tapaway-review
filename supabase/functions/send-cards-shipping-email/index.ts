// send-cards-shipping-email — "your cards are on the way" email.
//
// Now sends the canonical card_delivered template via the shared email
// library (branded HTML + email_sends logging). The deliveryNote var keeps
// the copy honest: this function fires when cards SHIP, so it says they're
// on the way — the admin-board Delivered lane uses its own note via the
// fulfillment-email trigger.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { sendTemplatedEmail } from "../_shared/email.ts";

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

    const result = await sendTemplatedEmail({
      to: email,
      from: "TapAway <hello@tapaway.co>",
      templateKey: "card_delivered",
      vars: {
        name: firstName,
        businessName: "your business",
        dashboardUrl: "https://tapaway.co/dashboard",
        deliveryNote:
          `Hi ${firstName} — your TapAway NFC cards have shipped and will arrive in 1–2 business days. ` +
          `We're finishing your setup now so everything is ready when they arrive.`,
      },
    });

    if (!result.ok) {
      throw new Error(result.error || "Send failed");
    }

    console.log("Shipping email sent successfully:", result.resendId);

    return new Response(JSON.stringify({ id: result.resendId, ok: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-cards-shipping-email function:", message);
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
