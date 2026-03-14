import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Globe, Sparkles, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ProfilePreviewPanel } from "@/components/personal/ProfilePreviewPanel";

interface ScrapedLink {
  label: string;
  url: string;
  type: string;
  imageUrl?: string | null;
}

interface ScrapedData {
  name: string;
  bio: string | null;
  photoUrl: string | null;
  links: ScrapedLink[];
  socialLinks: ScrapedLink[];
}

const SUPPORTED_PLATFORMS = [
  { name: "Linktree", domain: "linktr.ee" },
  { name: "Stan Store", domain: "stan.store" },
  { name: "Beacons", domain: "beacons.ai" },
  { name: "lnk.bio", domain: "lnk.bio" },
  { name: "Bio Link", domain: "bio.link" },
  { name: "Campsite", domain: "campsite.bio" },
  { name: "Hoo.be", domain: "hoo.be" },
];


const LOADING_PHASES = [
  "Copying your aesthetic...",
  "Mapping your links...",
  "Building your TapAway...",
];

function detectSourcePlatform(inputUrl: string): string {
  try {
    const hostname = new URL(
      inputUrl.startsWith("http") ? inputUrl : `https://${inputUrl}`
    ).hostname.replace(/^www\./, "");
    const match = SUPPORTED_PLATFORMS.find(
      (p) => hostname === p.domain || hostname.endsWith("." + p.domain)
    );
    return match?.name || "profile";
  } catch {
    return "profile";
  }
}

