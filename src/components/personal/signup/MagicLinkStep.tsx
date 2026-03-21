import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, Sparkles, ArrowRight, LayoutList, LayoutGrid, Check, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getPlatformConfig } from "@/lib/platformLinks";
import { VIBE_TEMPLATES } from "@/lib/vibeTemplates";
import type { PersonalLink, PersonalBlock } from "@/hooks/usePersonalOnboarding";
import type { SignupData } from "@/pages/personal/PersonalSignup";

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
  { name: "Instagram", domain: "instagram.com" },
  { name: "TikTok", domain: "tiktok.com" },
  { name: "YouTube", domain: "youtube.com" },
  { name: "X", domain: "x.com" },
  { name: "Twitter", domain: "twitter.com" },
  { name: "Twitch", domain: "twitch.tv" },
  { name: "Spotify", domain: "spotify.com" },
  { name: "Spotify Web", domain: "open.spotify.com" },
  { name: "Linktree", domain: "linktr.ee" },
  { name: "Stan Store", domain: "stan.store" },
  { name: "Beacons", domain: "beacons.ai" },
  { name: "lnk.bio", domain: "lnk.bio" },
  { name: "Bio Link", domain: "bio.link" },
  { name: "Campsite", domain: "campsite.bio" },
  { name: "Hoo.be", domain: "hoo.be" },
];

const DISPLAY_PLATFORMS = ["Instagram", "TikTok", "YouTube", "X / Twitter", "Twitch", "Spotify"];

const LOADING_PHASES = [
  "Scanning for links...",
  "Mapping your links...",
  "Building your TapAway...",
];

const HANDLE_TYPES = new Set(["instagram", "tiktok", "x", "youtube", "spotify", "snapchat", "twitch", "threads", "linkedin"]);

function detectSourcePlatform(inputUrl: string): string | null {
  try {
    const hostname = new URL(
      inputUrl.startsWith("http") ? inputUrl : `https://${inputUrl}`
    ).hostname.replace(/^www\./, "");
    const match = SUPPORTED_PLATFORMS.find(
      (p) => hostname === p.domain || hostname.endsWith("." + p.domain)
    );
    return match?.name || null;
  } catch {
    return null;
  }
}

interface MagicLinkStepProps {
  formData: SignupData;
  updateFormData: (updates: Partial<SignupData>) => void;
  addLink: (link: Omit<PersonalLink, "id">) => void;
  removeLink: (id: string) => void;
  onNext: () => void;
  onBack: () => void;
}

type Phase = "input" | "loading" | "preview" | "fallback" | "unsupported";

