import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface AffiliateInfo {
  id: string;
  referral_code: string;
  max_invites: number | null;
  is_active: boolean;
}

export const useAffiliateAccess = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAffiliate, setIsAffiliate] = useState(false);
  const [affiliateInfo, setAffiliateInfo] = useState<AffiliateInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      if (authLoading) return;
      if (!user) {
        setIsAffiliate(false);
        setAffiliateInfo(null);
        setLoading(false);
        return;
      }

      try {
        const { data } = await supabase
          .from("affiliates")
          .select("id, referral_code, max_invites, is_active")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .maybeSingle();

        setIsAffiliate(!!data);
        setAffiliateInfo(data);
      } catch {
        setIsAffiliate(false);
        setAffiliateInfo(null);
      }
      setLoading(false);
    };

    check();
  }, [user, authLoading]);

  return { isAffiliate, affiliateInfo, loading };
};
