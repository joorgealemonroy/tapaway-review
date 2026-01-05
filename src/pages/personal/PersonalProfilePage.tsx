import { memo, useCallback, useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  CheckCircle2,
  ExternalLink,
  Share2,
  Smartphone
} from "lucide-react";
import { getPlatformConfig } from "@/lib/platformLinks";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useProfileData, trackProfileVisit } from "@/hooks/useProfileData";
import { OptimizedAvatar, getOptimizedImageUrl } from "@/components/personal/OptimizedImage";
import { supabase } from "@/integrations/supabase/client";

// Helper to determine if a color is dark
function isColorDark(hexColor: string): boolean {
  const hex = hexColor.replace('#', '');
  if (hex.length !== 6) return false;
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
}

interface Props {
  usernameOverride?: string;
}

// Memoized link component to prevent re-renders
const ProfileLink = memo(function ProfileLink({ 
  link,
  isFeatured = false
}: { 
  link: { id: string; link_type: string; label: string; url: string; pill_color: string | null };
  isFeatured?: boolean;
}) {
  const config = getPlatformConfig(link.link_type);
  const Icon = config?.icon;
  const customColor = link.pill_color;
  
  // Featured links are larger and more prominent
  if (isFeatured) {
    return (
      <motion.a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`block p-5 rounded-2xl transition-all shadow-lg ${
          customColor 
            ? "" 
            : config?.gradient || config?.bgColor || "bg-primary"
        }`}
        style={customColor ? { backgroundColor: customColor } : undefined}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-center gap-4">
          <div className={`h-14 w-14 rounded-full flex items-center justify-center ${
            customColor ? "bg-white/20" : "bg-white/20"
          }`}>
            {Icon && <Icon className={`h-7 w-7 ${customColor ? "text-white" : config?.color || "text-white"}`} />}
          </div>
          <div className="flex-1">
            <span className={`text-lg font-semibold ${customColor ? "text-white" : config?.color || "text-white"}`}>
              {link.label}
            </span>
            <p className={`text-sm opacity-80 ${customColor ? "text-white" : config?.color || "text-white"}`}>
              Tap to open
            </p>
          </div>
          <ExternalLink className={`h-5 w-5 ${customColor ? "text-white" : config?.color || "text-white"} opacity-70`} />
        </div>
      </motion.a>
    );
  }
  
  // Regular links
  return (
    <motion.a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
        customColor 
          ? "" 
          : config?.gradient || config?.bgColor || "bg-card border border-border"
      }`}
      style={customColor ? { backgroundColor: customColor } : undefined}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
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
    </motion.a>
  );
});

// Memoized block renderer
const ProfileBlock = memo(function ProfileBlock({ 
  block,
  profileId,
  isDarkBg
}: { 
  block: { id: string; block_type: string; content: unknown; alignment: string | null };
  profileId?: string;
  isDarkBg?: boolean;
}) {
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [messageInput, setMessageInput] = useState("");
  
  const content = block.content as Record<string, string>;
  const alignClass = block.alignment === "left" ? "text-left" : block.alignment === "right" ? "text-right" : "text-center";
  const textClass = isDarkBg ? "text-white" : "text-foreground";
  const mutedClass = isDarkBg ? "text-white/70" : "text-muted-foreground";
  
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileId || !emailInput.trim()) return;
    
    setEmailSubmitting(true);
    try {
      const { error } = await supabase
        .from("personal_email_captures")
        .insert({
          profile_id: profileId,
          email: emailInput.trim(),
          name: nameInput.trim() || null,
          message: messageInput.trim() || null,
        });
      
      if (error) throw error;
      setEmailSubmitted(true);
      toast.success("Thanks! Your info has been submitted.");
    } catch (err) {
      console.error("Email capture error:", err);
      toast.error("Failed to submit. Please try again.");
    } finally {
      setEmailSubmitting(false);
    }
  };
  
  switch (block.block_type) {
    case "youtube": {
      const videoId = content.videoId;
      if (!videoId) return null;
      return (
        <div className="w-full aspect-video rounded-xl overflow-hidden">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            className="w-full h-full"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="YouTube video"
          />
        </div>
      );
    }
    case "image": {
      // Apply Supabase image transformation for faster loading
      const size = content.size || "large";
      const imageWidth = size === "small" ? 400 : 640;
      const imageUrl = getOptimizedImageUrl(content.url, imageWidth, 85);
      const linkUrl = content.linkUrl;
      const overlayTitle = content.overlayTitle;
      const overlaySubtitle = content.overlaySubtitle;
      const overlayCta = content.overlayCta;
      const hasOverlay = overlayTitle || overlaySubtitle || overlayCta;
      
      const imageWithOverlay = (
        <div className="relative rounded-xl overflow-hidden">
          <img 
            src={imageUrl} 
            alt="Content" 
            loading="lazy"
            decoding="async"
            className={`object-cover ${
              size === "small" 
                ? "max-h-48 w-auto mx-auto" 
                : "w-full max-h-80"
            }`}
          />
          {hasOverlay && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-white text-center p-4">
              {overlayTitle && (
                <h3 className="text-xl font-bold mb-1 drop-shadow-lg">{overlayTitle}</h3>
              )}
              {overlaySubtitle && (
                <p className="text-sm font-medium mb-1 drop-shadow-md">{overlaySubtitle}</p>
              )}
              {overlayCta && (
                <p className="text-sm font-semibold text-emerald-400 drop-shadow-md">{overlayCta}</p>
              )}
            </div>
          )}
        </div>
      );
      
      // Wrap in link if linkUrl exists
      if (linkUrl) {
        return (
          <motion.a
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            {imageWithOverlay}
          </motion.a>
        );
      }
      
      return <div className="w-full">{imageWithOverlay}</div>;
    }
    case "text":
      return (
        <div className={`w-full ${alignClass}`}>
          <h3 className={`text-lg font-bold ${textClass}`}>{content.title}</h3>
          {content.body && <p className={`${mutedClass} mt-1`}>{content.body}</p>}
        </div>
      );
    case "button": {
      const btnAlignClass = block.alignment === "left" ? "justify-start" : block.alignment === "right" ? "justify-end" : "justify-center";
      return (
        <div className={`w-full flex ${btnAlignClass}`}>
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
    case "email_capture": {
      const headline = content.headline || "Stay Connected 💌";
      const description = content.description || "Leave your email and I'll reach out!";
      const buttonText = content.buttonText || "Submit";
      const showName = content.collectName === "true";
      const showMessage = content.collectMessage === "true";
      
      if (emailSubmitted) {
        return (
          <div className={`w-full p-6 rounded-xl border text-center ${isDarkBg ? 'bg-white/10 border-white/20' : 'bg-card border-border'}`}>
            <CheckCircle2 className="h-10 w-10 text-primary mx-auto mb-3" />
            <h3 className={`font-semibold ${textClass}`}>Thanks!</h3>
            <p className={`text-sm ${mutedClass}`}>Your info has been submitted.</p>
          </div>
        );
      }
      
      const inputClass = isDarkBg 
        ? "w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
        : "w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50";
      
      return (
        <form onSubmit={handleEmailSubmit} className={`w-full p-5 rounded-xl border space-y-3 ${isDarkBg ? 'bg-white/10 border-white/20' : 'bg-card border-border'}`}>
          <div className="text-center">
            <h3 className={`font-semibold ${textClass}`}>{headline}</h3>
            <p className={`text-sm ${mutedClass} mt-1`}>{description}</p>
          </div>
          {showName && (
            <input
              type="text"
              placeholder="Your name (optional)"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className={inputClass}
            />
          )}
          <input
            type="email"
            placeholder="your@email.com"
            required
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            className={inputClass}
          />
          {showMessage && (
            <textarea
              placeholder="Message (optional)"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              rows={2}
              className={`${inputClass} resize-none`}
            />
          )}
          <button
            type="submit"
            disabled={emailSubmitting}
            className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {emailSubmitting ? "Submitting..." : buttonText}
          </button>
        </form>
      );
    }
    case "photo_collage": {
      // Handle both string (from DB) and array (from state) formats
      let images: string[] = [];
      try {
        images = content.images 
          ? (typeof content.images === 'string' ? JSON.parse(content.images) : content.images as unknown as string[])
          : [];
      } catch {
        images = [];
      }
      
      if (images.length === 0) return null;
      
      return (
        <div className="w-full overflow-x-auto scrollbar-hide -mx-4 px-4">
          <div className="flex gap-2" style={{ width: 'max-content' }}>
            {images.map((imgUrl, idx) => (
              <div key={idx} className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden">
                <img 
                  src={getOptimizedImageUrl(imgUrl, 200, 85)} 
                  alt="" 
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      );
    }
    default:
      return null;
  }
});

const PersonalProfilePage = ({ usernameOverride }: Props = {}) => {
  const { username: paramUsername, slug } = useParams<{ username?: string; slug?: string }>();
  const username = usernameOverride || paramUsername || slug;
  const navigate = useNavigate();
  
  // Use optimized data fetching with caching
  const { data, loading, error } = useProfileData(username);

  // Track visit after data loads (non-blocking)
  useEffect(() => {
    if (data?.profile?.id) {
      trackProfileVisit(data.profile.id);
    }
  }, [data?.profile?.id]);

  // Preload optimized header image when profile loads
  useEffect(() => {
    if (data?.profile?.header_image_url) {
      const optimizedUrl = getOptimizedImageUrl(data.profile.header_image_url, 640, 85);
      const img = new Image();
      img.src = optimizedUrl;
    }
  }, [data?.profile?.header_image_url]);

  const handleShare = useCallback(async () => {
    if (!data?.profile) return;
    
    const shareUrl = `https://tapaway.co/${data.profile.username}`;
    const shareData = {
      title: `${data.profile.full_name} | TapAway`,
      text: `Check out ${data.profile.full_name}'s TapAway profile`,
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
  }, [data?.profile]);

  // Loading skeleton - minimal, fast to render
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="h-32 bg-muted animate-pulse" />
        <div className="max-w-md mx-auto px-4 -mt-16 pb-12">
          <div className="h-28 w-28 rounded-full bg-muted animate-pulse border-4 border-background" />
          <div className="mt-4 space-y-2">
            <div className="h-6 w-40 bg-muted animate-pulse rounded" />
            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
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

  const { profile, links, blocks } = data;

  // Combine links and blocks into unified sorted list
  type UnifiedItem = 
    | { kind: "link"; data: typeof links[0] }
    | { kind: "block"; data: typeof blocks[0] };

  const unifiedItems: UnifiedItem[] = [
    ...links
      .filter((l: any) => l.is_active !== false)
      .map((link): UnifiedItem => ({ kind: "link", data: link })),
    ...blocks.map((block): UnifiedItem => ({ kind: "block", data: block })),
  ].sort((a, b) => a.data.sort_order - b.data.sort_order);

  // Extract featured link (renders at top separately)
  const featuredLink = links.find((l: any) => l.is_active !== false && l.is_featured === true);
  const itemsWithoutFeatured = unifiedItems.filter(
    item => !(item.kind === "link" && (item.data as any).is_featured === true)
  );

  // Use optimized header image URL for faster loading
  const optimizedHeaderUrl = profile.header_type === "image" && profile.header_image_url
    ? getOptimizedImageUrl(profile.header_image_url, 640, 85)
    : null;
  
  const headerStyle = optimizedHeaderUrl
    ? { backgroundImage: `url(${optimizedHeaderUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: profile.header_color || "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))" };

  const bgColor = profile.background_color || "#ffffff";
  const bgStyle = { backgroundColor: bgColor };
  const pfpCentered = profile.pfp_position === "center";
  const isDarkBg = useMemo(() => isColorDark(bgColor), [bgColor]);
  
  // Dynamic text classes based on background
  const headingClass = isDarkBg ? "text-white" : "text-foreground";
  const textClass = isDarkBg ? "text-white/80" : "text-foreground/80";
  const mutedClass = isDarkBg ? "text-white/60" : "text-muted-foreground";

  return (
    <div className="min-h-screen" style={bgStyle}>
      {/* Cover/Header - with lazy loaded background */}
      <div 
        className="h-32 bg-muted" 
        style={headerStyle} 
      />
      
      {/* Profile Content */}
      <div className={`max-w-md mx-auto px-4 -mt-16 pb-12 relative ${pfpCentered ? "text-center" : ""}`}>
        {/* Share button */}
        <button
          onClick={handleShare}
          className={`absolute top-0 right-4 h-10 w-10 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm transition-colors ${isDarkBg ? 'bg-white/20 hover:bg-white/30' : 'bg-white/90 hover:bg-white'}`}
          aria-label="Share profile"
        >
          <Share2 className={`h-4 w-4 ${isDarkBg ? 'text-white' : 'text-foreground'}`} />
        </button>

        {/* Avatar - priority loaded */}
        <div className={`relative ${pfpCentered ? "inline-block" : ""} mb-4`}>
          <OptimizedAvatar
            src={profile.profile_photo_url}
            alt={profile.full_name}
            size={28}
            className="border-4 border-background"
            priority
            fallbackInitial={profile.full_name.charAt(0).toUpperCase()}
          />
          <div className="absolute bottom-1 right-1 h-7 w-7 bg-primary rounded-full flex items-center justify-center border-2 border-background shadow-sm">
            <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
          </div>
        </div>

        {/* Name & Username & Headline/Bio */}
        <h1 className={`text-2xl font-bold ${headingClass}`}>{profile.full_name}</h1>
        {profile.headline && (
          <p className={`text-sm ${textClass} mt-1`}>{profile.headline}</p>
        )}
        <p className={`${mutedClass} text-sm mt-1`}>@{profile.username}</p>
        {profile.bio && (
          <p className={`${mutedClass} text-sm mt-2 max-w-xs mx-auto`}>{profile.bio}</p>
        )}
        <div className="mb-6" />

        {/* Featured link - rendered prominently at top */}
        {featuredLink && (
          <div className="mb-4">
            <ProfileLink link={featuredLink} isFeatured />
          </div>
        )}

        {/* Unified content - interleaved links and blocks */}
        {itemsWithoutFeatured.length > 0 && (
          <div className="space-y-3">
            {itemsWithoutFeatured.map((item) => {
              if (item.kind === "link") {
                return <ProfileLink key={`link-${item.data.id}`} link={item.data} />;
              } else {
                return <ProfileBlock key={`block-${item.data.id}`} block={item.data} profileId={profile.id} isDarkBg={isDarkBg} />;
              }
            })}
          </div>
        )}

        {links.length === 0 && blocks.length === 0 && (
          <p className={`${mutedClass} text-center py-8`}>
            No links yet
          </p>
        )}

        {/* Footer */}
        <footer className="mt-12 pb-6 text-center space-y-3">
          {/* Glass Pill CTA */}
          <motion.div 
            className="flex justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <a
              href="/personal"
              className={`group inline-flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-2xl border shadow-[0_4px_16px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.4)] transition-all duration-300 text-sm ${isDarkBg ? 'bg-white/10 border-white/20 hover:bg-white/20' : 'bg-white/20 border-white/30 hover:bg-white/30'}`}
            >
              <svg className={`h-3.5 w-3.5 ${isDarkBg ? 'text-white/70' : 'text-foreground/70'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className={`font-medium ${isDarkBg ? 'text-white/80' : 'text-foreground/80'}`}>
                Start using TapAway
              </span>
            </a>
          </motion.div>
          
          {/* Subtle tap-enabled indicator */}
          <p className={`text-xs flex items-center justify-center gap-1 ${isDarkBg ? 'text-white/40' : 'text-muted-foreground/50'}`}>
            <Smartphone className="h-3 w-3" />
            Tap-enabled
          </p>
        </footer>
      </div>
    </div>
  );
};

export default memo(PersonalProfilePage);
