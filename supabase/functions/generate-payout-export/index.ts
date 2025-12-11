import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Get auth user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's auth context for admin check
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin using user's context
    const { data: isAdminResult } = await supabaseUser.rpc("is_admin");
    if (!isAdminResult) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role for data access (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all payout accounts with full details (admin only!)
    const { data: accounts, error: accountsError } = await supabase
      .from("rep_payout_accounts")
      .select("rep_user_id, payee_name, routing_number, account_number");

    if (accountsError) {
      throw new Error("Failed to fetch payout accounts: " + accountsError.message);
    }

    // Get pending commissions grouped by rep
    const { data: commissions, error: commissionsError } = await supabase
      .from("commissions")
      .select("rep_id, amount")
      .eq("status", "pending");

    if (commissionsError) {
      throw new Error("Failed to fetch commissions: " + commissionsError.message);
    }

    // Calculate pending amounts per rep
    const pendingByRep: Record<string, number> = {};
    (commissions || []).forEach((c) => {
      pendingByRep[c.rep_id] = (pendingByRep[c.rep_id] || 0) + Number(c.amount);
    });

    // Build CSV rows (only include reps with pending amounts > 0)
    const rows: string[] = [];
    rows.push("payee_name,routing_number,account_number,amount_due");

    let exportCount = 0;
    (accounts || []).forEach((account) => {
      const amountDue = pendingByRep[account.rep_user_id] || 0;
      if (amountDue > 0) {
        // Escape any commas in payee name
        const safeName = account.payee_name.includes(",") 
          ? `"${account.payee_name}"` 
          : account.payee_name;
        
        rows.push(`${safeName},${account.routing_number},${account.account_number},${amountDue.toFixed(2)}`);
        exportCount++;
      }
    });

    const csv = rows.join("\n");

    console.log(`ACH export generated with ${exportCount} records`);

    return new Response(
      JSON.stringify({ csv, count: exportCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in generate-payout-export:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
