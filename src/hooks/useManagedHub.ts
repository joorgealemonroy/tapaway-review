import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { ProfileLocation, ProfileSmsProgram } from "@/lib/profileLocations";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Public projections only. React Query shares these requests across hub blocks. */
export function useManagedHub(profileId?: string, enabled = true) {
  const queryClient = useQueryClient();
  const route = useLocation();
  const requestedLocationId = new URLSearchParams(route.search).get("location");
  const locationsQuery = useQuery({
    queryKey: ["managed-hub-locations", profileId],
    enabled: enabled && !!profileId,
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_public_profile_locations", { p_profile_id: profileId });
      if (error) throw error;
      return (Array.isArray(data) ? data : []) as ProfileLocation[];
    },
  });
  const programQuery = useQuery({
    queryKey: ["managed-hub-program", profileId],
    enabled: enabled && !!profileId,
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_public_profile_sms_program", { p_profile_id: profileId });
      if (error) throw error;
      return (Array.isArray(data) ? data[0] : data) as (ProfileSmsProgram & { signup_ready?: boolean }) | null;
    },
  });
  useEffect(() => {
    const refresh = (event: Event) => {
      if ((event as CustomEvent<{ profileId: string }>).detail?.profileId !== profileId) return;
      void queryClient.invalidateQueries({ queryKey: ["managed-hub-locations", profileId] });
      void queryClient.invalidateQueries({ queryKey: ["managed-hub-program", profileId] });
    };
    window.addEventListener("tapaway:profile-locations-updated", refresh);
    return () => window.removeEventListener("tapaway:profile-locations-updated", refresh);
  }, [profileId, queryClient]);
  const locations = locationsQuery.data ?? [];
  const selectedLocation = requestedLocationId && UUID.test(requestedLocationId)
    ? locations.find(location => location.id === requestedLocationId) ?? null
    : null;
  return {
    locations,
    program: programQuery.data ?? null,
    selectedLocation,
    requestedLocationId,
    invalidLocation: enabled && !!requestedLocationId && !locationsQuery.isPending && !selectedLocation,
    loading: enabled && locationsQuery.isPending,
    programLoading: enabled && programQuery.isPending,
    error: locationsQuery.isError,
    programError: programQuery.isError,
    refetch: locationsQuery.refetch,
    refetchProgram: programQuery.refetch,
  };
}