export function MagicLinkStep({ formData, updateFormData, addLink, removeLink, onNext, onBack }: MagicLinkStepProps) {
  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<Phase>("input");
  const [progress, setProgress] = useState(0);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [scrapedData, setScrapedData] = useState<ScrapedData | null>(null);

  // Animated progress during loading
  useEffect(() => {
    if (phase !== "loading") {
      setProgress(0);
      setPhaseIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return 95;
        const increment = prev < 40 ? 2 : prev < 75 ? 1.5 : 0.8;
        const next = prev + increment;
        if (next >= 75) setPhaseIndex(2);
        else if (next >= 40) setPhaseIndex(1);
        else setPhaseIndex(0);
        return next;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [phase]);

  const handleGenerate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    const detected = detectSourcePlatform(url.trim());
    if (!detected) {
      setPhase("unsupported");
      return;
    }

    setPhase("loading");
    setScrapedData(null);

    try {
      const { data, error } = await supabase.functions.invoke("scrape-link-bio", {
        body: { url: url.trim() },
      });

      if (error) throw new Error(error.message);
      if (!data?.success) {
        if (data?.error?.includes("Unsupported platform")) {
          setPhase("unsupported");
          return;
        }
        throw new Error(data?.error || "Failed to import");
      }

      setProgress(100);
      await new Promise((r) => setTimeout(r, 400));
      
      const result = data.data as ScrapedData;
      setScrapedData(result);

      // Update profile with scraped data
      if (result.name) updateFormData({ fullName: result.name });
      if (result.photoUrl) updateFormData({ profilePhotoUrl: result.photoUrl });

      const totalLinks = (result.links?.length || 0) + (result.socialLinks?.length || 0);
      if (totalLinks > 0) {
        setPhase("preview");
      } else {
        // No links found — go to fallback
        setPhase("fallback");
      }
    } catch {
      setPhase("fallback");
    }
  }, [url, updateFormData]);

  const applyLinks = useCallback((data: ScrapedData, choice: "pills" | "cards") => {
    // Clear existing vibe placeholder links
    formData.links.forEach(l => removeLink(l.id));

    const socialTypes = new Set(["instagram", "tiktok", "x", "youtube", "spotify", "facebook", "linkedin", "snapchat", "pinterest", "soundcloud"]);
    const socialPlatformsInBar = new Set((data.socialLinks || []).map(l => l.type));
    const rawLinks = data.links || [];

    // Grid pairing for "cards" mode
    const gridEligibleTypes = new Set(["youtube", "spotify", "soundcloud", "tiktok"]);
    const imageIndices: number[] = [];
    rawLinks.forEach((l, i) => { if (l.imageUrl) imageIndices.push(i); });
    const gridIndices = new Set<number>();
    if (choice === "cards") {
      for (let k = 0; k < imageIndices.length; k++) {
        if (k + 1 < imageIndices.length && rawLinks[imageIndices[k]].type === rawLinks[imageIndices[k + 1]].type && gridEligibleTypes.has(rawLinks[imageIndices[k]].type)) {
          gridIndices.add(imageIndices[k]);
          gridIndices.add(imageIndices[k + 1]);
          k++;
        }
      }
    }

    // Add social-only links as icons
    const bothPlatforms = new Set<string>();
    (data.socialLinks || []).forEach((l, i) => {
      addLink({
        type: l.type,
        label: l.label || (l.type === 'x' ? 'X' : l.type.charAt(0).toUpperCase() + l.type.slice(1)),
        value: "",
        url: l.url,
        displayStyle: "icon",
        sortOrder: i,
      });
    });

    // Add content links
    rawLinks.forEach((l, i) => {
      const isSocialType = socialTypes.has(l.type);
      const existsInIconBar = socialPlatformsInBar.has(l.type);
      let markBoth = false;
      if (isSocialType && existsInIconBar && !bothPlatforms.has(l.type)) {
        markBoth = true;
        bothPlatforms.add(l.type);
      }

      const isGrid = gridIndices.has(i) && !!l.imageUrl;

      if (choice === "pills") {
        addLink({
          type: l.type, label: l.label, value: "", url: l.url,
          displayStyle: markBoth ? "both" : "pill",
          sortOrder: 100 + i,
          coverImageUrl: null, gridSize: null, thumbnailUrl: null,
        });
      } else {
        addLink({
          type: l.type, label: l.label, value: "", url: l.url,
          displayStyle: markBoth ? "both" : "pill",
          sortOrder: 100 + i,
          coverImageUrl: isGrid ? l.imageUrl : null,
          gridSize: isGrid ? "half" : null,
          thumbnailUrl: !isGrid && l.imageUrl ? l.imageUrl : null,
        });
      }
    });

    // Update profile data
    const updates: Partial<SignupData> = {};
    if (data.photoUrl) updates.profilePhotoUrl = data.photoUrl;
    if (data.name && !formData.fullName) updates.fullName = data.name;
    if (data.bio) updates.cardHeadline = data.bio;
    if (Object.keys(updates).length > 0) updateFormData(updates);

    onNext();
  }, [formData, addLink, removeLink, updateFormData, onNext]);

  const handleForkChoice = useCallback((choice: "pills" | "cards") => {
    if (!scrapedData) return;
    applyLinks(scrapedData, choice);
  }, [scrapedData, applyLinks]);

  // Fallback: handle value changes for vibe template links
  const handleFallbackValueChange = useCallback((link: PersonalLink, newValue: string) => {
    const platform = getPlatformConfig(link.type);
    const cleanValue = HANDLE_TYPES.has(link.type) ? newValue.replace(/^@/, "") : newValue;
    const newUrl = platform ? platform.generateUrl(cleanValue) : cleanValue;
    
    // Update the link in formData
    const updatedLinks = formData.links.map(l => 
      l.id === link.id ? { ...l, value: cleanValue, url: newUrl } : l
    );
    updateFormData({ links: updatedLinks });
  }, [formData.links, updateFormData]);

  const handleFallbackContinue = useCallback(() => {
    // Filter out links that have no value/url
    const filledLinks = formData.links.filter(l => l.url && l.url.length > 0 && !l.url.includes("undefined"));
    if (filledLinks.length === 0) {
      toast.info("You can add links later from your dashboard.");
    }
    onNext();
  }, [formData.links, onNext]);

  // Get vibe template links for fallback
  const vibeTemplate = VIBE_TEMPLATES.find(v => v.id === formData.vibeId);

  // Combine all scraped links for the preview
  const allPreviewLinks = scrapedData 
    ? [...(scrapedData.socialLinks || []), ...(scrapedData.links || [])]
    : [];
  const hasContentImages = scrapedData?.links?.some(l => l.imageUrl) || false;

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto px-4">
      <AnimatePresence mode="wait">
        {/* ─── Input Phase ─── */}
        {(phase === "input" || phase === "unsupported") && (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full text-center"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              Smart Scan
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Let's auto-build your profile.
            </h2>
            <p className="text-muted-foreground text-sm mb-6">
              Paste your main social link and we'll do the rest.
            </p>

            <form onSubmit={handleGenerate} className="space-y-3">
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={url}
                  onChange={(e) => { setUrl(e.target.value); if (phase === "unsupported") setPhase("input"); }}
                  placeholder="instagram.com/yourname"
                  className="pl-10 h-12 text-base rounded-xl"
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full h-12 rounded-xl text-base font-semibold gap-2" disabled={!url.trim()}>
                Generate <ArrowRight className="w-4 h-4" />
              </Button>
            </form>

            {phase === "unsupported" && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-destructive mt-3"
              >
                We couldn't scan that link. Try pasting your Instagram, TikTok, or YouTube URL.
              </motion.p>
            )}

            {/* Supported badges */}
            <div className="mt-5">
              <p className="text-xs text-muted-foreground mb-2">Works with:</p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {DISPLAY_PLATFORMS.map((p) => (
                  <span key={p} className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-medium">
                    {p}
                  </span>
                ))}
              </div>
            </div>

            {/* Skip */}
            <button
              onClick={() => setPhase("fallback")}
              className="mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              I'll add links manually →
            </button>
          </motion.div>
        )}

        {/* ─── Loading Phase ─── */}
        {phase === "loading" && (
          <motion.div
            key="loading"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full text-center py-12"
          >
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="w-7 h-7 text-primary" />
              </motion.div>
            </div>
            <AnimatePresence mode="wait">
              <motion.p
                key={phaseIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-foreground font-medium mb-4"
              >
                {LOADING_PHASES[phaseIndex]}
              </motion.p>
            </AnimatePresence>
            <Progress value={progress} className="h-1.5 max-w-xs mx-auto" />
          </motion.div>
        )}

        {/* ─── Preview Phase (Success) ─── */}
        {phase === "preview" && scrapedData && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full text-center"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 text-green-600 text-sm font-medium mb-4">
              <Check className="w-4 h-4" />
              Found!
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              Here's what we found!
            </h2>
            <p className="text-muted-foreground text-sm mb-5">
              {allPreviewLinks.length} link{allPreviewLinks.length !== 1 ? "s" : ""} detected from your profile.
            </p>

            {/* Profile photo preview */}
            {scrapedData.photoUrl && (
              <div className="mb-4 flex justify-center">
                <img
                  src={scrapedData.photoUrl}
                  alt="Profile"
                  className="w-16 h-16 rounded-full object-cover border-2 border-border shadow-sm"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}

            {scrapedData.name && (
              <p className="text-sm font-medium text-foreground mb-4">{scrapedData.name}</p>
            )}

            {/* Scraped links list */}
            <div className="space-y-2 mb-6 max-h-48 overflow-y-auto">
              {allPreviewLinks.map((link, i) => {
                const config = getPlatformConfig(link.type);
                const Icon = config?.icon;
                return (
                  <motion.div
                    key={`${link.url}-${i}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/50 text-left"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: config?.brandColor || 'hsl(var(--muted))' }}
                    >
                      {Icon && <Icon className="w-4 h-4 text-white" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {link.label || link.type.charAt(0).toUpperCase() + link.type.slice(1)}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">{link.url}</p>
                    </div>
                    <Check className="w-4 h-4 text-green-500 shrink-0" />
                  </motion.div>
                );
              })}
            </div>

            {/* Design Fork — only show if content has images */}
            {hasContentImages ? (
              <>
                <p className="text-sm font-medium text-foreground mb-3">
                  How should your links look?
                </p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button
                    onClick={() => handleForkChoice("pills")}
                    className="group p-4 rounded-2xl border-2 border-border hover:border-primary transition-all text-left bg-card"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted mb-2">
                      <LayoutList className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="space-y-1 mb-2">
                      <div className="h-4 rounded-full bg-muted w-full" />
                      <div className="h-4 rounded-full bg-muted w-[85%]" />
                      <div className="h-4 rounded-full bg-muted w-[90%]" />
                    </div>
                    <p className="font-semibold text-xs text-foreground">Clean Pills</p>
                    <p className="text-[10px] text-muted-foreground">Compact & scannable</p>
                  </button>
                  <button
                    onClick={() => handleForkChoice("cards")}
                    className="group p-4 rounded-2xl border-2 border-border hover:border-primary transition-all text-left bg-card"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted mb-2">
                      <LayoutGrid className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="grid grid-cols-2 gap-1 mb-2">
                      <div className="h-8 rounded-lg bg-muted" />
                      <div className="h-8 rounded-lg bg-muted" />
                      <div className="h-4 rounded-lg bg-muted col-span-2" />
                    </div>
                    <p className="font-semibold text-xs text-foreground">Visual Cards</p>
                    <p className="text-[10px] text-muted-foreground">Rich & eye-catching</p>
                  </button>
                </div>
              </>
            ) : (
              <Button
                onClick={() => handleForkChoice("pills")}
                className="w-full h-12 rounded-xl text-base font-semibold gap-2"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </motion.div>
        )}

        {/* ─── Fallback Phase (Failure / Manual Entry) ─── */}
        {phase === "fallback" && (
          <motion.div
            key="fallback"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full text-center"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-sm font-medium mb-4">
              <AlertCircle className="w-4 h-4" />
              Manual Setup
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              {scrapedData?.name ? `Welcome, ${scrapedData.name}!` : "Let's set up your links."}
            </h2>
            <p className="text-muted-foreground text-sm mb-6">
              {scrapedData ? "We grabbed your profile info! Add your links below." : "Add your social links and we'll build your profile."}
            </p>

            {/* Profile photo if scraped */}
            {scrapedData?.photoUrl && (
              <div className="mb-4 flex justify-center">
                <img
                  src={scrapedData.photoUrl}
                  alt="Profile"
                  className="w-16 h-16 rounded-full object-cover border-2 border-border shadow-sm"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}

            {/* Manual link inputs based on vibe template */}
            <div className="space-y-3 text-left mb-6">
              {formData.links.map((link) => {
                const platform = getPlatformConfig(link.type);
                const Icon = platform?.icon;
                const isHandle = HANDLE_TYPES.has(link.type);
                return (
                  <div key={link.id} className="flex items-center gap-2">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: platform?.brandColor || 'hsl(var(--muted))' }}
                    >
                      {Icon && <Icon className="w-5 h-5 text-white" />}
                    </div>
                    <div className="flex-1 relative">
                      {isHandle && (
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">@</span>
                      )}
                      <Input
                        value={link.value || ""}
                        onChange={(e) => handleFallbackValueChange(link, e.target.value)}
                        placeholder={platform?.placeholder || "https://..."}
                        className={`h-10 rounded-xl text-sm ${isHandle ? "pl-8" : ""}`}
                        onFocus={(e) => e.target.select()}
                      />
                    </div>
                    <button
                      onClick={() => removeLink(link.id)}
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            <Button
              onClick={handleFallbackContinue}
              className="w-full h-12 rounded-xl text-base font-semibold gap-2"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </Button>

            <button
              onClick={() => setPhase("input")}
              className="mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Try scanning again
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
