import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
/** One shared role check. Email never grants access; server policies remain authoritative. */
export const useAdminAccess = () => {
  const { user, loading: authLoading } = useAuth();
  const role = useQuery({
    queryKey: ["admin-role", user?.id],
    enabled: !!user && !authLoading,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_admin");
      if (error) throw error;
      return data === true;
    },
    staleTime: 60_000,
    retry: 2,
  });
  return {
    isAdmin: !!user && role.data === true,
    loading: authLoading || (!!user && role.isPending),
    error: role.error,
    retry: role.refetch,
  };
};
