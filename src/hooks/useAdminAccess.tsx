import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

// Admin emails that always have admin access
const ADMIN_EMAILS = ["tap@tapaway.co"];

export const useAdminAccess = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  // Once a session has been confirmed as admin, a transient null user (token
  // refresh, tab refocus, preview iframe reload) must NOT downgrade it to
  // "not an admin" — that used to eject admins to the homepage mid-session.
  const confirmedAdminRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const checkAdminAccess = async () => {
      // If auth is still loading, wait
      if (authLoading) {
        setLoading(true);
        return;
      }

      if (!user) {
        if (confirmedAdminRef.current) {
          // Transient session gap — hold the last known state instead of
          // flipping to "not admin" and triggering route guards.
          setLoading(true);
          return;
        }
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      // A genuinely different user resets any previously confirmed admin state.
      if (lastUserIdRef.current && lastUserIdRef.current !== user.id) {
        confirmedAdminRef.current = false;
      }
      lastUserIdRef.current = user.id;

      const grant = () => {
        confirmedAdminRef.current = true;
        setIsAdmin(true);
        setLoading(false);
      };

      // Check hardcoded admin emails first (fast path)
      if (ADMIN_EMAILS.includes(user.email ?? "")) {
        grant();
        return;
      }

      // Check app_metadata for admin role
      if (user.app_metadata?.role === "admin") {
        grant();
        return;
      }

      // Defense-in-depth: Verify against user_roles table
      try {
        const { data: roleData, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();

        if (error) {
          // Network/RLS hiccup: keep a previously confirmed admin rather than
          // ejecting them. Otherwise fail closed.
          if (!confirmedAdminRef.current) setIsAdmin(false);
          setLoading(false);
          return;
        }

        if (roleData) {
          grant();
          return;
        }

        confirmedAdminRef.current = false;
        setIsAdmin(false);
      } catch {
        // If role check fails, fall back to previous state / false for security
        if (!confirmedAdminRef.current) setIsAdmin(false);
      }

      setLoading(false);
    };

    checkAdminAccess();
  }, [user, authLoading]);

  return { isAdmin, loading };
};
