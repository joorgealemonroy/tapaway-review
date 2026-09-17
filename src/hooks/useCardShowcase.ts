import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { CardDesign } from "@/types/cardShowcase";

const publicUrl = (path: string | null) => {
  if (!path) return null;
  return supabase.storage.from("restaurant-logos").getPublicUrl(path).data.publicUrl;
};

export const useCardShowcase = (includeDisabled = false) => {
  const [designs, setDesigns] = useState<CardDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("card_showcase_items")
      .select("id,business_name,front_image_path,back_image_path,is_enabled,sort_order")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (!includeDisabled) query = query.eq("is_enabled", true);
    const { data, error: queryError } = await query;
    if (queryError) {
      setError(queryError.message);
      setDesigns([]);
    } else {
      setError(null);
      setDesigns((data ?? []).map((item) => ({
        id: item.id,
        businessName: item.business_name,
        frontImageUrl: publicUrl(item.front_image_path) ?? "",
        backImageUrl: publicUrl(item.back_image_path),
        frontImagePath: item.front_image_path,
        backImagePath: item.back_image_path,
        enabled: item.is_enabled,
        sortOrder: item.sort_order,
      })));
    }
    setLoading(false);
  }, [includeDisabled]);

  useEffect(() => { void load(); }, [load]);

  return { designs, loading, error, reload: load };
};
