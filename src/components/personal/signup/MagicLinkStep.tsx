import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, Sparkles, ArrowRight, LayoutList, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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

type Phase = "input" | "loading" | "fork" | "unsupported";

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
      setScrapedData(data.data);

      const totalLinks = (data.data.links?.length || 0) + (data.data.socialLinks?.length || 0);
      if (totalLinks === 0) {
        toast.info("We found your profile but no links. You can add them in the dashboard.");
        onNext();
        return;
      }

      setPhase("fork");
    } catch (err: any) {
      toast.error(err.message || "Failed to scan profile");
      setPhase("input");
    }
  }, [url, onNext]);

  const handleForkChoice = useCallback((choice: "pills" | "cards") => {
    if (!scrapedData) return;

    // Clear existing vibe placeholder links
    formData.links.forEach(l => removeLink(l.id));

    const socialTypes = new Set(["instagram", "tiktok", "x", "youtube", "spotify", "facebook", "linkedin", "snapchat", "pinterest", "soundcloud"]);
    const socialPlatformsInBar = new Set((scrapedData.socialLinks || []).map(l => l.type));
    const rawLinks = scrapedData.links || [];

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
    (scrapedData.socialLinks || []).forEach((l, i) => {
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
          type: l.type,
          label: l.label,
          value: "",
          url: l.url,
          displayStyle: markBoth ? "both" : "pill",
          sortOrder: 100 + i,
          coverImageUrl: null,
          gridSize: null,
          thumbnailUrl: null,
        });
      } else {
        addLink({
          type: l.type,
          label: l.label,
          value: "",
          url: l.url,
          displayStyle: markBoth ? "both" : "pill",
          sortOrder: 100 + i,
          coverImageUrl: isGrid ? l.imageUrl : null,
          gridSize: isGrid ? "half" : null,
          thumbnailUrl: !isGrid && l.imageUrl ? l.imageUrl : null,
        });
      }
    });

    // Update profile data if scraped
    const updates: Partial<SignupData> = {};
    if (scrapedData.photoUrl) updates.profilePhotoUrl = scrapedData.photoUrl;
    if (scrapedData.name && !formData.fullName) updates.fullName = scrapedData.name;
    if (scrapedData.bio) updates.cardHeadline = scrapedData.bio;
    if (Object.keys(updates).length > 0) updateFormData(updates);

    onNext();
  }, [scrapedData, formData, addLink, removeLink, updateFormData, onNext]);

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
                {SUPPORTED_PLATFORMS.map((p) => (
                  <span key={p.domain} className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-medium">
                    {p.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Skip */}
            <button
              onClick={onNext}
              className="mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              I'll add links later →
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

        {/* ─── Design Fork Phase ─── */}
        {phase === "fork" && scrapedData && (
          <motion.div
            key="fork"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full text-center"
          >
            <h2 className="text-xl font-bold text-foreground mb-2">
              Do you want images on your link buttons?
            </h2>
            <p className="text-muted-foreground text-sm mb-6">
              We found {(scrapedData.links?.length || 0) + (scrapedData.socialLinks?.length || 0)} links. Choose your layout style.
            </p>

            <div className="grid grid-cols-2 gap-3">
              {/* Clean Pills */}
              <button
                onClick={() => handleForkChoice("pills")}
                className="group p-4 rounded-2xl border-2 border-border hover:border-primary transition-all text-left bg-card"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-muted mb-3">
                  <LayoutList className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                {/* Mini preview */}
                <div className="space-y-1.5 mb-3">
                  <div className="h-5 rounded-full bg-muted w-full" />
                  <div className="h-5 rounded-full bg-muted w-[85%]" />
                  <div className="h-5 rounded-full bg-muted w-[90%]" />
                </div>
                <p className="font-semibold text-sm text-foreground">Clean Pills</p>
                <p className="text-xs text-muted-foreground">Compact & scannable</p>
              </button>

              {/* Visual Cards */}
              <button
                onClick={() => handleForkChoice("cards")}
                className="group p-4 rounded-2xl border-2 border-border hover:border-primary transition-all text-left bg-card"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-muted mb-3">
                  <LayoutGrid className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                {/* Mini preview */}
                <div className="grid grid-cols-2 gap-1 mb-3">
                  <div className="h-10 rounded-lg bg-muted" />
                  <div className="h-10 rounded-lg bg-muted" />
                  <div className="h-5 rounded-lg bg-muted col-span-2" />
                </div>
                <p className="font-semibold text-sm text-foreground">Visual Cards</p>
                <p className="text-xs text-muted-foreground">Rich & eye-catching</p>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
