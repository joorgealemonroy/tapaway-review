import { useEffect, useState, memo } from "react";
import { useParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { isUsernameReserved } from "@/lib/reservedUsernames";
import PersonalProfilePage from "./personal/PersonalProfilePage";
import { lazy, Suspense } from "react";
import type { CachedProfile } from "@/hooks/useProfileCache";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { HUB_PROFILE_COLUMNS } from "@/lib/hubProfileColumns";

// Lazy load ReviewHub since it's less common and heavier
const ReviewHub = lazy(() => import("./ReviewHub"));
const NotFound = lazy(() => import("./NotFound"));

// Minimal loading state
const MinimalLoader = memo(() => (
  <div className="min-h-screen bg-black flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-white/60" />
  </div>
));

const PROFILE_COLUMNS = HUB_PROFILE_COLUMNS;

const AdminPreviewRibbon = () => (
  <div className="fixed top-0 inset-x-0 z-[9999] bg-amber-500 text-black text-center py-1.5 text-xs font-semibold shadow-md">
    Preview — this hub is not yet approved and not publicly visible.
  </div>
);

const UsernameResolver = () => {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const routeState = location.state as { type?: string } | null;
  const isAdminPreview = new URLSearchParams(location.search).get("admin_preview") === "1";

  // If CardResolver already confirmed this is a personal profile, skip the DB query entirely
  if (routeState?.type === 'personal' && !isAdminPreview) {
    return <PersonalProfilePage />;
  }

  return <UsernameResolverInner slug={slug} isAdminPreview={isAdminPreview} />;
};

const UsernameResolverInner = memo(({ slug, isAdminPreview }: { slug?: string; isAdminPreview?: boolean }) => {
  const { isAdmin, loading: adminLoading } = useAdminAccess();
  const [loading, setLoading] = useState(true);
  const [resolvedType, setResolvedType] = useState<"personal" | "restaurant" | "notfound" | null>(null);
  const [resolvedProfile, setResolvedProfile] = useState<CachedProfile | null>(null);
  const [adminPreviewActive, setAdminPreviewActive] = useState(false);

  useEffect(() => {
    // Wait until admin status is resolved so we can auto-fallback to admin
    // preview mode when the slug isn't publicly visible.
    if (adminLoading) return;

    const resolve = async () => {
      if (!slug) {
        setResolvedType("notfound");
        setLoading(false);
        return;
      }

      const lowerSlug = slug.toLowerCase();

      // Admin preview: bypass the public gate and read from personal_profiles directly
      if (isAdminPreview && isAdmin) {
        const { data: adminProfile } = await supabase
          .from("personal_profiles")
          .select(PROFILE_COLUMNS)
          .eq("username", lowerSlug)
          .maybeSingle();

        if (adminProfile) {
          setResolvedProfile(adminProfile as unknown as CachedProfile);
          setResolvedType("personal");
          setAdminPreviewActive(true);
          setLoading(false);
          return;
        }
      }

      // Reserved usernames should not match personal profiles
      if (isUsernameReserved(slug)) {
        const { data: restaurant } = await supabase
          .rpc("get_public_restaurant_hub", { _slug: lowerSlug });

        setResolvedType(restaurant && restaurant.length > 0 ? "restaurant" : "notfound");
        setLoading(false);
        return;
      }

      const { data: profileRows, error: profileError } = await supabase
        .rpc("get_public_personal_profile", { _slug: lowerSlug });
      if (profileError) {
        console.error("[UsernameResolver] public profile RPC failed", profileError);
      }
      const profile = Array.isArray(profileRows) && profileRows.length > 0 ? profileRows[0] : null;

      const isPubliclyVisible =
        profile?.subscription_status === "active" ||
        (profile?.subscription_status === "trialing" && (profile as { is_approved?: boolean }).is_approved === true);

      if (isPubliclyVisible) {
        setResolvedProfile(profile as unknown as CachedProfile);
        setResolvedType("personal");
        setLoading(false);
        return;
      }

      // Not publicly visible — if the viewer is a verified admin OR the
      // rep who owns this demo, auto-enter preview mode against the plain
      // slug. RLS on personal_profiles restricts this select to owner /
      // admin / linked sales_rep_id, so a row only comes back for someone
      // authorized to preview it.
      const { data: adminProfile } = await supabase
        .from("personal_profiles")
        .select(PROFILE_COLUMNS)
        .eq("username", lowerSlug)
        .maybeSingle();
      if (adminProfile) {
        setResolvedProfile(adminProfile as unknown as CachedProfile);
        setResolvedType("personal");
        setAdminPreviewActive(true);
        setLoading(false);
        return;
      }

      const { data: restaurant } = await supabase
        .rpc("get_public_restaurant_hub", { _slug: lowerSlug });

      setResolvedType(restaurant && restaurant.length > 0 ? "restaurant" : "notfound");
      setLoading(false);
    };

    resolve();
  }, [slug, isAdminPreview, isAdmin, adminLoading]);

  if (loading) {
    return <MinimalLoader />;
  }

  if (resolvedType === "personal") {
    return (
      <>
        {adminPreviewActive && <AdminPreviewRibbon />}
        <PersonalProfilePage initialProfile={resolvedProfile ?? undefined} />
      </>
    );
  }

  if (resolvedType === "restaurant") {
    return (
      <Suspense fallback={<MinimalLoader />}>
        <ReviewHub />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<MinimalLoader />}>
      <NotFound />
    </Suspense>
  );
});

export default memo(UsernameResolver);
