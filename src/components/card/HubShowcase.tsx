import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getOptimizedImageUrl } from "@/components/personal/OptimizedImage";
import { ExternalLink, Copy, Check, Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface ShowcaseLink {
  link_type: string;
  label: string;
  display_style: string | null;
  grid_size: string | null;
  is_featured: boolean | null;
  sort_order: number | null;
  pill_color: string | null;
}

interface ShowcaseBlock {
  block_type: string;
  sort_order: number;
  alignment: string | null;
}

interface ShowcaseProfile {
  id: string;
  username: string;
  full_name: string;
  headline: string | null;
  profile_photo_url: string | null;
  header_type: string | null;
  header_color: string | null;
  background_color: string | null;
  plan_type: string | null;
  links: ShowcaseLink[];
  blocks: ShowcaseBlock[];
}

const usesPremiumFeatures = (profile: ShowcaseProfile): boolean => {
  const premiumHeader = profile.header_type === "image" || profile.header_type === "banner";
  const tooManyLinks = profile.links.length > 5;
  return premiumHeader || tooManyLinks;
};

const BLOCK_PLACEHOLDER_CONTENT: Record<string, Record<string, string>> = {
  text: { title: "About Me", body: "Add your own text here." },
  image: { url: "", caption: "Add your photo" },
  youtube: { url: "", caption: "Add your video" },
  button: { label: "My Link", url: "" },
};

interface Props {
  onCopyLayout?: () => void;
}

const SkeletonCard = () => (
  <div className="snap-start flex-shrink-0 w-[160px] rounded-2xl border-2 border-border bg-card p-3 flex flex-col items-center gap-2">
    <Skeleton className="h-16 w-16 rounded-full" />
    <Skeleton className="h-4 w-24" />
    <Skeleton className="h-3 w-20" />
    <Skeleton className="h-3 w-12" />
    <Skeleton className="h-7 w-full rounded-lg mt-1" />
  </div>
);

export const HubShowcase = ({ onCopyLayout }: Props) => {
  const [profiles, setProfiles] = useState<ShowcaseProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const detailsLoaded = useRef(false);

  // Phase 1: fetch profiles only
  useEffect(() => {
    const fetchProfiles = async () => {
      const { data: profileData } = await supabase
        .from("personal_profiles_public")
        .select("id, username, full_name, headline, profile_photo_url, header_type, header_color, background_color, plan_type")
        .eq("subscription_status", "active")
        .not("profile_photo_url", "is", null)
        .not("username", "in", '("lovie","tapjorge","tapaway")')
        .limit(6);

      if (!profileData || profileData.length === 0) {
        setLoading(false);
        return;
      }

      const initial: ShowcaseProfile[] = profileData.map((p) => ({
        ...p,
        id: p.id!,
        links: [],
        blocks: [],
      }));

      setProfiles(initial);
      setLoading(false);

      // Phase 2: fetch links+blocks in background
      const profileIds = profileData.map((p) => p.id).filter(Boolean) as string[];
      const [linksRes, blocksRes] = await Promise.all([
        supabase
          .from("personal_links")
          .select("profile_id, link_type, label, display_style, grid_size, is_featured, sort_order, pill_color")
          .in("profile_id", profileIds)
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        supabase
          .from("personal_blocks")
          .select("profile_id, block_type, sort_order, alignment")
          .in("profile_id", profileIds)
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
      ]);

      const linksMap = new Map<string, ShowcaseLink[]>();
      (linksRes.data || []).forEach((l) => {
        const arr = linksMap.get(l.profile_id) || [];
        arr.push({ link_type: l.link_type, label: l.label, display_style: l.display_style, grid_size: l.grid_size, is_featured: l.is_featured, sort_order: l.sort_order, pill_color: l.pill_color });
        linksMap.set(l.profile_id, arr);
      });

      const blocksMap = new Map<string, ShowcaseBlock[]>();
      (blocksRes.data || []).forEach((b) => {
        const arr = blocksMap.get(b.profile_id) || [];
        arr.push({ block_type: b.block_type, sort_order: b.sort_order, alignment: b.alignment });
        blocksMap.set(b.profile_id, arr);
      });

      setProfiles((prev) =>
        prev.map((p) => ({
          ...p,
          links: linksMap.get(p.id) || [],
          blocks: blocksMap.get(p.id) || [],
        })).sort((a, b) => {
          const aPremium = usesPremiumFeatures(a);
          const bPremium = usesPremiumFeatures(b);
          if (aPremium === bPremium) return 0;
          return aPremium ? 1 : -1;
        })
      );
      detailsLoaded.current = true;
    };
    fetchProfiles();
  }, []);

  const handleCopyLayout = useCallback((profile: ShowcaseProfile) => {
    const copiedLayout = {
      id: `copied-${profile.username}`,
      name: `${profile.full_name}'s Layout`,
      description: `Copied from ${profile.full_name}`,
      emoji: "📋",
      defaultLinks: profile.links.map((l) => ({
        type: l.link_type, label: l.label, placeholder: "",
        displayStyle: l.display_style || undefined, pillColor: l.pill_color || undefined,
        gridSize: l.grid_size || undefined, isFeatured: l.is_featured || undefined,
        sortOrder: l.sort_order ?? undefined,
      })),
      defaultBlocks: profile.blocks.map((b) => ({
        type: b.block_type as "youtube" | "image" | "text" | "button",
        content: { ...(BLOCK_PLACEHOLDER_CONTENT[b.block_type] || {}), ...(b.alignment ? { alignment: b.alignment } : {}) },
        sortOrder: b.sort_order,
      })),
      headerType: (profile.header_type as "color" | "image" | "banner") || "color",
      style: { bgColor: profile.background_color || "#ffffff", headerColor: profile.header_color || "#333333" },
    };

    sessionStorage.setItem("tapaway_copied_layout", JSON.stringify(copiedLayout));
    sessionStorage.removeItem("tapaway_selected_layout");
    setCopiedId(profile.id);
    const isVipCard = sessionStorage.getItem("tapaway_card_vip") === "true";
    if (isVipCard) {
      toast.success("Layout copied!");
    } else {
      toast.success("Layout copied! Requires Pro — 7-day free trial included.");
    }
    onCopyLayout?.();
  }, [onCopyLayout]);

  if (!loading && profiles.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-foreground">Real Hubs, Real People</h2>
        <p className="text-sm text-muted-foreground mt-1">These layouts require Pro — try free for 7 days, cancel anytime</p>
      </div>

      <div className="flex gap-3 overflow-x-auto pt-2 pb-2 snap-x snap-mandatory scrollbar-hide -mx-6 px-6">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          profiles.map((p, i) => {
            const isCopied = copiedId === p.id;
            const isPremium = usesPremiumFeatures(p);
            return (
              <div
                key={p.username}
                className={`snap-start flex-shrink-0 w-[160px] rounded-2xl border-2 bg-card p-3 flex flex-col items-center gap-2 transition-all relative ${
                  isCopied ? "border-primary shadow-md" : "border-border hover:shadow-md"
                }`}
              >
                {isPremium && (
                  <Badge className="absolute -top-2 -right-2 bg-accent text-accent-foreground text-[10px] px-1.5 py-0 gap-0.5 border-0">
                    <Crown className="h-2.5 w-2.5" />
                    Pro
                  </Badge>
                )}
                <a href={`/${p.username}`} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 group">
                  <div className="h-16 w-16 rounded-full overflow-hidden bg-muted">
                    {p.profile_photo_url && (
                      <img
                        src={getOptimizedImageUrl(p.profile_photo_url, 128, 85)}
                        alt={p.full_name}
                        className="w-full h-full object-cover"
                        loading={i < 2 ? "eager" : "lazy"}
                      />
                    )}
                  </div>
                  <div className="text-center min-w-0 w-full">
                    <p className="text-sm font-semibold text-foreground truncate">{p.full_name}</p>
                    {p.headline && <p className="text-xs text-muted-foreground truncate">{p.headline}</p>}
                  </div>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1 group-hover:text-primary transition-colors">
                    View <ExternalLink className="h-2.5 w-2.5" />
                  </span>
                </a>

                <button
                  onClick={() => {
                    if (copiedId === p.id) {
                      sessionStorage.removeItem("tapaway_copied_layout");
                      setCopiedId(null);
                      toast("Layout removed");
                    } else {
                      handleCopyLayout(p);
                    }
                  }}
                  className={`w-full mt-1 py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                    isCopied ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted-foreground/10 text-foreground"
                  }`}
                >
                  {isCopied ? (<><Check className="h-3 w-3" />Copied</>) : (<><Copy className="h-3 w-3" />Copy Layout</>)}
                </button>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};