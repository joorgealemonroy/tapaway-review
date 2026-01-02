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
      // If we're on a public route, never redirect to paywall
      if (isPublicRoute(location.pathname)) {
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

      // Check if user already has an allowed subscription
      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("subscription_status, id")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (restaurant && isSubscriptionAllowed(restaurant.subscription_status)) {
        // User has allowed subscription, redirect to dashboard
        navigate("/dashboard");
      }

      setChecking(false);
    };

    checkSubscription();
  }, [user, navigate, location.pathname]);

  return { checking };
};
