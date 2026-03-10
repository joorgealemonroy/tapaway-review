import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ExternalLink, Globe, Loader2, Sparkles, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ScrapedLink {
  label: string;
  url: string;
  type: string;
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
];

const SOCIAL_ICONS: Record<string, string> = {
  instagram: "📷",
  tiktok: "🎵",
  youtube: "▶️",
  x: "𝕏",
  spotify: "🎧",
  facebook: "📘",
  linkedin: "💼",
  snapchat: "👻",
  pinterest: "📌",
  soundcloud: "🔊",
};

const ImportProfile = () => {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ScrapedData | null>(null);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("scrape-link-bio", {
        body: { url: url.trim() },
      });

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Failed to import");

      setResult(data.data);

      const totalLinks = (data.data.links?.length || 0) + (data.data.socialLinks?.length || 0);
      if (totalLinks === 0) {
        toast.info("We found your profile but couldn't detect any links. You can add them manually.");
      } else {
        toast.success(`Found ${totalLinks} links!`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to import profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseLayout = () => {
    if (!result) return;

    // Combine social + content links for signup pre-fill
    const allLinks = [...(result.socialLinks || []), ...(result.links || [])];

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
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border/50 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/tapaway-logo.svg" alt="TapAway" className="h-6" />
          </div>
          <button
            onClick={() => navigate("/personal/signup")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Start Fresh Instead →
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-lg">
          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              Import & Upgrade
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              Bring your links to TapAway
            </h1>
            <p className="text-muted-foreground">
              Paste your Linktree, Stan Store, or Beacons URL and we'll set everything up for you.
            </p>
          </motion.div>

          {/* URL Input */}
          <motion.form
            onSubmit={handleImport}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
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
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Import
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </motion.form>

          {/* Supported platforms */}
          {!result && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center mb-8"
            >
              <p className="text-xs text-muted-foreground mb-2">Supported platforms:</p>
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

          {/* Results Preview */}
          <AnimatePresence mode="wait">
            {result && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {/* Profile card */}
                <div className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-center gap-3 mb-4">
                    {result.photoUrl ? (
                      <img
                        src={result.photoUrl}
                        alt=""
                        className="w-12 h-12 rounded-full object-cover bg-muted"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-xl">
                        {result.name?.[0] || "?"}
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-foreground">{result.name || "Your Profile"}</h3>
                      {result.bio && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{result.bio}</p>
                      )}
                    </div>
                  </div>

                  {/* Social links */}
                  {result.socialLinks?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {result.socialLinks.map((link, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
                        >
                          {SOCIAL_ICONS[link.type] || "🔗"} {link.type}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Content links */}
                  {result.links?.length > 0 && (
                    <div className="space-y-2">
                      {result.links.map((link, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/50 border border-border/50"
                        >
                          <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="text-sm text-foreground truncate flex-1">
                            {link.label}
                          </span>
                          <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
                        </div>
                      ))}
                    </div>
                  )}

                  {(result.links?.length || 0) + (result.socialLinks?.length || 0) === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-3">
                      No links detected — you can add them in the next step.
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  <Button onClick={handleUseLayout} size="lg" className="w-full">
                    Use This Layout
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                  <button
                    onClick={() => navigate("/personal/signup")}
                    className="text-sm text-muted-foreground hover:text-foreground text-center py-2 transition-colors"
                  >
                    Start fresh instead
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default ImportProfile;
