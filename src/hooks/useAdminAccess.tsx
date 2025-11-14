import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

// Admin emails that always have admin access
const ADMIN_EMAILS = ["tap@tapaway.co"];

export const useAdminAccess = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminAccess = () => {
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

      // Check if user is admin via email or app_metadata
      const isAdminUser =
        ADMIN_EMAILS.includes(user.email ?? "") ||
        user.app_metadata?.role === "admin";

      setIsAdmin(isAdminUser);
      setLoading(false);
    };

    checkAdminAccess();
  }, [user, authLoading]);

  return { isAdmin, loading };
};
