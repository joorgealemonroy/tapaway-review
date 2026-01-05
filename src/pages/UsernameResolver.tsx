import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { isUsernameReserved } from "@/lib/reservedUsernames";
import PersonalProfilePage from "./personal/PersonalProfilePage";
import ReviewHub from "./ReviewHub";
import NotFound from "./NotFound";

/**
 * UsernameResolver - Determines if /:slug is a personal profile or restaurant hub
 * Priority: personal profiles > restaurant slugs
 */
const UsernameResolver = () => {
  const { slug } = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(true);
  const [resolvedType, setResolvedType] = useState<"personal" | "restaurant" | "notfound" | null>(null);

  useEffect(() => {
    const resolve = async () => {
      if (!slug) {
        setResolvedType("notfound");
        setLoading(false);
        return;
      }

      // Reserved usernames should not match personal profiles
      if (isUsernameReserved(slug)) {
        // Could still be a restaurant slug
        const { data: restaurant } = await supabase
          .from("restaurants")
          .select("id")
          .eq("custom_slug", slug.toLowerCase())
          .single();

        if (restaurant) {
          setResolvedType("restaurant");
        } else {
          setResolvedType("notfound");
        }
        setLoading(false);
        return;
      }

      // Check if it's a personal profile username first (priority)
      const { data: profile } = await supabase
        .from("personal_profiles")
        .select("id, subscription_status")
        .eq("username", slug.toLowerCase())
        .single();

      if (profile && profile.subscription_status === "active") {
        setResolvedType("personal");
        setLoading(false);
        return;
      }

      // Check if it's a restaurant slug
      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("id")
        .eq("custom_slug", slug.toLowerCase())
        .single();

      if (restaurant) {
        setResolvedType("restaurant");
        setLoading(false);
        return;
      }

      // Not found
      setResolvedType("notfound");
      setLoading(false);
    };

    resolve();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (resolvedType === "personal") {
    return <PersonalProfilePage />;
  }

  if (resolvedType === "restaurant") {
    return <ReviewHub />;
  }

  return <NotFound />;
};

export default UsernameResolver;
