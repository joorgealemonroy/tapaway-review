import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAccess } from "@/hooks/useAdminAccess";

/**
 * Route guard for admin-only pages.
 *
 * Only redirects once BOTH auth and the admin check have fully resolved.
 * A transient session gap (token refresh, tab refocus, preview reload) must
 * never be treated as "not an admin" — that previously ejected admins to the
 * homepage while they were still signed in.
 */
export const useAdminGuard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminAccess();

  useEffect(() => {
    if (authLoading || adminLoading) return;
    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }
    if (!isAdmin) {
      navigate("/", { replace: true });
    }
  }, [authLoading, adminLoading, user, isAdmin, navigate]);

  return { isAdmin, loading: authLoading || adminLoading, user };
};
