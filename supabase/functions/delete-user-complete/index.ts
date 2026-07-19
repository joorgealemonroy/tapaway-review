import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if caller is admin
    const isAdmin = caller.email === "tap@tapaway.co" || 
      caller.app_metadata?.role === "admin";
    
    if (!isAdmin) {
      const { data: roleData } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", caller.id)
        .eq("role", "admin")
        .single();
      
      if (!roleData) {
        return new Response(JSON.stringify({ error: "Admin access required" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { restaurantId, userId, isPersonalAccount, deleteAuthUserOnly, deleteSalesRepAccount } = await req.json();

    // ──── PERMANENT SAFEGUARD ────────────────────────────────────────────
    // Resolve the target user's email and block deletion of the super admin
    const PROTECTED_EMAIL = "tap@tapaway.co";

    const resolveTargetEmail = async (targetUserId: string | undefined): Promise<string | null> => {
      if (!targetUserId) return null;
      const { data } = await supabaseAdmin.auth.admin.getUserById(targetUserId);
      return data?.user?.email ?? null;
    };

    // Check all possible target user IDs
    const targetUserId = userId || (restaurantId ? null : undefined);

    if (targetUserId) {
      const targetEmail = await resolveTargetEmail(targetUserId);
      if (targetEmail?.toLowerCase() === PROTECTED_EMAIL) {
        console.error(`BLOCKED: Attempt to delete protected super admin account ${PROTECTED_EMAIL}`);
        return new Response(JSON.stringify({ error: "Cannot delete super admin account" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    // ──── END SAFEGUARD ──────────────────────────────────────────────────

    // ──── SALES-REP / ADMIN GUARD ────────────────────────────────────────
    // Prevents demo cleanup from wiping out a rep's auth account (which cascades
    // sales_reps via ON DELETE CASCADE). The only path allowed to delete a rep's
    // auth user is the explicit "Delete rep permanently" action, which sets
    // deleteSalesRepAccount = true.
    const isProtectedRepOrAdmin = async (targetId: string | undefined): Promise<string | null> => {
      if (!targetId) return null;
      const { data: rep } = await supabaseAdmin
        .from("sales_reps")
        .select("id")
        .eq("id", targetId)
        .maybeSingle();
      if (rep) return "sales_rep";
      const { data: adminRole } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", targetId)
        .eq("role", "admin")
        .maybeSingle();
      if (adminRole) return "admin";
      return null;
    };
    // ──── END GUARD ──────────────────────────────────────────────────────

    // ──── EXPLICIT REP-DELETION BRANCH ───────────────────────────────────
    // The ONLY sanctioned path to remove a sales rep's auth user + sales_reps row.
    if (deleteSalesRepAccount && userId) {
      if (userId === caller.id) {
        return new Response(JSON.stringify({ error: "Cannot delete your own account" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await supabaseAdmin.from("sales_reps").delete().eq("id", userId);
      await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
      const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (deleteErr) {
        const status = (deleteErr as { status?: number }).status;
        const code = (deleteErr as { code?: string }).code;
        if (status !== 404 && code !== "user_not_found") {
          console.error("Error deleting rep auth user:", deleteErr);
          return new Response(JSON.stringify({ error: "Failed to delete rep: " + deleteErr.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
      console.log(`Successfully deleted sales rep ${userId}`);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    // Handle orphan auth user deletion (no profile, no restaurant)
    if (deleteAuthUserOnly && userId) {
      if (userId === caller.id) {
        return new Response(JSON.stringify({ error: "Cannot delete your own account" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const protectedKind = await isProtectedRepOrAdmin(userId);
      if (protectedKind) {
        console.warn(`BLOCKED orphan-auth delete for ${userId}: protected as ${protectedKind}`);
        return new Response(JSON.stringify({ success: true, preserved: protectedKind }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
      const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId);


      if (deleteUserError) {
        // 404 / user_not_found means the auth user is already gone — treat as success
        const status = (deleteUserError as { status?: number }).status;
        const code = (deleteUserError as { code?: string }).code;
        if (status === 404 || code === "user_not_found") {
          console.log(`Orphan auth user ${userId} was already removed`);
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        console.error("Error deleting orphan auth user:", deleteUserError);
        return new Response(JSON.stringify({ error: "Failed to delete auth user: " + deleteUserError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`Successfully deleted orphan auth user ${userId}`);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle personal account deletion
    if (isPersonalAccount && userId) {
      // SAFETY CHECK: Prevent admin from deleting their own account
      if (userId === caller.id) {
        return new Response(JSON.stringify({ error: "Cannot delete your own account" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Delete personal profile related data
      const { data: profile } = await supabaseAdmin
        .from("personal_profiles")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (profile) {
        await supabaseAdmin.from("personal_analytics").delete().eq("profile_id", profile.id);
        await supabaseAdmin.from("personal_links").delete().eq("profile_id", profile.id);
        await supabaseAdmin.from("personal_blocks").delete().eq("profile_id", profile.id);
        await supabaseAdmin.from("personal_email_captures").delete().eq("profile_id", profile.id);
        
        // Delete the profile
        await supabaseAdmin.from("personal_profiles").delete().eq("id", profile.id);
      }

      // Guard: never wipe a rep's or admin's auth user via demo cleanup
      const protectedKindP = await isProtectedRepOrAdmin(userId);
      if (protectedKindP) {
        console.warn(`Personal-account delete for ${userId}: preserving auth user (${protectedKindP})`);
        return new Response(JSON.stringify({ success: true, preserved: protectedKindP }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Delete user roles
      await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);

      // Delete the auth user
      const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId);


      if (deleteUserError) {
        const status = (deleteUserError as { status?: number }).status;
        const code = (deleteUserError as { code?: string }).code;
        if (status === 404 || code === "user_not_found") {
          console.log(`Personal account profile deleted; auth user ${userId} was already removed`);
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        console.error("Error deleting auth user:", deleteUserError);
        return new Response(JSON.stringify({
          success: true,
          warning: "Profile deleted but could not remove auth user"
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`Successfully deleted personal account for user ${userId}`);

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle restaurant deletion (existing logic)
    if (!restaurantId) {
      return new Response(JSON.stringify({ error: "restaurantId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the restaurant to find the owner_id
    const { data: restaurant, error: restaurantError } = await supabaseAdmin
      .from("restaurants")
      .select("owner_id")
      .eq("id", restaurantId)
      .single();

    if (restaurantError || !restaurant) {
      return new Response(JSON.stringify({ error: "Restaurant not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ownerId = restaurant.owner_id;
    const isOwnAccount = ownerId === caller.id;

    // Safeguard: check if the restaurant owner is the protected super admin
    if (ownerId) {
      const ownerEmail = await resolveTargetEmail(ownerId);
      if (ownerEmail?.toLowerCase() === PROTECTED_EMAIL) {
        console.error(`BLOCKED: Attempt to delete restaurant owned by protected super admin`);
        return new Response(JSON.stringify({ error: "Cannot delete super admin's restaurant or account" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Delete related data first (with error logging for non-cascade tables)
    const safeDelete = async (table: string, column: string) => {
      const { error } = await supabaseAdmin.from(table).delete().eq(column, restaurantId);
      if (error) console.error(`[delete-user-complete] Failed to delete from ${table}:`, error);
      return error;
    };

    await safeDelete("locations", "restaurant_id");
    await safeDelete("analytics_events", "restaurant_id");
    await safeDelete("google_reviews", "restaurant_id");
    await safeDelete("goals", "restaurant_id");
    await safeDelete("competitors", "restaurant_id");
    await safeDelete("coach_ignored", "restaurant_id");
    await safeDelete("menu_sections", "restaurant_id");
    await safeDelete("restaurant_engagement", "restaurant_id");
    await safeDelete("review_sentiments", "restaurant_id");
    await safeDelete("fulfillment_orders", "restaurant_id");
    await safeDelete("av_meal_prep_meals", "restaurant_id");
    await safeDelete("av_meal_prep_testimonials", "restaurant_id");
    await safeDelete("av_trainer_bundles", "restaurant_id");
    await safeDelete("restaurant_sms_subscribers", "restaurant_id");
    await safeDelete("restaurant_sms_campaigns", "restaurant_id");
    await safeDelete("commissions", "restaurant_id");
    await safeDelete("pending_trials", "linked_restaurant_id");
    const repRestErr = await safeDelete("rep_restaurants", "linked_restaurant_id");
    if (repRestErr) {
      return new Response(JSON.stringify({ error: `Failed to clear sales rep link: ${repRestErr.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete the restaurant
    const { error: deleteRestaurantError } = await supabaseAdmin
      .from("restaurants")
      .delete()
      .eq("id", restaurantId);

    if (deleteRestaurantError) {
      console.error("Error deleting restaurant:", deleteRestaurantError);
      return new Response(JSON.stringify({ error: `Failed to delete restaurant: ${deleteRestaurantError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If the restaurant owner is the admin themselves, only delete the restaurant — not the auth user
    if (isOwnAccount) {
      console.log(`Admin deleted own restaurant ${restaurantId} (auth user preserved)`);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If this owner still owns other restaurants, keep the auth user
    const { count: remainingCount } = await supabaseAdmin
      .from("restaurants")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", ownerId);

    if ((remainingCount ?? 0) > 0) {
      console.log(`Restaurant ${restaurantId} deleted; owner ${ownerId} still has ${remainingCount} other restaurant(s), preserving auth user`);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Guard: never wipe a rep's or admin's auth user via restaurant cleanup
    const protectedKindO = await isProtectedRepOrAdmin(ownerId);
    if (protectedKindO) {
      console.warn(`Restaurant delete for owner ${ownerId}: preserving auth user (${protectedKindO})`);
      return new Response(JSON.stringify({ success: true, preserved: protectedKindO }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete user roles
    await supabaseAdmin.from("user_roles").delete().eq("user_id", ownerId);

    // Delete the auth user completely
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(ownerId);


    if (deleteUserError) {
      const status = (deleteUserError as { status?: number }).status;
      const code = (deleteUserError as { code?: string }).code;
      if (status === 404 || code === "user_not_found") {
        console.log(`Restaurant ${restaurantId} deleted; auth user ${ownerId} was already removed`);
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("Error deleting auth user:", deleteUserError);
      return new Response(JSON.stringify({
        success: true,
        warning: "Restaurant deleted but could not remove auth user"
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Successfully deleted restaurant ${restaurantId} and user ${ownerId}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Error in delete-user-complete:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
