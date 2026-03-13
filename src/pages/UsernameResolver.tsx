import { useEffect, useState, memo } from "react";
import { useParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { isUsernameReserved } from "@/lib/reservedUsernames";
import PersonalProfilePage from "./personal/PersonalProfilePage";
import { lazy, Suspense } from "react";

// Lazy load ReviewHub since it's less common and heavier
const ReviewHub = lazy(() => import("./ReviewHub"));
const NotFound = lazy(() => import("./NotFound"));

// Minimal loading state
const MinimalLoader = memo(() => (
  <div className="min-h-screen bg-black flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-white/60" />
  </div>
));

const UsernameResolver = () => {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const routeState = location.state as { type?: string } | null;

  // If CardResolver already confirmed this is a personal profile, skip the DB query entirely
  if (routeState?.type === 'personal') {
    return <PersonalProfilePage />;
  }

  return <UsernameResolverInner slug={slug} />;
};

const UsernameResolverInner = memo(({ slug }: { slug?: string }) => {
  const [loading, setLoading] = useState(true);
  const [resolvedType, setResolvedType] = useState<"personal" | "restaurant" | "notfound" | null>(null);

  useEffect(() => {
    const resolve = async () => {
      if (!slug) {
        setResolvedType("notfound");
        setLoading(false);
        return;
      }

      const lowerSlug = slug.toLowerCase();

      // Reserved usernames should not match personal profiles
      if (isUsernameReserved(slug)) {
        // Check restaurant slug
        const { data: restaurant } = await supabase
          .from("restaurant_public_info")
          .select("id")
          .eq("custom_slug", lowerSlug)
          .maybeSingle();

        setResolvedType(restaurant ? "restaurant" : "notfound");
        setLoading(false);
        return;
      }

      // Check personal profile first (most common, optimized with index)
      const { data: profile } = await supabase
        .from("personal_profiles")
        .select("id, subscription_status")
        .eq("username", lowerSlug)
        .maybeSingle();

      if (profile?.subscription_status === "active") {
        setResolvedType("personal");
        setLoading(false);
        return;
      }

      // Check restaurant slug as fallback
      const { data: restaurant } = await supabase
        .from("restaurant_public_info")
        .select("id")
        .eq("custom_slug", lowerSlug)
        .maybeSingle();

      setResolvedType(restaurant ? "restaurant" : "notfound");
      setLoading(false);
    };

    resolve();
  }, [slug]);

  if (loading) {
    return <MinimalLoader />;
  }

  if (resolvedType === "personal") {
    return <PersonalProfilePage />;
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
