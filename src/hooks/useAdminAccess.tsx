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

      if (checked) return;
      setChecked(true);

      try {
        // Server-side admin check using RPC
        const { data, error } = await supabase.rpc('is_admin');
        
        if (error) throw error;
        
        if (data === true) {
          setIsAdmin(true);
        } else {
          toast.error("Admin access is restricted to TapAway staff");
          navigate("/dashboard");
        }
      } catch (error) {
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
