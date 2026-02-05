import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { isGrandfatheredUser, isSuperAdmin } from "@/lib/grandfatheredUsers";
import { isTestAccount } from "@/lib/testAccounts";
import {
  isSubscriptionAllowed,
  isPublicRoute,
  hasPendingSetupFlags,
} from "@/lib/subscriptionStatus";

export const usePaywallGuard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkSubscription = async () => {
     // If we're on a public route (except /paywall itself), skip checks
     // We need to run checks on /paywall to redirect personal users away
     if (isPublicRoute(location.pathname) && location.pathname !== "/paywall") {
        setChecking(false);
        return;
      }

      // If user has pending setup flags (just paid via Stripe), allow through
      if (hasPendingSetupFlags()) {
        setChecking(false);
        return;
      }

      if (!user) {
        setChecking(false);
        return;
      }

      // Super admin bypasses everything and goes to /admin
      if (isSuperAdmin(user.email)) {
        navigate("/admin");
        setChecking(false);
        return;
      }

      // Test accounts bypass paywall
      if (isTestAccount(user.email)) {
        navigate("/dashboard");
        setChecking(false);
        return;
      }

      // Grandfathered users bypass paywall
      if (isGrandfatheredUser(user.email)) {
        navigate("/dashboard");
        setChecking(false);
        return;
      }

      // Check both business AND personal accounts in parallel
      const [restaurantResult, personalResult] = await Promise.all([
        supabase
          .from("restaurants")
          .select("subscription_status, id")
          .eq("owner_id", user.id)
          .maybeSingle(),
        supabase
          .from("personal_profiles")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle()
      ]);

      const restaurant = restaurantResult.data;
      const personal = personalResult.data;

      // If user has valid business subscription, go to business dashboard
      if (restaurant && isSubscriptionAllowed(restaurant.subscription_status)) {
        navigate("/dashboard");
        setChecking(false);
        return;
      }

      // If user has a personal profile (no valid business), go to personal dashboard
      if (personal) {
        navigate("/personal/dashboard");
        setChecking(false);
        return;
      }

      // Only now show the paywall (user has neither)
      setChecking(false);
    };

    checkSubscription();
  }, [user, navigate, location.pathname]);

  return { checking };
};
