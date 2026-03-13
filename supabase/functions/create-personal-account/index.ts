import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Verify the caller is an admin
async function verifyAdmin(
  authHeader: string | null,
  supabaseUrl: string,
  serviceKey: string
): Promise<{ isAdmin: boolean; userId: string | null }> {
  if (!authHeader) {
    return { isAdmin: false, userId: null };
  }

  const token = authHeader.replace("Bearer ", "");
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return { isAdmin: false, userId: null };
  }

  // Check if user is admin by email
  if (user.email === "tap@tapaway.co") {
    return { isAdmin: true, userId: user.id };
  }

  // Check user_roles table
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  return { isAdmin: !!roleData, userId: user.id };
}

// Generate a random password
function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      throw new Error("Missing Supabase configuration");
    }

    // Verify admin access
    const authHeader = req.headers.get("Authorization");
    const { isAdmin, userId: adminUserId } = await verifyAdmin(authHeader, supabaseUrl, serviceKey);

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const {
      email,
      fullName,
      username,
      tempPassword,
      planType = "free",
      links = [],
      blocks = [],
      headline,
      bio,
      // Design fields
      headerType = "color",
      headerColor = "#6BCB77",
      backgroundColor = "#000000",
      // pfpPosition always defaults to "center" - no longer configurable
    } = await req.json();

    // Validate required fields
    if (!email || !fullName || !username) {
      return new Response(
        JSON.stringify({ error: "Email, fullName, and username are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // Check if username is available
    const { data: existingProfile } = await supabase
      .from("personal_profiles")
      .select("id")
      .eq("username", username.toLowerCase())
      .maybeSingle();

    if (existingProfile) {
      return new Response(
        JSON.stringify({ error: `Username "${username}" is already taken` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if email is already used
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const emailExists = existingUser?.users?.some(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (emailExists) {
      return new Response(
        JSON.stringify({ error: `Email "${email}" is already in use` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate password if not provided
    const password = tempPassword || generateTempPassword();

    // Create the auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName,
        created_by_admin: true,
      },
    });

    if (authError || !authData.user) {
      console.error("Auth creation error:", authError);
      throw new Error(authError?.message || "Failed to create auth user");
    }

    const userId = authData.user.id;

    // Determine subscription status based on plan
    const subscriptionStatus = planType === "free" ? "active" : "active";

    // Create the personal profile with all design settings
    const { data: profile, error: profileError } = await supabase
      .from("personal_profiles")
      .insert({
        user_id: userId,
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        full_name: fullName,
        headline: headline || null,
        bio: bio || null,
        header_type: headerType,
        header_color: headerColor,
        background_color: backgroundColor,
        pfp_position: "center", // Always centered
        plan_type: planType,
        subscription_status: subscriptionStatus,
      })
      .select()
      .single();

    if (profileError) {
      console.error("Profile creation error:", profileError);
      // Try to clean up the auth user if profile creation fails
      await supabase.auth.admin.deleteUser(userId);
      throw new Error(profileError.message || "Failed to create profile");
    }

    // Create any initial links with full customization support
    if (links && links.length > 0) {
      const linksToInsert = links.map((link: any, index: number) => ({
        profile_id: profile.id,
        link_type: link.type || "custom",
        label: link.label || link.type,
        url: link.url,
        sort_order: link.sortOrder ?? index,
        is_active: link.isActive !== false,
        is_featured: link.isFeatured === true,
        display_style: link.displayStyle || "pill",
        pill_color: link.pillColor || null,
        cover_image_url: link.coverImageUrl || null,
        grid_size: link.gridSize || null,
      }));

      const { error: linksError } = await supabase
        .from("personal_links")
        .insert(linksToInsert);

      if (linksError) {
        console.error("Links creation error:", linksError);
        // Non-fatal, continue anyway
      }
    }

    // Create any content blocks
    if (blocks && blocks.length > 0) {
      const blocksToInsert = blocks.map((block: any, index: number) => ({
        profile_id: profile.id,
        block_type: block.blockType,
        content: block.content,
        alignment: block.alignment || "center",
        sort_order: block.sortOrder ?? index,
        is_active: block.isActive !== false,
      }));

      const { error: blocksError } = await supabase
        .from("personal_blocks")
        .insert(blocksToInsert);

      if (blocksError) {
        console.error("Blocks creation error:", blocksError);
        // Non-fatal, continue anyway
      }
    }

    // Log the creation in audit log
    await supabase.from("admin_audit_log").insert({
      admin_user_id: adminUserId,
      action: "create_personal_account",
      target_type: "personal_profile",
      target_id: profile.id,
      details: {
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        plan_type: planType,
        created_for: fullName,
      },
    });

    // Construct profile URL
    const publicUsername = planType === "free" 
      ? (username.toLowerCase().startsWith("tap") ? username.toLowerCase() : `tap${username.toLowerCase()}`)
      : username.toLowerCase();

    console.log(`Created personal account for ${email} with username @${username}`);

    return new Response(
      JSON.stringify({
        success: true,
        profileId: profile.id,
        userId,
        credentials: {
          email: email.toLowerCase(),
          tempPassword: password,
        },
        profileUrl: `/${publicUsername}`,
        username: username.toLowerCase(),
        publicUsername,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error creating personal account:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
