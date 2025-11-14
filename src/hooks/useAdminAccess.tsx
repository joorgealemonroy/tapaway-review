import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useAdminAccess = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!user) {
        navigate("/auth");
        return;
      }

      try {
        // Check if user email is tap@tapaway.co
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (authUser?.email === "tap@tapaway.co") {
          setIsAdmin(true);
          setLoading(false);
        } else {
          // Not admin, redirect to dashboard
          navigate("/dashboard");
        }
      } catch (error) {
        console.error("Error checking admin access:", error);
        navigate("/dashboard");
      }
    };

    checkAdminAccess();
  }, [user, navigate]);

  return { isAdmin, loading };
};
