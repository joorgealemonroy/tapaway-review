import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { isGrandfatheredUser, isSuperAdmin } from "@/lib/grandfatheredUsers";
import { isTestAccount } from "@/lib/testAccounts";

export const usePaywallGuard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkSubscription = async () => {
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

      // Check if user already has an active subscription
      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("subscription_status, id")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (restaurant && restaurant.subscription_status === 'active') {
        // User has active subscription, redirect to dashboard
        navigate("/dashboard");
      }

      setChecking(false);
    };

    checkSubscription();
  }, [user, navigate]);

  return { checking };
};
