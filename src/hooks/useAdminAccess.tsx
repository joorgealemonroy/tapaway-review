import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const useAdminAccess = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!user) {
        navigate("/auth");
        setLoading(false);
        return;
      }

      // Avoid double-checking
      if (checked) return;
      setChecked(true);

      try {
        // Check if user email is tap@tapaway.co
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (authUser?.email === "tap@tapaway.co") {
          setIsAdmin(true);
        } else {
          // Not admin, redirect to dashboard
          toast.error("Admin access is restricted to TapAway staff");
          navigate("/dashboard");
        }
      } catch (error) {
        console.error("Error checking admin access:", error);
        toast.error("Failed to verify admin access");
        navigate("/dashboard");
      } finally {
        setLoading(false);
      }
    };

    checkAdminAccess();
  }, [user, navigate, checked]);

  return { isAdmin, loading };
};
