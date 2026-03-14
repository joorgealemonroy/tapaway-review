import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Globe, Sparkles, Instagram, Youtube, Music, Facebook, Linkedin, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getPlatformConfig, PLATFORM_COLORS, detectPlatformFromUrl } from "@/lib/platformLinks";

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
  "Analyzing your profile...",
  "Fetching your aesthetic...",
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

/* ─── After Preview (TapAway styled) ─── */
const AfterPreview = ({ data }: { data: ScrapedData }) => {
  const getSocialIcon = (type: string) => {
    const config = getPlatformConfig(type);
    if (!config) return null;
    const IconComponent = config.icon;
    return <IconComponent className="w-3.5 h-3.5" />;
  };

  const getSocialStyle = (type: string): React.CSSProperties => {
    const config = getPlatformConfig(type);
    if (!config) return { background: "#374151" };
    if (config.gradient && type === "instagram") {
      return { background: PLATFORM_COLORS.instagramGradient };
    }
    const colorKey = type as keyof typeof PLATFORM_COLORS;
    return { background: PLATFORM_COLORS[colorKey] || "#374151" };
  };

  const getLinkIcon = (link: ScrapedLink) => {
    const platform = detectPlatformFromUrl(link.url);
    if (platform) {
      const config = getPlatformConfig(platform);
      if (config) {
        const IconComponent = config.icon;
        return <IconComponent className="w-4 h-4 text-white/70" />;
      }
    }
    return <ExternalLink className="w-4 h-4 text-white/40" />;
  };

  return (
    <div className="flex flex-col items-center h-full">
      <p className="text-xs font-medium text-primary mb-3 uppercase tracking-wider">
        Your TapAway
      </p>
      <div className="w-full max-w-[260px] rounded-[2rem] border-[5px] border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden flex-1 max-h-[460px]">
        <div className="h-full overflow-y-auto">
          {/* Banner */}
          <div className="h-28 bg-gradient-to-br from-cyan-500 to-blue-600 relative">
            <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-zinc-950 to-transparent" />
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
              <div className="w-[68px] h-[68px] rounded-full border-[3px] border-zinc-950 overflow-hidden bg-zinc-800 shadow-lg">
                {data.photoUrl ? (
                  <img src={data.photoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-400 text-lg font-bold">
                    {data.name?.[0] || "?"}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="px-4 pt-11 pb-4 flex flex-col items-center">
            <p className="text-sm font-semibold text-white mb-0.5">{data.name || "Your Name"}</p>
            {data.bio && <p className="text-[10px] text-zinc-400 text-center mb-3 line-clamp-2">{data.bio}</p>}

            {/* Social icon row — branded circles */}
            {data.socialLinks?.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1.5 mb-3">
                {data.socialLinks.map((link, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-sm"
                    style={getSocialStyle(link.type)}
                    title={link.type}
                  >
                    {getSocialIcon(link.type) || <Globe className="w-3.5 h-3.5" />}
                  </div>
                ))}
              </div>
            )}

            {/* Image card links in 2-col grid */}
            {(() => {
              const imageLinks = data.links?.filter(l => l.imageUrl) || [];
              const textLinks = data.links?.filter(l => !l.imageUrl) || [];
              return (
                <>
                  {imageLinks.length > 0 && (
                    <div className="w-full grid grid-cols-2 gap-2 mb-2">
                      {imageLinks.map((link, i) => (
                        <div key={`img-${i}`} className="rounded-2xl overflow-hidden bg-white/[0.08] border border-white/[0.08]">
                          <img src={link.imageUrl!} alt={link.label} className="w-full aspect-square object-cover" />
                          <div className="px-2 py-1.5 flex items-center gap-1.5">
                            {getLinkIcon(link)}
                            <span className="text-[10px] font-medium text-zinc-200 truncate flex-1">{link.label}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Glass pill links */}
                  <div className="w-full space-y-2">
                    {textLinks.map((link, i) => (
                      <div
                        key={`txt-${i}`}
                        className="w-full py-3 px-3.5 rounded-2xl bg-white/[0.08] border border-white/[0.08] flex items-center gap-3"
                      >
                        {getLinkIcon(link)}
                        <span className="flex-1 text-[11px] font-medium text-zinc-200 truncate">
                          {link.label}
                        </span>
                        <ExternalLink className="w-3 h-3 text-white/25 shrink-0" />
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};

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
    const allLinks = [...(result.socialLinks || []), ...(result.links || [])].map(l => ({
      label: l.label,
      url: l.url,
      type: l.type,
      imageUrl: l.imageUrl || null,
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
                    <AfterPreview data={result} />
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