/* ─── Before Preview (generic/plain) ─── */
const BeforePreview = ({ data, source }: { data: ScrapedData; source: string }) => {
  const imageLinks = [...(data.links || [])].filter(l => l.imageUrl);
  const textLinks = [...(data.links || [])].filter(l => !l.imageUrl);

  return (
    <div className="flex flex-col items-center h-full">
      <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
        Your {source}
      </p>
      <div className="w-full max-w-[260px] rounded-[2rem] border-[5px] border-muted bg-muted/30 shadow-lg overflow-hidden flex-1 max-h-[460px]">
        <div className="h-full overflow-y-auto p-4 flex flex-col items-center">
          {/* Plain avatar */}
          <div className="w-16 h-16 rounded-full bg-muted border-2 border-border overflow-hidden mt-4 mb-2">
            {data.photoUrl ? (
              <img src={data.photoUrl} alt="" className="w-full h-full object-cover opacity-70 grayscale" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-lg font-bold">
                {data.name?.[0] || "?"}
              </div>
            )}
          </div>
          <p className="text-sm font-medium text-muted-foreground mb-1">{data.name || "Your Name"}</p>
          {data.bio && <p className="text-[10px] text-muted-foreground/60 text-center mb-3 line-clamp-2 px-2">{data.bio}</p>}

          {/* Social links */}
          <div className="w-full space-y-1.5 mt-1">
            {data.socialLinks?.map((l, i) => (
              <div key={`s-${i}`} className="w-full py-2 px-3 rounded-md bg-muted/60 border border-border/50 text-center text-[11px] text-muted-foreground truncate">
                {l.type}
              </div>
            ))}
          </div>

          {/* Image links in 2-col grid */}
          {imageLinks.length > 0 && (
            <div className="w-full grid grid-cols-2 gap-1.5 mt-1.5">
              {imageLinks.map((l, i) => (
                <div key={`img-${i}`} className="rounded-lg bg-muted/60 border border-border/50 overflow-hidden">
                  <img src={l.imageUrl!} alt={l.label} className="w-full aspect-square object-cover opacity-70 grayscale" />
                  <p className="text-[9px] text-muted-foreground text-center py-1 px-1 truncate">{l.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Text-only links */}
          {textLinks.length > 0 && (
            <div className="w-full space-y-1.5 mt-1.5">
              {textLinks.map((l, i) => (
                <div key={`l-${i}`} className="w-full py-2 px-3 rounded-md bg-muted/60 border border-border/50 text-center text-[11px] text-muted-foreground truncate">
                  {l.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── Detect if a URL points to a video platform ─── */
function isVideoUrl(url: string): boolean {
  try {
    const h = new URL(url).hostname.replace(/^www\./, "");
    return ["youtube.com", "youtu.be", "vimeo.com", "twitch.tv", "rumble.com"].some(
      (d) => h === d || h.endsWith("." + d)
    );
  } catch {
    return false;
  }
}

/* ─── Convert scraped data → ProfilePreviewPanel props ─── */
function scrapedToPreviewProps(data: ScrapedData) {
  const profile = {
    id: "import-preview",
    full_name: data.name || "Your Name",
    username: "preview",
    bio: data.bio,
    profile_photo_url: data.photoUrl,
    header_type: "color" as const,
    header_color: "#6366f1",
    background_color: "#000000",
  };

  // Social platform types for dedup detection
  const socialTypes = new Set(["instagram", "tiktok", "x", "youtube", "spotify", "facebook", "linkedin", "snapchat", "pinterest", "soundcloud"]);
  const socialPlatformsInBar = new Set((data.socialLinks || []).map(l => l.type));

  // Pass 1: detect which image links can be paired into a grid
  const rawLinks = data.links || [];
  const imageIndices: number[] = [];
  rawLinks.forEach((l, i) => { if (l.imageUrl) imageIndices.push(i); });

  // Pair consecutive image links into grid groups
  const gridIndices = new Set<number>();
  for (let k = 0; k + 1 < imageIndices.length; k += 2) {
    gridIndices.add(imageIndices[k]);
    gridIndices.add(imageIndices[k + 1]);
  }

  // Pass 2: build content links with proper display styles
  // Track which social platforms have a content link → mark first as "both"
  const bothPlatforms = new Set<string>();
  const contentLinks = rawLinks.map((l, i) => {
    const hasImage = !!l.imageUrl;
    const isSocialType = socialTypes.has(l.type);
    const existsInIconBar = socialPlatformsInBar.has(l.type);

    // Rule: Social dedup — if this platform is in icon bar AND is a content link, first one gets "both"
    let markBoth = false;
    if (isSocialType && existsInIconBar && !bothPlatforms.has(l.type)) {
      markBoth = true;
      bothPlatforms.add(l.type);
    }

    // Rule A: Grid — image link that's part of a pair
    const isGrid = gridIndices.has(i) && hasImage;

    let displayStyle: string;
    let gridSize: string | null = null;
    let coverImageUrl: string | null = null;
    let thumbnailUrl: string | null = null;

    if (isGrid) {
      displayStyle = markBoth ? "both" : "pill";
      gridSize = "half";
      coverImageUrl = l.imageUrl!;
    } else if (markBoth) {
      displayStyle = "both";
      thumbnailUrl = hasImage ? l.imageUrl! : null;
    } else if (hasImage) {
      // Rule C: pill with thumbnail
      displayStyle = "pill";
      thumbnailUrl = l.imageUrl!;
    } else {
      displayStyle = "pill";
    }

    return {
      id: `link-${i}`,
      label: l.label,
      url: l.url,
      link_type: l.type,
      is_active: true,
      is_featured: false,
      display_style: displayStyle as string | null,
      sort_order: 100 + i,
      pill_color: null as string | null,
      cover_image_url: coverImageUrl,
      grid_size: gridSize as string | null,
      thumbnail_url: thumbnailUrl as string | null,
    };
  });

  const socialLinks = (data.socialLinks || [])
    .filter(l => !bothPlatforms.has(l.type))
    .map((l, i) => ({
      id: `social-${i}`,
      label: l.label || l.type,
      url: l.url,
      link_type: l.type,
      is_active: true,
      is_featured: false,
      display_style: "icon" as string | null,
      sort_order: i,
      pill_color: null as string | null,
      cover_image_url: null as string | null,
      grid_size: null as string | null,
      thumbnail_url: null as string | null,
    }));

  const allLinks = [...socialLinks, ...contentLinks];

  type BlockType = { id: string; block_type: string; content: Record<string, unknown>; is_active?: boolean | null; sort_order: number; alignment?: string | null };
  return { profile, links: allLinks, blocks: [] as BlockType[] };
}

const ImportProfile = () => {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ScrapedData | null>(null);
  const [progress, setProgress] = useState(0);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [sourcePlatform, setSourcePlatform] = useState("");

  // Animated progress during loading
  useEffect(() => {
    if (!isLoading) {
      setProgress(0);
      setPhaseIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return 95; // cap until done
        const increment = prev < 40 ? 2 : prev < 75 ? 1.5 : 0.8;
        const next = prev + increment;
        // Update phase
        if (next >= 75) setPhaseIndex(2);
        else if (next >= 40) setPhaseIndex(1);
        else setPhaseIndex(0);
        return next;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleImport = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsLoading(true);
    setResult(null);
    setSourcePlatform(detectSourcePlatform(url.trim()));

    try {
      const { data, error } = await supabase.functions.invoke("scrape-link-bio", {
        body: { url: url.trim() },
      });

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Failed to import");

      // Finish progress animation
      setProgress(100);
      await new Promise((r) => setTimeout(r, 400));

      setResult(data.data);

      const totalLinks = (data.data.links?.length || 0) + (data.data.socialLinks?.length || 0);
      if (totalLinks === 0) {
        toast.info("We found your profile but couldn't detect any links. You can add them manually.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to import profile");
    } finally {
      setIsLoading(false);
    }
  }, [url]);

  const handleClaimPage = useCallback(() => {
    if (!result) return;
    // Build full layout-aware link data for signup prefill
    const { links: mappedLinks } = scrapedToPreviewProps(result);
    const allLinks = mappedLinks.map(l => ({
      label: l.label,
      url: l.url,
      type: l.link_type,
      imageUrl: l.cover_image_url || l.thumbnail_url || null,
      displayHint: l.cover_image_url ? "cover" : l.thumbnail_url ? "thumbnail" : "pill",
      displayStyle: l.display_style,
      gridSize: l.grid_size,
    }));
    sessionStorage.setItem(
      "tapaway_import_data",
      JSON.stringify({
        name: result.name,
        bio: result.bio,
        photoUrl: result.photoUrl,
        links: allLinks,
      })
    );
    navigate("/personal/signup");
  }, [result, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border/50 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button
            onClick={() => navigate("/personal/signup")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Start Fresh →
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center px-4 py-8 md:py-12">
        <div className="w-full max-w-3xl">
          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              Magic Import
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              Bring your links to TapAway
            </h1>
            <p className="text-muted-foreground">
              Paste your bio-link URL and see the upgrade instantly.
            </p>
          </motion.div>

          {/* URL Input */}
          <motion.form
            onSubmit={handleImport}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="max-w-lg mx-auto mb-6"
          >
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="linktr.ee/yourname"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="pl-9"
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" disabled={isLoading || !url.trim()}>
                {isLoading ? "Importing..." : "Import"}
                {!isLoading && <ArrowRight className="w-4 h-4 ml-1" />}
              </Button>
            </div>
          </motion.form>

          {/* Supported platforms */}
          <AnimatePresence>
            {!result && !isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center mb-8"
              >
                <p className="text-xs text-muted-foreground mb-2">Works with:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {SUPPORTED_PLATFORMS.map((p) => (
                    <span
                      key={p.domain}
                      className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium"
                    >
                      {p.name}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading State */}
          <AnimatePresence>
            {isLoading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-md mx-auto text-center space-y-4 py-8"
              >
                <div className="relative">
                  <Progress value={progress} className="h-2 bg-muted" />
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-primary/20 to-transparent animate-pulse" />
                </div>
                <motion.p
                  key={phaseIndex}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm font-medium text-foreground"
                >
                  {LOADING_PHASES[phaseIndex]}
                </motion.p>
                <p className="text-xs text-muted-foreground">
                  Scanning {sourcePlatform}…
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results — Split Screen */}
          <AnimatePresence mode="wait">
            {result && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Source badge */}
                <div className="text-center">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                    <ExternalLink className="w-3 h-3" />
                    Imported from {sourcePlatform}
                  </span>
                </div>

                {/* Before / After */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-start">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <BeforePreview data={result} source={sourcePlatform} />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 }}
                  >
                    {(() => {
                      const { profile, links, blocks } = scrapedToPreviewProps(result);
                      return (
                        <div className="flex flex-col items-center h-full">
                          <p className="text-xs font-medium text-primary mb-3 uppercase tracking-wider">
                            Your TapAway
                          </p>
                          <ProfilePreviewPanel profile={profile} links={links} blocks={blocks} />
                        </div>
                      );
                    })()}
                  </motion.div>
                </div>

                {/* CTA */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex flex-col items-center gap-3 pt-2"
                >
                  <Button
                    onClick={handleClaimPage}
                    size="lg"
                    className="w-full max-w-sm text-base bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
                  >
                    This looks better — Claim my Page
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                  <button
                    onClick={() => navigate("/personal/signup")}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
                  >
                    Start fresh instead
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default ImportProfile;
