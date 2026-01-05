import { memo, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  CheckCircle2,
  ExternalLink,
  Loader2,
  Share2
} from "lucide-react";
import { getPlatformConfig } from "@/lib/platformLinks";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useProfileData, trackProfileVisit } from "@/hooks/useProfileData";
import { OptimizedAvatar } from "@/components/personal/OptimizedImage";
import { preloadImages } from "@/components/personal/OptimizedImage";

interface Props {
  usernameOverride?: string;
}

// Memoized link component to prevent re-renders
const ProfileLink = memo(function ProfileLink({ 
  link 
}: { 
  link: { id: string; link_type: string; label: string; url: string; pill_color: string | null } 
}) {
  const config = getPlatformConfig(link.link_type);
  const Icon = config?.icon;
  const customColor = link.pill_color;
  
  const baseClasses = "flex items-center gap-4 p-4 rounded-xl transition-all hover:scale-[1.02] hover:shadow-lg";
  
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className={customColor 
        ? baseClasses 
        : `${baseClasses} ${config?.gradient || config?.bgColor || "bg-card border border-border"}`
      }
      style={customColor ? { backgroundColor: customColor } : undefined}
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
});

// Memoized block renderer
const ProfileBlock = memo(function ProfileBlock({ 
  block 
}: { 
  block: { id: string; block_type: string; content: unknown; alignment: string | null } 
}) {
  const content = block.content as Record<string, string>;
  const alignClass = block.alignment === "left" ? "text-left" : block.alignment === "right" ? "text-right" : "text-center";
  
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
    case "image":
      return (
        <div className="w-full">
          <img 
            src={content.url} 
            alt="Content" 
            loading="lazy"
            decoding="async"
            className="w-full rounded-xl object-cover max-h-80"
          />
        </div>
      );
    case "text":
      return (
        <div className={`w-full ${alignClass}`}>
          <h3 className="text-lg font-bold text-foreground">{content.title}</h3>
          {content.body && <p className="text-muted-foreground mt-1">{content.body}</p>}
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

  // Preload header image when profile loads
  useEffect(() => {
    if (data?.profile?.header_image_url) {
      preloadImages([data.profile.header_image_url]);
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

  const headerStyle = profile.header_type === "image" && profile.header_image_url
    ? { backgroundImage: `url(${profile.header_image_url})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: profile.header_color || "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))" };

  const bgStyle = { backgroundColor: profile.background_color || "#ffffff" };
  const pfpCentered = profile.pfp_position === "center";

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
          className="absolute top-0 right-4 h-10 w-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm hover:bg-white transition-colors"
          aria-label="Share profile"
        >
          <Share2 className="h-4 w-4 text-foreground" />
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

        {/* Name & Username */}
        <h1 className="text-2xl font-bold text-foreground">{profile.full_name}</h1>
        <p className="text-muted-foreground mb-6">@{profile.username}</p>

        {/* Blocks - rendered with memoization */}
        {blocks.length > 0 && (
          <div className="space-y-4 mb-6">
            {blocks.map(block => (
              <ProfileBlock key={block.id} block={block} />
            ))}
          </div>
        )}

        {/* Links - rendered with memoization */}
        {links.length > 0 && (
          <div className="space-y-3">
            {links.map(link => (
              <ProfileLink key={link.id} link={link} />
            ))}
          </div>
        )}

        {links.length === 0 && blocks.length === 0 && (
          <p className="text-muted-foreground text-center py-8">
            No links yet
          </p>
        )}

        {/* Premium Footer CTA */}
        <motion.div 
          className="mt-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <a
            href="/personal"
            className="group block relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 shadow-xl hover:shadow-2xl transition-all duration-500"
          >
            {/* Animated gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            {/* Sparkle effects */}
            <div className="absolute top-3 right-4 w-2 h-2 bg-white/40 rounded-full animate-pulse" />
            <div className="absolute top-6 right-8 w-1 h-1 bg-white/30 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
            <div className="absolute bottom-4 left-6 w-1.5 h-1.5 bg-primary/50 rounded-full animate-pulse" style={{ animationDelay: '0.6s' }} />
            
            <div className="relative flex items-center gap-4">
              {/* Logo mark */}
              <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-base group-hover:text-primary transition-colors duration-300">
                  Get your TapAway
                </p>
                <p className="text-slate-400 text-sm mt-0.5">
                  One tap. All your links. ✨
                </p>
              </div>
              
              {/* Arrow */}
              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-primary/20 group-hover:translate-x-1 transition-all duration-300">
                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </a>
        </motion.div>
      </div>
    </div>
  );
};

export default memo(PersonalProfilePage);
