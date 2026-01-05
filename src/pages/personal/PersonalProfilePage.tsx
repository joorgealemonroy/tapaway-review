import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { 
  CheckCircle2,
  ExternalLink,
  Loader2,
  Share2
} from "lucide-react";
import { getPlatformConfig } from "@/lib/platformLinks";
import { toast } from "sonner";
import { isUsernameReserved } from "@/lib/reservedUsernames";
import { motion } from "framer-motion";

interface PersonalProfile {
  id: string;
  username: string;
  full_name: string;
  profile_photo_url: string | null;
  header_type: string | null;
  header_color: string | null;
  header_image_url: string | null;
  background_color: string | null;
  pfp_position: string | null;
}

interface PersonalLink {
  id: string;
  link_type: string;
  label: string;
  url: string;
  pill_color: string | null;
}

interface PersonalBlock {
  id: string;
  block_type: string;
  content: unknown;
  alignment: string | null;
}

interface Props {
  usernameOverride?: string;
}

const PersonalProfilePage = ({ usernameOverride }: Props = {}) => {
  const { username: paramUsername, slug } = useParams<{ username?: string; slug?: string }>();
  // Support both direct route (/u/:username) and UsernameResolver (/:slug)
  const username = usernameOverride || paramUsername || slug;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<PersonalProfile | null>(null);
  const [links, setLinks] = useState<PersonalLink[]>([]);
  const [blocks, setBlocks] = useState<PersonalBlock[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [isLegacyRedirect, setIsLegacyRedirect] = useState(false);

  const handleShare = async () => {
    const shareUrl = `https://tapaway.co/${profile?.username}`;
    const shareData = {
      title: `${profile?.full_name} | TapAway`,
      text: `Check out ${profile?.full_name}'s TapAway profile`,
      url: shareUrl,
    };

    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
      } catch {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied to clipboard");
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard");
    }
  };

  useEffect(() => {
    const loadProfile = async () => {
      if (!username) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      // Check if this is a reserved username (static route)
      if (isUsernameReserved(username)) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        // Fetch profile with new columns
        const { data: profileData, error: profileError } = await supabase
          .from("personal_profiles")
          .select("id, username, full_name, profile_photo_url, subscription_status, header_type, header_color, header_image_url, background_color, pfp_position")
          .eq("username", username.toLowerCase())
          .single();

        if (profileError || !profileData || profileData.subscription_status !== "active") {
          setNotFound(true);
          setLoading(false);
          return;
        }

        setProfile(profileData);

        // Fetch links
        const { data: linksData } = await supabase
          .from("personal_links")
          .select("*")
          .eq("profile_id", profileData.id)
          .eq("is_active", true)
          .order("sort_order", { ascending: true });

        setLinks(linksData || []);

        // Fetch blocks
        const { data: blocksData } = await supabase
          .from("personal_blocks")
          .select("*")
          .eq("profile_id", profileData.id)
          .eq("is_active", true)
          .order("sort_order", { ascending: true });

        setBlocks(blocksData || []);

        // Track visit (fire and forget)
        supabase
          .from("personal_analytics")
          .insert({
            profile_id: profileData.id,
            event_type: "profile_visit",
            visitor_info: {
              referrer: document.referrer || null,
              userAgent: navigator.userAgent,
            },
          })
          .then(() => {});
      } catch (err) {
        console.error("Error loading profile:", err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [username]);

  // Handle legacy redirect from /u/:username
  useEffect(() => {
    if (isLegacyRedirect && username) {
      navigate(`/${username}`, { replace: true });
    }
  }, [isLegacyRedirect, username, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-2">Profile not found</h1>
        <p className="text-muted-foreground mb-6">
          This TapAway profile doesn't exist or is no longer active.
        </p>
        <a href="/personal" className="text-primary hover:underline">
          Get your own TapAway
        </a>
      </div>
    );
  }

  const headerStyle = profile.header_type === "image" && profile.header_image_url
    ? { backgroundImage: `url(${profile.header_image_url})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: profile.header_color || "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))" };

  const bgStyle = { backgroundColor: profile.background_color || "#ffffff" };
  const pfpCentered = profile.pfp_position === "center";

  // Render a block
  const renderBlock = (block: PersonalBlock) => {
    const content = block.content as Record<string, string>;
    const alignClass = block.alignment === "left" ? "text-left" : block.alignment === "right" ? "text-right" : "text-center";
    
    switch (block.block_type) {
      case "youtube": {
        const videoId = content.videoId;
        if (!videoId) return null;
        return (
          <div key={block.id} className="w-full aspect-video rounded-xl overflow-hidden">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        );
      }
      case "image":
        return (
          <div key={block.id} className="w-full">
            <img 
              src={content.url} 
              alt="Content" 
              className="w-full rounded-xl object-cover max-h-80"
            />
          </div>
        );
      case "text":
        return (
          <div key={block.id} className={`w-full ${alignClass}`}>
            <h3 className="text-lg font-bold text-foreground">{content.title}</h3>
            {content.body && <p className="text-muted-foreground mt-1">{content.body}</p>}
          </div>
        );
      case "button": {
        const btnAlignClass = block.alignment === "left" ? "justify-start" : block.alignment === "right" ? "justify-end" : "justify-center";
        return (
          <div key={block.id} className={`w-full flex ${btnAlignClass}`}>
            <a
              href={content.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`px-6 py-3 bg-primary text-primary-foreground rounded-full font-semibold hover:opacity-90 transition-opacity ${
                block.alignment === "full" ? "w-full text-center" : ""
              }`}
            >
              {content.label}
            </a>
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen" style={bgStyle}>
      {/* Cover/Header */}
      <div className="h-32" style={headerStyle} />
      
      {/* Profile Content */}
      <div className={`max-w-md mx-auto px-4 -mt-16 pb-12 relative ${pfpCentered ? "text-center" : ""}`}>
        {/* Share button - top right */}
        <button
          onClick={handleShare}
          className="absolute top-0 right-4 h-10 w-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm hover:bg-white transition-colors"
          aria-label="Share profile"
        >
          <Share2 className="h-4 w-4 text-foreground" />
        </button>

        {/* Avatar */}
        <div className={`relative ${pfpCentered ? "inline-block" : ""} mb-4`}>
          {profile.profile_photo_url ? (
            <img
              src={profile.profile_photo_url}
              alt={profile.full_name}
              className="h-28 w-28 rounded-full border-4 border-background object-cover"
            />
          ) : (
            <div className="h-28 w-28 rounded-full border-4 border-background bg-muted flex items-center justify-center">
              <span className="text-3xl font-bold text-muted-foreground">
                {profile.full_name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="absolute bottom-1 right-1 h-7 w-7 bg-primary rounded-full flex items-center justify-center border-2 border-background shadow-sm">
            <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
          </div>
        </div>

        {/* Name & Username */}
        <h1 className="text-2xl font-bold text-foreground">{profile.full_name}</h1>
        <p className="text-muted-foreground mb-6">@{profile.username}</p>

        {/* Blocks */}
        {blocks.length > 0 && (
          <div className="space-y-4 mb-6">
            {blocks.map(renderBlock)}
          </div>
        )}

        {/* Links with platform styling */}
        {links.length > 0 && (
          <div className="space-y-3">
            {links.map((link) => {
              const config = getPlatformConfig(link.link_type);
              const Icon = config?.icon;
              const customColor = link.pill_color;
              
              return (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-4 p-4 rounded-xl transition-all hover:scale-[1.02] hover:shadow-lg`}
                  style={customColor ? { backgroundColor: customColor } : undefined}
                  {...(!customColor && {
                    className: `flex items-center gap-4 p-4 rounded-xl transition-all hover:scale-[1.02] hover:shadow-lg ${
                      config?.gradient || config?.bgColor || "bg-card border border-border"
                    }`
                  })}
                >
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                    customColor ? "bg-white/20" : config ? "bg-white/20" : "bg-primary/10"
                  }`}>
                    {Icon && <Icon className={`h-6 w-6 ${customColor ? "text-white" : config?.color || "text-primary"}`} />}
                  </div>
                  <span className={`flex-1 font-medium ${customColor ? "text-white" : config?.color || "text-foreground"}`}>
                    {link.label}
                  </span>
                  <ExternalLink className={`h-4 w-4 ${customColor ? "text-white" : config?.color || "text-muted-foreground"} opacity-60`} />
                </a>
              );
            })}
          </div>
        )}

        {links.length === 0 && blocks.length === 0 && (
          <p className="text-muted-foreground text-center py-8">
            No links yet
          </p>
        )}

        {/* Premium Footer CTA */}
        <motion.div 
          className="mt-12 pt-8 border-t border-border/50"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <a
            href="/personal"
            className="group flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            <span className="relative">
              Create your own TapAway page
              <span className="absolute bottom-0 left-0 w-0 h-px bg-current transition-all duration-300 group-hover:w-full" />
            </span>
          </a>
        </motion.div>
      </div>
    </div>
  );
};

export default PersonalProfilePage;
