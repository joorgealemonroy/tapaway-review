import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { CardDesign, HubPreviewAction, HubPreviewData } from "@/types/cardShowcase";

const publicUrl = (path: string | null) => {
  if (!path) return null;
  return supabase.storage.from("restaurant-logos").getPublicUrl(path).data.publicUrl;
};

const restaurantActions = (hub: Record<string, unknown>): HubPreviewAction[] => [
  { id: "google-review", type: "google_review", label: "Leave a Google Review", url: hub.google_review_url },
  { id: "yelp", type: "yelp", label: "Find Us on Yelp", url: hub.yelp_review_url },
  { id: "instagram", type: "instagram", label: "Follow Us on Instagram", url: hub.instagram_url },
  { id: "directions", type: "directions", label: "Get Directions", url: hub.directions_url },
  { id: "phone", type: "phone", label: "Call to Place an Order", url: hub.business_phone || hub.phone ? `tel:${hub.business_phone || hub.phone}` : null },
].filter((action): action is HubPreviewAction => typeof action.url === "string" && action.url.length > 0);

const loadHubPreview = async (item: { hub_kind: string | null; hub_id: string | null; hub_slug: string | null }): Promise<HubPreviewData | null> => {
  if (!item.hub_kind || !item.hub_id || !item.hub_slug) return null;

  if (item.hub_kind === "restaurant") {
    const { data } = await supabase.rpc("get_public_restaurant_hub", { _id: item.hub_id, _slug: item.hub_slug });
    const hub = Array.isArray(data) ? data[0] : null;
    if (!hub) return null;
    const record = hub as unknown as Record<string, unknown>;
    return {
      name: String(record.restaurant_name || item.hub_slug),
      description: typeof record.header_subtitle === "string" && record.header_subtitle ? record.header_subtitle : typeof record.header_title === "string" ? record.header_title : null,
      logoUrl: typeof record.logo_url === "string" ? record.logo_url : null,
      actions: restaurantActions(record),
    };
  }

  const [{ data: profileRows }, { data: links }, { data: blocks }] = await Promise.all([
    supabase.rpc("get_public_personal_profile", { _slug: item.hub_slug }),
    supabase
      .from("personal_links")
      .select("id,link_type,label,url,pill_color,sort_order,is_active,is_featured,display_style,cover_image_url,grid_size,is_archived,thumbnail_url")
      .eq("profile_id", item.hub_id)
      .eq("is_active", true)
      .or("is_archived.is.null,is_archived.eq.false")
      .order("sort_order", { ascending: true }),
    supabase
      .from("personal_blocks")
      .select("id,block_type,content,alignment,sort_order,is_archived")
      .eq("profile_id", item.hub_id)
      .eq("is_active", true)
      .or("is_archived.is.null,is_archived.eq.false")
      .order("sort_order", { ascending: true }),
  ]);
  const profile = Array.isArray(profileRows) ? profileRows[0] : null;
  if (!profile) return null;
  const activeLinks = links ?? [];
  return {
    name: profile.full_name || item.hub_slug,
    description: profile.headline || profile.bio || null,
    logoUrl: profile.profile_photo_url || null,
    actions: activeLinks.slice(0, 4).map((link) => ({ id: link.id, type: link.link_type, label: link.label, url: link.url })),
    profile,
    links: activeLinks,
    blocks: (blocks ?? []).map((block) => ({ ...block, content: block.content ?? {} })),
  };
};

export const useCardShowcase = (includeDisabled = false) => {
  const [designs, setDesigns] = useState<CardDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("card_showcase_items")
      .select("id,business_name,front_image_path,back_image_path,is_enabled,sort_order,hub_kind,hub_id,hub_slug,hub_screenshot_path")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (!includeDisabled) query = query.eq("is_enabled", true);
    const { data, error: queryError } = await query;
    if (queryError) {
      setError(queryError.message);
      setDesigns([]);
    } else {
      setError(null);
      const previews = await Promise.all((data ?? []).map((item) => loadHubPreview(item).catch(() => null)));
      setDesigns((data ?? []).map((item, index) => ({
        id: item.id,
        businessName: item.business_name,
        frontImageUrl: publicUrl(item.front_image_path) ?? "",
        backImageUrl: publicUrl(item.back_image_path),
        frontImagePath: item.front_image_path,
        backImagePath: item.back_image_path,
        enabled: item.is_enabled,
        sortOrder: item.sort_order,
          hubKind: item.hub_kind === "personal" || item.hub_kind === "restaurant" ? item.hub_kind : null,
          hubId: item.hub_id,
          hubSlug: item.hub_slug,
          hubUrl: item.hub_slug ? `/${item.hub_slug}` : null,
          hubScreenshotPath: item.hub_screenshot_path,
          hubScreenshotUrl: publicUrl(item.hub_screenshot_path),
          hubPreview: previews[index],
      })));
    }
    setLoading(false);
  }, [includeDisabled]);

  useEffect(() => { void load(); }, [load]);

  return { designs, loading, error, reload: load };
};
