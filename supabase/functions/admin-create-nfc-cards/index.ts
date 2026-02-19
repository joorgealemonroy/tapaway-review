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

function generateCode(length: number, charset: string): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminEmail = claimsData.claims.email as string;
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Check admin status
    const { data: isAdmin } = await supabase.rpc("is_admin");
    // Fallback: check email directly
    if (!isAdmin && adminEmail !== "tap@tapaway.co") {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { count = 10, batchId } = await req.json();

    if (count < 1 || count > 500) {
      return new Response(
        JSON.stringify({ error: "Count must be between 1 and 500" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const PUBLIC_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1
    const CLAIM_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

    // Get existing public codes to avoid collisions
    const { data: existingCodes } = await supabase
      .from("nfc_cards")
      .select("public_code");
    const existingSet = new Set((existingCodes || []).map((c: any) => c.public_code));

    const cards: Array<{
      public_code: string;
      claim_code: string;
      nfc_url: string;
    }> = [];

    const dbRows: Array<{
      public_code: string;
      claim_code_hash: string;
      batch_id: string | null;
    }> = [];

    for (let i = 0; i < count; i++) {
      // Generate unique public code
      let publicCode: string;
      do {
        publicCode = generateCode(6, PUBLIC_CHARSET);
      } while (existingSet.has(publicCode));
      existingSet.add(publicCode);

      // Generate claim code
      const claimCode = generateCode(8, CLAIM_CHARSET);
      const claimCodeHash = await sha256Hex(claimCode.toUpperCase());

      cards.push({
        public_code: publicCode,
        claim_code: claimCode,
        nfc_url: `https://tapaway.co/c/${publicCode}`,
      });

      dbRows.push({
        public_code: publicCode,
        claim_code_hash: claimCodeHash,
        batch_id: batchId || null,
      });
    }

    // Bulk insert
    const { error: insertError } = await supabase
      .from("nfc_cards")
      .insert(dbRows);

    if (insertError) {
      console.error("Batch insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create cards" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log in audit
    await supabase.from("admin_audit_log").insert({
      admin_user_id: claimsData.claims.sub,
      action: "create_nfc_cards_batch",
      target_type: "nfc_cards",
      details: { count, batchId: batchId || null },
    });

    console.log(`Created ${count} NFC cards${batchId ? ` (batch: ${batchId})` : ""}`);

    // Generate CSV
    const csvHeader = "public_code,claim_code,nfc_url";
    const csvRows = cards.map(
      (c) => `${c.public_code},${c.claim_code},${c.nfc_url}`
    );
    const csv = [csvHeader, ...csvRows].join("\n");

    return new Response(
      JSON.stringify({
        success: true,
        count,
        batchId: batchId || null,
        cards,
        csv,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("admin-create-nfc-cards error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
