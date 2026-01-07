import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

// Admin emails that always have admin access
const ADMIN_EMAILS = ["tap@tapaway.co"];

export const useAdminAccess = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminAccess = async () => {
      // If auth is still loading, wait
      if (authLoading) {
        setLoading(true);
        return;
      }

      // If no user, they're not admin
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      // Check hardcoded admin emails first (fast path)
      if (ADMIN_EMAILS.includes(user.email ?? "")) {
        setIsAdmin(true);
        setLoading(false);
        return;
      }

      // Check app_metadata for admin role
      if (user.app_metadata?.role === "admin") {
        setIsAdmin(true);
        setLoading(false);
        return;
      }

      // Defense-in-depth: Verify against user_roles table
      try {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();

        setIsAdmin(!!roleData);
      } catch {
        // If role check fails, fall back to false for security
        setIsAdmin(false);
      }
      
      setLoading(false);
    };

    checkAdminAccess();
  }, [user, authLoading]);

  return { isAdmin, loading };
};
