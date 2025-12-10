import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: "Session ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Looking up Stripe session: ${sessionId}`);

    // Initialize Stripe
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }
    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["customer"],
    });

    if (!session) {
      return new Response(
        JSON.stringify({ error: "Session not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get customer email
    let email: string | null = null;
    
    if (session.customer_details?.email) {
      email = session.customer_details.email;
    } else if (typeof session.customer === "object" && session.customer?.email) {
      email = session.customer.email;
    } else if (session.customer_email) {
      email = session.customer_email;
    }

    if (!email) {
      console.error("No email found in Stripe session");
      return new Response(
        JSON.stringify({ error: "No email found in checkout session" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found email from Stripe session: ${email}`);

    // Check if user already exists in Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check auth.users for existing user with this email
    const { data: existingUsers, error: lookupError } = await supabase.auth.admin.listUsers();
    
    if (lookupError) {
      console.error("Error looking up users:", lookupError);
      throw lookupError;
    }

    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email!.toLowerCase()
    );

    const alreadyHasUser = !!existingUser;
    console.log(`User exists for ${email}: ${alreadyHasUser}`);

    // Also get any metadata from the session
    const metadata = session.metadata || {};
    const customerName = session.customer_details?.name || metadata.customer_name || null;

    return new Response(
      JSON.stringify({
        email,
        alreadyHasUser,
        customerName,
        paymentStatus: session.payment_status,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in lookup-stripe-session:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to lookup session";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
