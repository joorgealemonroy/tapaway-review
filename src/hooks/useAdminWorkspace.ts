import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { workspaceRpc, type Hub } from "@/lib/admin/workspace";
export function useAdminHubs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["admin-hubs", user?.id],
    queryFn: () => workspaceRpc<Hub[]>("admin_workspace_hubs"),
    enabled: !!user,
    staleTime: 60_000,
    retry: 2,
  });
}
