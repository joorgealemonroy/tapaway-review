import { memo, useCallback, useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";

import { 
  CheckCircle2,
  ExternalLink,
  Mail,
  Share2,
  Smartphone,
  UserPlus
} from "lucide-react";
import { getPlatformConfig } from "@/lib/platformLinks";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useProfileData, trackProfileVisit } from "@/hooks/useProfileData";
import { OptimizedAvatar, getOptimizedImageUrl } from "@/components/personal/OptimizedImage";
import { supabase } from "@/integrations/supabase/client";
import { ImageLightbox } from "@/components/personal/ImageLightbox";
import { downloadVCard } from "@/lib/vcard";
import QRCode from "react-qr-code";
import { ShareModal } from "@/components/personal/ShareModal";

import { ProductPreviewModal } from "@/components/personal/ProductPreviewModal";
import { extractBottomColor } from "@/lib/imageColorExtraction";
import { useAppBackground } from "@/hooks/useAppBackground";
import useEmblaCarousel from "embla-carousel-react";
import { sanitizeUrl, isValidYouTubeVideoId } from "@/lib/sanitizeUrl";
import { logoImageStyle } from "@/lib/logoHeader";

import LeadFormSheet from "@/components/personal/LeadFormSheet";
import MarketingExamplesCard from "@/components/personal/MarketingExamplesCard";
import { SmsOptInDrawer } from "@/components/personal/SmsOptInDrawer";
import { MenuDisplay } from "@/components/personal/MenuDisplay";
import { parseMenuContent } from "@/lib/menuBlock";
import { resolveHubContrast, type HubContrast } from "@/lib/hubContrast";



// Helper to extract a base color from a gradient for fade effect
function getBaseColorFromGradient(gradient: string): string {
  const colorMatch = gradient.match(/#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}|rgb\([^)]+\)|rgba\([^)]+\)/g);
  if (colorMatch && colorMatch.length > 0) {
    return colorMatch[colorMatch.length - 1];
  }
  return "#000000";
}

// Helper to compute luminance from an rgb() color string — returns 0 (dark) to 1 (light)
function getRgbLuminance(rgbColor: string | null): number | null {
  if (!rgbColor) return null;
  const match = rgbColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) return null;
  const r = parseInt(match[1]);
  const g = parseInt(match[2]);
  const b = parseInt(match[3]);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

// Helper to determine if a color is dark (handles null, undefined, shorthand hex)
function isColorDark(hexColor: string | null | undefined): boolean {
  if (!hexColor) return false;
  try {
    const hex = hexColor.replace('#', '');
    if (hex.length === 3) {
      // Handle shorthand hex like #fff
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance < 0.5;
    }
    if (hex.length !== 6) return false;
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return false;
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.5;
  } catch {
    return false;
  }
}

import type { CachedProfile } from "@/hooks/useProfileCache";

interface Props {
  usernameOverride?: string;
  initialProfile?: CachedProfile;
}

// Fire-and-forget link click tracker
const trackLinkClick = (profileId: string, link: { id: string; label: string; url: string }) => {
  supabase
    .from("personal_analytics")
    .insert({
      profile_id: profileId,
      event_type: "link_click",
      visitor_info: {
        link_id: link.id,
        link_label: link.label,
        link_url: link.url,
        referrer: document.referrer || null,
        userAgent: navigator.userAgent,
      },
    })
    .then(() => {});
};

// Memoized link component to prevent re-renders
const ProfileLink = memo(function ProfileLink({ 
  link,
  profileId,
  isFeatured = false,
  isGrid = false,
  index = 99,
  profilePhotoUrl,
  accentColor,
  contrast
}: { 
  link: { id: string; link_type: string; label: string; url: string; pill_color: string | null; display_style?: string | null; cover_image_url?: string | null; grid_size?: string | null; thumbnail_url?: string | null };
  profileId?: string;
  isFeatured?: boolean;
  isGrid?: boolean;
  index?: number;
  profilePhotoUrl?: string | null;
  accentColor?: string | null;
  contrast: HubContrast;
}) {

  const config = getPlatformConfig(link.link_type);
  const Icon = config?.icon;
  // Only treat accentColor as a custom color if it's a valid hex value (not "glass", etc.)
  const isValidHex = (c: string | null | undefined): c is string => c ? /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(c) : false;
  const validAccent = isValidHex(accentColor) ? accentColor : null;
  // Use pill_color, fall back to validated accentColor (vibe theme), then platform default
  const customColor = link.pill_color && link.pill_color !== "#000000" ? link.pill_color : (validAccent || null);
  const coverImage = link.cover_image_url;
  // Dynamic button text contrast: dark text on light buttons, white text on dark buttons
  const buttonTextColor = customColor && !isColorDark(customColor) ? '#1A1A1A' : '#FFFFFF';

  // Email link — inline bar with email address + Connect button
  if (link.link_type === "email") {
    const emailAddress = link.url.replace(/^mailto:/i, "");
    return (
      <a
        href={sanitizeUrl(link.url)}
        onClick={() => profileId && trackLinkClick(profileId, link)}
        className="flex items-center gap-3 rounded-full bg-muted/60 p-1.5 pl-4 transition-transform active:scale-[0.98]"
      >
        <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <span className="flex-1 text-sm font-medium text-foreground truncate">{emailAddress}</span>
        <span className="flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background flex-shrink-0">
          Connect
          {profilePhotoUrl ? (
            <img src={getOptimizedImageUrl(profilePhotoUrl, 80, 85)} alt="" className="h-6 w-6 rounded-full object-cover" />
          ) : (
            <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
              <Mail className="h-3 w-3 text-muted-foreground" />
            </div>
          )}
        </span>
      </a>
    );
  }
  
  // Grid card-style link with cover image (square, 2-column layout)
  if (coverImage && isGrid) {
    return (
      <a
        href={sanitizeUrl(link.url)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => profileId && trackLinkClick(profileId, link)}
        className="block relative rounded-2xl overflow-hidden aspect-square shadow-lg group active:scale-[0.98] transition-transform"
      >
        <img 
          src={getOptimizedImageUrl(coverImage, 640, 85)} 
          alt={link.label}
          decoding="async"
          loading={index < 4 ? "eager" : "lazy"}
          fetchPriority={index < 4 ? "high" : undefined}
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div 
          className={`absolute top-2 left-2 h-8 w-8 rounded-full flex items-center justify-center shadow-lg ${config?.gradient || config?.bgColor || 'bg-primary'}`}
        >
          {Icon && <Icon className={`h-4 w-4 ${config?.color || 'text-white'}`} />}
        </div>
        <div className="absolute bottom-2 left-2 right-2">
          <span className="text-white font-bold text-sm drop-shadow-lg uppercase tracking-wide truncate">
            {link.label}
          </span>
        </div>
      </a>
    );
  }
   
  // Full-width card-style link with cover image
  if (coverImage) {
    return (
      <a
        href={sanitizeUrl(link.url)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => profileId && trackLinkClick(profileId, link)}
        className="block relative rounded-2xl overflow-hidden aspect-[4/3] shadow-lg group active:scale-[0.98] transition-transform"
      >
        <img 
          src={getOptimizedImageUrl(coverImage, 640, 85)} 
          alt={link.label}
          decoding="async"
          loading={index < 4 ? "eager" : "lazy"}
          fetchPriority={index < 4 ? "high" : undefined}
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div 
          className={`absolute top-3 left-3 h-10 w-10 rounded-full flex items-center justify-center shadow-lg ${config?.gradient || config?.bgColor || 'bg-primary'}`}
        >
          {Icon && <Icon className={`h-5 w-5 ${config?.color || 'text-white'}`} />}
        </div>
        <div className="absolute bottom-3 left-3 right-3">
          <span className="text-white font-bold text-lg drop-shadow-lg uppercase tracking-wide truncate">
            {link.label}
          </span>
        </div>
      </a>
    );
  }
   
   // Featured links — surface adapts to the page background
  if (isFeatured) {
    return (
      <a
        href={sanitizeUrl(link.url)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => profileId && trackLinkClick(profileId, link)}
        className={`block p-5 rounded-2xl transition-transform active:scale-[0.98] shadow-lg ${contrast.blockClass}`}
      >
        <div className="flex items-center gap-4">
          <div className={`h-14 w-14 rounded-full flex items-center justify-center ${
            config?.gradient || config?.bgColor || (contrast.isDark ? "bg-white/20" : "bg-gray-100")
          }`}>
            {Icon && <Icon className={`h-7 w-7 ${config?.color || (contrast.isDark ? "text-white" : "text-gray-700")}`} />}
          </div>
          <div className="flex-1">
            <span className={`text-lg font-semibold truncate ${contrast.blockTextClass}`}>
              {link.label}
            </span>
            <p className={`text-sm ${contrast.isDark ? "text-white/60" : "text-gray-500"}`}>
              Tap to open
            </p>
          </div>
          <ExternalLink className={`h-5 w-5 ${contrast.blockMutedClass}`} />
        </div>
      </a>
    );
  }
   
    // Regular links (Google Review & Yelp get the white pill treatment)
    const isGoogleReview = link.link_type === 'google_review';
    const isYelp = link.link_type === 'yelp';
    const isWhitePill = isGoogleReview || isYelp;
  return (
      <a
        href={sanitizeUrl(link.url)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => profileId && trackLinkClick(profileId, link)}
      className={`flex items-center gap-4 p-4 rounded-xl transition-transform active:scale-[0.98] ${
        isWhitePill ? contrast.pillClass : contrast.blockClass
      }`}
    >
      {link.thumbnail_url ? (
        <div className="h-12 w-12 rounded-lg overflow-hidden flex-shrink-0">
          <img src={getOptimizedImageUrl(link.thumbnail_url, 160, 85)} alt="" decoding="async" loading={index < 4 ? "eager" : "lazy"} fetchPriority={index < 4 ? "high" : undefined} className="w-full h-full object-cover" />
        </div>
      ) : isWhitePill && Icon ? (
        <Icon className="h-8 w-8 flex-shrink-0" />
      ) : (
        <div className={`h-12 w-12 rounded-full flex items-center justify-center ${config?.gradient || config?.bgColor || (contrast.isDark ? "bg-white/20" : "bg-gray-100")}`}>
          {Icon && <Icon className={`h-6 w-6 ${config?.color || (contrast.isDark ? "text-white" : "text-gray-700")}`} />}
        </div>
      )}
      <span className={`flex-1 font-medium truncate ${isWhitePill ? 'text-gray-900' : contrast.blockTextClass}`}>
        {link.label}
      </span>
      <ExternalLink className={`h-4 w-4 ${isWhitePill ? 'text-gray-400' : contrast.blockMutedClass}`} />
    </a>
  );

});

// Generates a poster frame from video metadata without downloading the full file
const VideoThumbnail = memo(function VideoThumbnail({ url }: { url: string }) {
  const [poster, setPoster] = useState<string | null>(null);

  useEffect(() => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = url;
    video.onloadeddata = () => {
      video.currentTime = 0.1;
    };
    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d")?.drawImage(video, 0, 0);
        setPoster(canvas.toDataURL("image/jpeg", 0.7));
      } catch {
        // cross-origin or other error — leave as placeholder
      }
    };
    return () => { video.src = ""; };
  }, [url]);

  return poster
    ? <img src={poster} alt="" className="w-full h-full object-cover" />
    : <div className="w-full h-full bg-muted animate-pulse" />;
});

// Collage with lightbox component - horizontal swipeable carousel (supports mixed media)
const CollageWithLightbox = memo(function CollageWithLightbox({ media }: { media: Array<{ url: string; type: "image" | "video"; poster?: string }> }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [emblaRef] = useEmblaCarousel({ 
    loop: false, 
    align: "start",
    containScroll: "trimSnaps",
    dragFree: true
  });

  const handleItemClick = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  return (
    <>
      <div 
        className="w-full overflow-hidden" 
        ref={emblaRef}
        style={{ touchAction: "pan-x pan-y" }}
      >
        <div className="flex gap-1.5">
          {media.map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleItemClick(idx)}
              className="flex-shrink-0 w-[31%] aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary relative"
              style={{ touchAction: "pan-x" }}
            >
              {item.type === "video" ? (
                <>
                  {item.poster ? (
                    <img src={getOptimizedImageUrl(item.poster, 200, 85)} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  ) : (
                    <VideoThumbnail url={item.url} />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-8 w-8 rounded-full bg-black/50 flex items-center justify-center">
                      <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-white border-b-[6px] border-b-transparent ml-0.5" />
                    </div>
                  </div>
                </>
              ) : (
                <img 
                  src={getOptimizedImageUrl(item.url, 200, 85)} 
                  alt="" 
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
              )}
            </button>
          ))}
        </div>
      </div>
      <ImageLightbox
        media={media}
        currentIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onNavigate={setLightboxIndex}
      />
    </>
  );
});

// Social icon bar for icon-style links - with branded colors
const SocialIconBar = memo(function SocialIconBar({ 
  links, 
  isDarkBg,
  profileId
}: { 
  links: { id: string; link_type: string; url: string; label?: string }[];
  isDarkBg?: boolean;
  profileId?: string;
}) {
  if (links.length === 0) return null;

  return (
    <div className="flex flex-wrap justify-center gap-2 mt-3">
      {links.map((link) => {
        const config = getPlatformConfig(link.link_type);
        const Icon = config?.icon;
        if (!Icon) return null;
        
        // Get the platform's background styling
        const bgStyle = config?.gradient || config?.bgColor;
        
        return (
          <a
            key={link.id}
            href={sanitizeUrl(link.url)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => profileId && trackLinkClick(profileId, { id: link.id, label: link.label || config?.label || link.link_type, url: link.url })}
            className={`h-11 w-11 rounded-full flex items-center justify-center transition-all hover:scale-110 shadow-md ${bgStyle}`}
            title={config?.label}
          >
            <Icon className={`h-5 w-5 ${config?.color || 'text-white'}`} />
          </a>
        );
      })}
    </div>
  );
});

// Memoized block renderer
const ProfileBlock = memo(function ProfileBlock({ 
  block,
  profileId,
  isDarkBg,
  textColor
}: { 
  block: { id: string; block_type: string; content: unknown; alignment: string | null };
  profileId?: string;
  isDarkBg?: boolean;
  textColor?: string | null;
}) {
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [smsDrawerOpen, setSmsDrawerOpen] = useState(false);
  
  const content = block.content as Record<string, string>;
  const alignClass = block.alignment === "left" ? "text-left" : block.alignment === "right" ? "text-right" : "text-center";
  const textClass = textColor ? "" : (isDarkBg ? "text-white" : "text-foreground");
  const textStyleObj = textColor ? { color: textColor } : undefined;
  const mutedClass = isDarkBg ? "text-white/70" : "text-muted-foreground";
  
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileId) return;
    
    // Get collectEmail/collectPhone from the current block content
    const currentContent = content as Record<string, string>;
    const shouldCollectEmail = currentContent.collectEmail !== "false";
    const shouldCollectPhone = currentContent.collectPhone === "true";
    
    // Validate at least one contact method is provided
    const hasEmail = emailInput.trim();
    const hasPhone = phoneInput.trim();
    
    if (shouldCollectEmail && shouldCollectPhone && !hasEmail && !hasPhone) {
      toast.error("Please enter your email or phone number.");
      return;
    }
    if (shouldCollectEmail && !shouldCollectPhone && !hasEmail) {
      toast.error("Please enter your email.");
      return;
    }
    if (shouldCollectPhone && !shouldCollectEmail && !hasPhone) {
      toast.error("Please enter your phone number.");
      return;
    }
    
    setEmailSubmitting(true);
    try {
      const phoneTrimmed = phoneInput.trim();
      const optedIn = smsOptIn && !!phoneTrimmed;
      const { error } = await supabase
        .from("personal_email_captures")
        .insert({
          profile_id: profileId,
          email: emailInput.trim() || null,
          phone: phoneTrimmed || null,
          name: nameInput.trim() || null,
          message: messageInput.trim() || null,
          sms_opt_in: optedIn,
          sms_opt_in_at: optedIn ? new Date().toISOString() : null,
        } as any);
      
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
      if (!videoId || !isValidYouTubeVideoId(videoId)) return null;
      const ytOverlayTitle = content.overlayTitle;
      const ytOverlaySubtitle = content.overlaySubtitle;
      const hasYtOverlay = ytOverlayTitle || ytOverlaySubtitle;
      return (
        <div className="w-full space-y-2">
          {/* Title ABOVE video for cleaner look */}
          {hasYtOverlay && (
            <div className={alignClass}>
              {ytOverlayTitle && (
                <h3 className={`text-lg font-bold ${textClass}`}>{ytOverlayTitle}</h3>
              )}
              {ytOverlaySubtitle && (
                <p className={`text-sm ${mutedClass}`}>{ytOverlaySubtitle}</p>
              )}
            </div>
          )}
          <div className="aspect-video rounded-xl overflow-hidden">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              className="w-full h-full"
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="YouTube video"
            />
          </div>
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
          <a
            href={sanitizeUrl(linkUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full active:scale-[0.99] transition-transform"
          >
            {imageWithOverlay}
          </a>
        );
      }
      
      return <div className="w-full">{imageWithOverlay}</div>;
    }
    case "text":
      return (
        <div className={`w-full ${alignClass}`}>
          <h3 className={`text-lg font-bold ${textClass}`} style={textStyleObj}>{content.title}</h3>
          {content.body && <p className={`${mutedClass} mt-1`} style={textStyleObj ? { color: textStyleObj.color, opacity: 0.7 } : undefined}>{content.body}</p>}
        </div>
      );
    case "button": {
      const btnAlignClass = block.alignment === "left" ? "justify-start" : block.alignment === "right" ? "justify-end" : "justify-center";
      return (
        <div className={`w-full flex ${btnAlignClass}`}>
          <a
            href={sanitizeUrl(content.url)}
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
      const description = content.description || "Leave your info and I'll reach out!";
      const buttonText = content.buttonText || "Submit";
      const showName = content.collectName === "true";
      const showMessage = content.collectMessage === "true";
      // Default to email-only for backward compat
      const showEmail = content.collectEmail !== "false";
      const showPhone = content.collectPhone === "true";
      // Required flags - default true for contact fields if collecting, false for name/message
      const isEmailRequired = showEmail && content.emailRequired !== "false";
      const isPhoneRequired = showPhone && content.phoneRequired !== "false";
      const isNameRequired = showName && content.nameRequired === "true";
      const isMessageRequired = showMessage && content.messageRequired === "true";
      
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
              placeholder={isNameRequired ? "Your name" : "Your name (optional)"}
              required={isNameRequired}
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className={inputClass}
            />
          )}
          {/* Phone first, then Email */}
          {showPhone && (
            <input
              type="tel"
              placeholder={isPhoneRequired ? "Your phone number" : "Your phone number (optional)"}
              required={isPhoneRequired}
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              className={inputClass}
            />
          )}
          {showEmail && (
            <input
              type="email"
              placeholder={isEmailRequired ? "your@email.com" : "your@email.com (optional)"}
              required={isEmailRequired}
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className={inputClass}
            />
          )}
          {showMessage && (
            <textarea
              placeholder={isMessageRequired ? "Message" : "Message (optional)"}
              required={isMessageRequired}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              rows={2}
              className={`${inputClass} resize-none`}
            />
          )}
          {showPhone && phoneInput.trim().length > 0 && (
            <label className={`flex items-start gap-2 text-xs leading-snug ${mutedClass} cursor-pointer select-none`}>
              <input
                type="checkbox"
                checked={smsOptIn}
                onChange={(e) => setSmsOptIn(e.target.checked)}
                className="mt-0.5 h-3.5 w-3.5 rounded accent-primary"
              />
              <span>
                Send me exclusive updates and offers via text message.
                <span className="block opacity-70">Msg &amp; data rates may apply. Reply STOP to opt out.</span>
              </span>
            </label>
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
    case "sms_subscribe": {
      const headline = (content.headline as string) || "Join our VIP Text List";
      const description = (content.description as string) || "Get exclusive updates and offers via text.";
      const buttonText = (content.buttonText as string) || "Join the VIP List";
      return (
        <>
          <div
            className={`w-full p-5 rounded-xl border space-y-3 ${isDarkBg ? 'bg-white/10 border-white/20' : 'bg-card border-border'}`}
          >
            <div className="text-center">
              <h3 className={`font-semibold text-base ${textClass}`} style={textStyleObj}>{headline}</h3>
              <p className={`text-sm ${mutedClass} mt-1`} style={textStyleObj ? { color: textStyleObj.color, opacity: 0.7 } : undefined}>{description}</p>
            </div>
            <button
              type="button"
              onClick={() => setSmsDrawerOpen(true)}
              className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity"
            >
              {buttonText}
            </button>
          </div>
          {profileId && (
            <SmsOptInDrawer
              open={smsDrawerOpen}
              onOpenChange={setSmsDrawerOpen}
              profileId={profileId}
              headline={headline}
              description={description}
              buttonText={buttonText}
            />
          )}
        </>
      );
    }
    case "menu": {
      const menu = parseMenuContent(content);
      if (menu.sections.length === 0) return null;
      return <MenuDisplay menu={menu} isDarkBg={isDarkBg} textColor={textColor} />;
    }
    case "photo_collage": {
      // Parse mixed media (new format) or legacy images
      let media: Array<{ url: string; type: "image" | "video"; poster?: string }> = [];
      try {
        if (content.media) {
          const parsed = typeof content.media === 'string' ? JSON.parse(content.media) : content.media;
          if (Array.isArray(parsed)) {
            media = parsed.map((item: any) => 
              typeof item === 'string' ? { url: item, type: "image" as const } : item
            );
          }
        } else if (content.images) {
          const images = typeof content.images === 'string' ? JSON.parse(content.images) : content.images as unknown as string[];
          media = (Array.isArray(images) ? images : []).map(url => ({ url, type: "image" as const }));
        }
      } catch {
        media = [];
      }
      
      if (media.length === 0) return null;
      
      return (
        <CollageWithLightbox media={media} />
      );
    }
    case "marketing_cta":
      return (
        <div key={block.id}>
          <a
            href="/onboarding"
            className="block w-full rounded-full bg-primary py-4 text-center transition-opacity hover:opacity-90"
          >
            <span className="block text-lg font-bold text-primary-foreground">Try It Free with your logo</span>
            <span className="block text-xs text-primary-foreground/70 mt-0.5">We'll cover shipping</span>
          </a>
        </div>
      );
    case "marketing_examples":
      return <MarketingExamplesCard key={block.id} />;
    case "marketing_features": {
      const feats = [
        { title: "Reviews", desc: "Collect Google reviews with one tap" },
        { title: "Links & Socials", desc: "All your platforms in one place" },
        { title: "Contact / Save Phone", desc: "Visitors save your contact instantly" },
        { title: "Menu & Services", desc: "Showcase what you offer" },
        { title: "Analytics", desc: "See who visits and what they click" },
        { title: "Shop", desc: "Sell courses, guides & products. TapAway takes 0%" },
      ];
      return (
        <div key={block.id} className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-5">
          <h4 className="text-white font-semibold text-sm mb-3">Everything in one place</h4>
          <div className="grid grid-cols-2 gap-3">
            {feats.map(f => (
              <div key={f.title} className="flex flex-col gap-1">
                <span className="text-white text-xs font-medium">{f.title}</span>
                <p className="text-white/50 text-[10px] leading-tight">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      );
    }
    default:
      // Product block handled outside switch via creatorProducts lookup
      return null;
  }
});

// Product card for marketplace
const ProductCard = memo(function ProductCard({ 
  product, 
  isDarkBg,
  onBuy,
  onPreview
}: { 
  product: { id: string; title: string; description: string | null; price_cents: number; product_type: string; cover_image_url: string | null; image_urls?: string[] | null; duration_minutes?: number; creator_id?: string };
  isDarkBg?: boolean;
  onBuy: (productId: string, bookingId?: string) => void;
  onPreview: (product: any) => void;
}) {
  const isBooking = product.product_type === "booking";
  return (
    <div className={`rounded-xl overflow-hidden border ${isDarkBg ? 'bg-white/10 border-white/20' : 'bg-card border-border'}`}>
      {product.cover_image_url && (
        <img src={product.cover_image_url} alt={product.title} className="w-full h-32 object-cover" loading="lazy" />
      )}
      <div className="p-4 space-y-2">
        <h4 className={`font-semibold text-sm ${isDarkBg ? 'text-white' : 'text-foreground'}`}>{product.title}</h4>
        {product.description && (
          <p className={`text-xs line-clamp-2 ${isDarkBg ? 'text-white/60' : 'text-muted-foreground'}`}>{product.description}</p>
        )}
        <div className="flex items-center justify-between pt-1">
          <span className={`font-bold ${isDarkBg ? 'text-white' : 'text-foreground'}`}>
            ${(product.price_cents / 100).toFixed(2)}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPreview(product)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-opacity hover:opacity-80 ${isDarkBg ? 'border-white/30 text-white' : 'border-border text-foreground'}`}
            >
              {isBooking ? "View & Book" : "View Details"}
            </button>
            {!isBooking && (
              <button
                onClick={() => onBuy(product.id)}
                className="px-4 py-1.5 bg-primary text-primary-foreground rounded-full text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Buy Now
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

// Inline Product Block - rendered within the unified content stream
const ProductBlockCard = memo(function ProductBlockCard({
  product,
  isDarkBg,
  onBuy,
  onPreview,
}: {
  product: { id: string; title: string; description: string | null; price_cents: number; cover_image_url: string | null; product_type?: string; duration_minutes?: number; creator_id?: string };
  isDarkBg?: boolean;
  onBuy: (productId: string, bookingId?: string) => void;
  onPreview: (product: any) => void;
}) {
  const isBooking = product.product_type === "booking";
  return (
    <div className={`rounded-xl overflow-hidden border ${isDarkBg ? 'bg-white/10 border-white/20' : 'bg-card border-border'} shadow-sm`}>
      {product.cover_image_url && (
        <div className="relative aspect-video">
          <img src={product.cover_image_url} alt={product.title} className="w-full h-full object-cover" loading="lazy" />
          <div className="absolute top-2 right-2 px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-lg">
            ${(product.price_cents / 100).toFixed(2)}
          </div>
        </div>
      )}
      <div className="p-4 space-y-2">
        <h4 className={`font-bold text-sm ${isDarkBg ? 'text-white' : 'text-foreground'}`}>{product.title}</h4>
        {product.description && (
          <p className={`text-xs line-clamp-2 ${isDarkBg ? 'text-white/60' : 'text-muted-foreground'}`}>{product.description}</p>
        )}
        {!product.cover_image_url && (
          <span className={`font-bold text-sm ${isDarkBg ? 'text-white' : 'text-foreground'}`}>
            ${(product.price_cents / 100).toFixed(2)}
          </span>
        )}
        <div className="flex gap-2">
          {isBooking ? (
            <button
              onClick={() => onPreview(product)}
              className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Book Now
            </button>
          ) : (
            <>
              <button
                onClick={() => onBuy(product.id)}
                className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Get it Now
              </button>
              <button
                onClick={() => onPreview(product)}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-opacity hover:opacity-80 ${isDarkBg ? 'border-white/30 text-white' : 'border-border text-foreground'}`}
              >
                Preview
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

const PersonalProfilePage = ({ usernameOverride, initialProfile }: Props = {}) => {
  const { username: paramUsername, slug } = useParams<{ username?: string; slug?: string }>();
  const [searchParams] = useSearchParams();
  const username = usernameOverride || paramUsername || slug;
  const navigate = useNavigate();
  
  // Use optimized data fetching with caching — pass initialProfile to skip redundant query
  const { data, loading, error } = useProfileData(username, initialProfile);

  // Creator products state
  const [creatorProducts, setCreatorProducts] = useState<any[]>([]);
  const [purchaseToken, setPurchaseToken] = useState<string | null>(null);
  const [buyingProductId, setBuyingProductId] = useState<string | null>(null);
  const [previewProduct, setPreviewProduct] = useState<any | null>(null);

  // Fetch creator products when profile loads
  useEffect(() => {
    if (!data?.profile?.id) return;
    
    supabase
      .rpc("get_public_creator_products", { _creator_id: data.profile.id })
      .then(({ data: products }) => {
        if (products) setCreatorProducts(products as typeof creatorProducts);
      });
  }, [data?.profile?.id]);

  // Handle purchase success - lookup access token
  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    const purchaseStatus = searchParams.get("purchase");
    
    if (purchaseStatus === "success" && sessionId) {
      // Poll for the purchase record (webhook may take a moment)
      const checkPurchase = async () => {
        for (let i = 0; i < 10; i++) {
          const { data: purchases } = await supabase
            .from("creator_purchases")
            .select("access_token")
            .eq("stripe_session_id", sessionId)
            .limit(1);
          
          if (purchases && purchases.length > 0) {
            setPurchaseToken((purchases[0] as any).access_token);
            toast.success("Purchase complete! Your download is ready.");
            return;
          }
          await new Promise(r => setTimeout(r, 2000));
        }
        toast.info("Payment received! Your download link will be available shortly.");
      };
      checkPurchase();
    }
  }, [searchParams]);

  const handleBuyProduct = async (productId: string, bookingId?: string) => {
    setBuyingProductId(productId);
    try {
      const body: any = { productId };
      if (bookingId) body.bookingId = bookingId;
      
      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke("create-product-checkout", {
        body,
      });
      if (checkoutError) throw checkoutError;
      if (checkoutData?.url) {
        window.location.href = checkoutData.url;
      }
    } catch (err) {
      console.error("Checkout error:", err);
      toast.error("Failed to start checkout");
    } finally {
      setBuyingProductId(null);
    }
  };

  // Track visit after data loads (non-blocking)
  useEffect(() => {
    if (data?.profile?.id) {
      trackProfileVisit(data.profile.id);
    }
  }, [data?.profile?.id]);

  // Preload critical images via <link rel="preload"> tags
  useEffect(() => {
    if (!data?.profile) return;
    const urls: string[] = [];
    if (data.profile.header_image_url) urls.push(getOptimizedImageUrl(data.profile.header_image_url, 640, 85));
    if (data.profile.profile_photo_url) urls.push(getOptimizedImageUrl(data.profile.profile_photo_url, 1080, 90));
    // Preload ALL link cover images and thumbnails
    data.links.forEach(l => {
      if (l.cover_image_url) urls.push(getOptimizedImageUrl(l.cover_image_url, 640, 85));
      if (l.thumbnail_url) urls.push(getOptimizedImageUrl(l.thumbnail_url, 160, 85));
    });

    const injected: HTMLLinkElement[] = [];
    urls.forEach(url => {
      const existing = document.querySelector(`link[rel="preload"][href="${url}"]`);
      if (existing) return;
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = url;
      document.head.appendChild(link);
      injected.push(link);
    });
    return () => { injected.forEach(l => l.remove()); };
  }, [data?.profile?.header_image_url, data?.profile?.profile_photo_url, data?.links]);

  // Set mobile browser theme-color meta tag to black for all profiles
  useEffect(() => {
    const themeColor = "#000000";
    let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', themeColor);
    
    return () => {
      meta?.setAttribute('content', '#ffffff');
    };
  }, []);

  const [showShareModal, setShowShareModal] = useState(false);
  const [extractedBannerColor, setExtractedBannerColor] = useState<string | null>(null);
  const [showContactTooltip, setShowContactTooltip] = useState(false);

  // Show "Save my contact!" tooltip once per session
  useEffect(() => {
    if (!data?.profile?.contact_enabled) return;
    if (data?.profile?.contact_display_style === 'button') return;
    const key = `contact_tooltip_seen_${username}`;
    if (sessionStorage.getItem(key)) return;
    setShowContactTooltip(true);
    const timer = setTimeout(() => {
      setShowContactTooltip(false);
      sessionStorage.setItem(key, 'true');
    }, 6000);
    return () => clearTimeout(timer);
  }, [data?.profile?.contact_enabled, username]);

  // Extract color from profile photo (used as banner) for natural fade effect
  // When header_type is "banner", we use the profile_photo_url as the banner
  const bannerUrlForExtraction = data?.profile?.header_type === "banner" && data?.profile?.profile_photo_url
    ? data.profile.profile_photo_url
    : null;
  
  useEffect(() => {
    if (bannerUrlForExtraction) {
      extractBottomColor(bannerUrlForExtraction).then(setExtractedBannerColor);
    } else {
      setExtractedBannerColor(null);
    }
  }, [bannerUrlForExtraction]);

  // Detect if banner color is light (white/bright image) — need stronger overlay + dark text
  const bannerLuminance = getRgbLuminance(extractedBannerColor);
  const isLightBanner = bannerLuminance !== null && bannerLuminance > 0.7;

  // Must be called before early returns to comply with React Rules of Hooks
  const docBgColor = (() => {
    if (!data?.profile) return null;
    const bg = data.profile.background_color || "#000000";
    if (bg.startsWith('linear-gradient') || bg.startsWith('radial-gradient')) {
      return getBaseColorFromGradient(bg);
    }
    return bg;
  })();

  // Set document background to match profile theme (eliminates white bar at bottom)
  useAppBackground(docBgColor);

  const handleShare = useCallback(() => {
    if (!data?.profile) return;
    setShowShareModal(true);
  }, [data?.profile]);

  const handleSaveContact = useCallback(async () => {
    setShowContactTooltip(false);
    sessionStorage.setItem(`contact_tooltip_seen_${username}`, 'true');
    if (!data?.profile) return;
    
    const profile = data.profile;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    await downloadVCard({
      fullName: profile.contact_name || profile.full_name,
      email: profile.contact_email || undefined,
      phone: profile.contact_phone || undefined,
      company: profile.contact_company || undefined,
      title: profile.contact_title || undefined,
      address: profile.contact_address || undefined,
      website: profile.contact_website || `https://tapaway.co/${username}`,
      profilePhotoUrl: profile.contact_photo_url || profile.profile_photo_url || undefined,
    });
    
    // Track the save contact event
    if (profile.id) {
      supabase
        .from("personal_analytics")
        .insert({
          profile_id: profile.id,
          event_type: "contact_save",
          visitor_info: {
            referrer: document.referrer || null,
            userAgent: navigator.userAgent,
          },
        })
        .then(() => {});
    }
    
    if (isIOS) {
      toast.success("Tap Create New Contact to save — photo will appear after saving");
    } else {
      toast.success("Contact saved!");
    }
  }, [data?.profile]);

  // Loading skeleton - minimal, fast to render
  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="h-32 bg-white/10 animate-pulse" />
        <div className="max-w-md mx-auto px-4 -mt-16 pb-12">
          <div className="h-28 w-28 rounded-full bg-white/10 animate-pulse border-4 border-black" />
          <div className="mt-4 space-y-2">
            <div className="h-6 w-40 bg-white/10 animate-pulse rounded" />
            <div className="h-4 w-24 bg-white/10 animate-pulse rounded" />
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

  // Separate icon-style links from pill-style links
  // Icon links include both 'icon' and 'both' display styles
  const iconLinks = links.filter((l: any) => l.is_active !== false && l.url && l.url.trim() !== '' && (l.display_style === 'icon' || l.display_style === 'both'));
  // Pill links include everything except 'icon' only (so 'both' appears in both places)
  const pillLinks = links.filter((l: any) => l.is_active !== false && l.display_style !== 'icon');

  // All non-featured items go into unified list for proper sort order
  const nonFeaturedPillLinks = pillLinks.filter((l: any) => !l.is_featured);

  const unifiedItems: UnifiedItem[] = [
    ...nonFeaturedPillLinks.map((link): UnifiedItem => ({ kind: "link", data: link })),
    ...blocks.map((block): UnifiedItem => ({ kind: "block", data: block })),
  ].sort((a, b) => a.data.sort_order - b.data.sort_order);

  // Extract featured link (renders at top separately)
  const featuredLink = pillLinks.find((l: any) => l.is_featured === true);

  // Group consecutive grid links for 2-column rendering
  const groupedItems: (UnifiedItem | { kind: "grid-group"; links: typeof links })[] = [];
  let currentGridGroup: typeof links = [];
  
  for (const item of unifiedItems) {
    if (item.kind === "link" && item.data.grid_size === 'half' && item.data.cover_image_url) {
      currentGridGroup.push(item.data);
    } else {
      // Flush current grid group if any
      if (currentGridGroup.length > 0) {
        groupedItems.push({ kind: "grid-group", links: currentGridGroup });
        currentGridGroup = [];
      }
      groupedItems.push(item);
    }
  }
  // Flush remaining grid group
  if (currentGridGroup.length > 0) {
    groupedItems.push({ kind: "grid-group", links: currentGridGroup });
  }

  // Use optimized header image URL for faster loading
  const optimizedHeaderUrl = profile.header_type === "image" && profile.header_image_url
    ? getOptimizedImageUrl(profile.header_image_url, 640, 85)
    : null;
  
  // Banner image for premium users (header_type === "banner")
  // Uses profile_photo_url as the banner (no separate upload)
  const bannerUrl = (profile.header_type === "banner" && profile.profile_photo_url)
    ? getOptimizedImageUrl(profile.profile_photo_url, 1080, 90)
    : null;
  const hasBanner = !!bannerUrl;

  // "Logo header" — the whole logo is shown uncropped at the top, then the page
  // flows straight into the standard Solo Pro layout.
  const isLogoHeader = profile.header_type === "logo";
  const logoUrl = (isLogoHeader && profile.profile_photo_url)
    ? getOptimizedImageUrl(profile.profile_photo_url, 1080, 92)
    : null;

  
  const headerStyle = optimizedHeaderUrl
    ? { backgroundImage: `url(${optimizedHeaderUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: profile.header_color || "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))" };

   // Default to black background (#000000) for users without a set background
  const bgColor = profile.background_color || "#000000";
  const profileBgStyle = (profile as any).bg_style as string | null;
  const isGradientBg = profileBgStyle ? true : (bgColor.startsWith('linear-gradient') || bgColor.startsWith('radial-gradient'));
  
  // Premium dark base: use slate-950 as base with brand color as radial glow
  // Only override for default flat hex backgrounds (not user-set gradients)
  const isDefaultDarkBg = !profileBgStyle && !isGradientBg && isColorDark(bgColor);
  const bgStyle = profileBgStyle
    ? { background: profileBgStyle }
    : isGradientBg 
      ? { background: bgColor } 
      : isDefaultDarkBg
        ? { backgroundColor: '#020617' }
        : { backgroundColor: bgColor };
  // Brand glow gradient for dark backgrounds
  const brandGlowStyle = isDefaultDarkBg && bgColor !== '#020617'
    ? { background: `radial-gradient(ellipse at top center, ${bgColor}30 0%, transparent 60%)` }
    : undefined;
  const pfpCentered = profile.header_type === "banner" || isLogoHeader || profile.pfp_position === "center";
  // Shared readability rules derived from the actual page background.
  const hubContrast = resolveHubContrast(profileBgStyle || bgColor);
  // For banners, use the extracted bottom color luminance instead of blindly assuming dark
  const isDarkBg = hasBanner
    ? (extractedBannerColor ? isColorDark(extractedBannerColor) : true)
    : (isGradientBg ? isColorDark(getBaseColorFromGradient(bgColor)) : isColorDark(bgColor));

  // Rep-built demo hub that has not converted to a paid plan yet
  const isUnclaimedDemo =
    Boolean((profile as any).created_by_rep_id) &&
    (profile as any).subscription_status === "trialing";


  
  // Dynamic text classes based on background
  // Use explicit colors (not theme-aware tokens) so text is always readable
  // against the inline background, regardless of system dark/light mode
  const profileTextColor = (profile as any).text_color as string | null;
  const profileAccentColor = (profile as any).button_theme as string | null;
  // Guaranteed fallback so legacy profiles (null text_color) never have invisible text
  const safeTextColor = profileTextColor || (isDarkBg ? '#FFFFFF' : '#1A1A1A');
  const headingClass = profileTextColor ? "" : (isDarkBg ? "text-white" : "text-gray-900");
  const headingStyle = { color: safeTextColor };
  const textClass = profileTextColor ? "" : (isDarkBg ? "text-white/80" : "text-gray-800");
  const textStyle = { color: safeTextColor, opacity: 0.85 };
  const mutedClass = isDarkBg ? "text-white/60" : "text-gray-500";

  // Calculate fade color for header transition
  const fadeToColor = profileBgStyle 
    ? getBaseColorFromGradient(profileBgStyle)
    : isGradientBg ? getBaseColorFromGradient(bgColor) : bgColor;

  // Get outer background color based on profile theme
  const outerBgColor = profileBgStyle
    ? getBaseColorFromGradient(profileBgStyle)
    : isGradientBg ? getBaseColorFromGradient(bgColor) : bgColor;

  return (
    // Outer wrapper - themed background visible on desktop around the phone frame
    <div 
      className="min-h-screen"
      style={{ backgroundColor: outerBgColor }}
    >
      {/* Phone-frame container - full width on mobile, centered card on desktop with rounded corners */}
      {/* Add top padding on desktop for spacing, using outer bg color instead of margin */}
      <div className="hidden md:block md:h-4" />
      <div 
        className="min-h-[100dvh] md:max-w-[430px] md:mx-auto md:relative md:rounded-3xl md:mb-4"
        style={{
          ...bgStyle,
          // Larger, softer glow that blends the frame edge into the outer background
          boxShadow: hasBanner && extractedBannerColor 
            ? `0 0 60px 20px ${extractedBannerColor}25`
            : '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
      >
        {/* Brand color radial glow overlay */}
        {brandGlowStyle && (
          <div className="absolute inset-0 pointer-events-none rounded-3xl" style={brandGlowStyle} />
        )}
        {isLogoHeader ? (
          <div
            className="relative w-full flex items-center justify-center pt-8 pb-4 px-5"
            style={logoBandColor ? { backgroundColor: logoBandColor } : undefined}
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={profile.full_name}
                loading="eager"
                decoding="async"
                className="mx-auto"
                style={logoImageStyle((profile as any).logo_scale)}
              />
            ) : (
              <div className="h-24" />
            )}

            {/* Save contact / Share float over the logo band so they stay
                visible on light and dark pages alike. */}
            <div
              className="absolute right-4 flex gap-2 z-20"
              style={{ top: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
            >
              {profile.contact_enabled && profile.contact_display_style !== 'button' && (
                <span className="relative">
                  <button
                    onClick={handleSaveContact}
                    className={`h-11 w-11 rounded-full flex items-center justify-center shadow-sm transition-colors ${hubContrast.chipClass}`}
                    aria-label="Save contact"
                  >
                    <UserPlus className={`h-4 w-4 ${hubContrast.chipIconClass}`} />
                  </button>
                  {showContactTooltip && (
                    <div
                      className="absolute z-50 right-0 top-full mt-2 whitespace-nowrap bg-white text-gray-900 text-xs font-medium px-3 py-1.5 rounded-full shadow-lg animate-fade-in pointer-events-none"
                      style={{ animationDuration: '0.3s' }}
                    >
                      Save my contact!
                      <div className="absolute top-[-6px] right-3 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-white" />
                    </div>
                  )}
                </span>
              )}
              <button
                onClick={handleShare}
                className={`h-11 w-11 rounded-full flex items-center justify-center shadow-sm transition-colors ${hubContrast.chipClass}`}
                aria-label="Share profile"
              >
                <Share2 className={`h-4 w-4 ${hubContrast.chipIconClass}`} />
              </button>
            </div>
          </div>
        ) : hasBanner ? (

          <div className="relative">
            {/* Existing banners retain their original full-height presentation. */}
            <div 
              className="w-full h-[55vh] md:h-[50vh] overflow-hidden"
              style={{ willChange: 'transform' }}
            >
              <img
                src={bannerUrl}
                alt="Banner"
                loading="eager"
                decoding="async"
                className="w-full h-full object-cover object-top"
                style={{
                  WebkitMaskImage: 'linear-gradient(to bottom, black 75%, transparent 100%)',
                  maskImage: 'linear-gradient(to bottom, black 75%, transparent 100%)',
                }}
              />
            </div>

            {/* Gradient fade at bottom using extracted color from image - taller for text overlap */}
            <div 
              className="absolute inset-x-0 bottom-0 h-64 pointer-events-none"
              style={{
                background: isLightBanner
                  ? `linear-gradient(to bottom, transparent 0%, transparent 20%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.8) 80%, rgba(0,0,0,0.95) 100%)`
                  : `linear-gradient(to bottom, transparent 0%, transparent 30%, ${extractedBannerColor || fadeToColor}40 60%, ${extractedBannerColor || fadeToColor} 100%)`
              }}
            />

            {/* Action buttons - top right for banner profiles */}
            <div className="absolute top-4 right-4 flex gap-2 z-20">
              {profile.contact_enabled && profile.contact_display_style !== 'button' && (
                <span className="relative">
                  <button
                    onClick={handleSaveContact}
                    className={`h-10 w-10 rounded-full flex items-center justify-center shadow-sm transition-colors ${isLightBanner ? 'bg-white/80 hover:bg-white/90' : 'bg-black/30 hover:bg-black/40'}`}
                    aria-label="Save contact"
                  >
                    <UserPlus className={`h-4 w-4 ${isLightBanner ? 'text-gray-900' : 'text-white'}`} />
                  </button>
                  {showContactTooltip && (
                    <div
                      className="absolute z-50 right-0 top-full mt-2 whitespace-nowrap bg-white text-gray-900 text-xs font-medium px-3 py-1.5 rounded-full shadow-lg animate-fade-in pointer-events-none"
                      style={{ animationDuration: '0.3s' }}
                    >
                      Save my contact!
                      <div className="absolute top-[-6px] right-3 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-white" />
                    </div>
                  )}
                </span>
              )}
              <button
                onClick={handleShare}
                className={`h-10 w-10 rounded-full flex items-center justify-center shadow-sm transition-colors ${isLightBanner ? 'bg-white/80 hover:bg-white/90' : 'bg-black/30 hover:bg-black/40'}`}
                aria-label="Share profile"
              >
                <Share2 className={`h-4 w-4 ${isLightBanner ? 'text-gray-900' : 'text-white'}`} />
              </button>
            </div>
          </div>
        ) : (
          <div className="relative">
            <div 
              className="h-48 bg-muted" 
              style={headerStyle} 
            />
            {/* Smoother fade overlay from header to background - 6-stop gradient for cleaner blending */}
            <div 
              className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none"
              style={{
                background: `linear-gradient(to bottom, transparent 0%, ${fadeToColor}10 15%, ${fadeToColor}30 35%, ${fadeToColor}60 55%, ${fadeToColor}90 75%, ${fadeToColor} 100%)`
              }}
            />
          </div>
        )}
        
        {/* Profile Content - overlapping text for banner mode (transparent bg, text floats on banner) */}
        <div 
          className={`max-w-md mx-auto px-4 ${isLogoHeader ? 'mt-2' : hasBanner ? '-mt-32' : '-mt-20'} pb-12 relative z-10 ${pfpCentered ? "text-center" : ""}`}
        >
          {/* Action buttons - Share and Save Contact (non-banner, non-logo profiles) */}
          {!hasBanner && !isLogoHeader && (
            <div className="absolute top-0 right-4 flex gap-2">
              {profile.contact_enabled && profile.contact_display_style !== 'button' && (
                <span className="relative">
                  <button
                    onClick={handleSaveContact}
                    className={`h-10 w-10 rounded-full flex items-center justify-center shadow-sm transition-colors ${isDarkBg ? 'bg-black/30 hover:bg-black/40' : 'bg-white/90 hover:bg-white'}`}
                    aria-label="Save contact"
                  >
                    <UserPlus className={`h-4 w-4 ${isDarkBg ? 'text-white' : 'text-gray-900'}`} />
                  </button>
                  {showContactTooltip && (
                    <div
                      className="absolute z-50 right-0 top-full mt-2 whitespace-nowrap bg-white text-gray-900 text-xs font-medium px-3 py-1.5 rounded-full shadow-lg animate-fade-in pointer-events-none"
                      style={{ animationDuration: '0.3s' }}
                    >
                      Save my contact!
                      <div className="absolute top-[-6px] right-3 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-white" />
                    </div>
                  )}
                </span>
              )}
              <button
                onClick={handleShare}
                className={`h-10 w-10 rounded-full flex items-center justify-center shadow-sm transition-colors ${isDarkBg ? 'bg-black/30 hover:bg-black/40' : 'bg-white/90 hover:bg-white'}`}
                aria-label="Share profile"
              >
                <Share2 className={`h-4 w-4 ${isDarkBg ? 'text-white' : 'text-gray-900'}`} />
              </button>
            </div>
          )}

          {/* Avatar - priority loaded, hidden when the logo/banner is the header */}
          {!hasBanner && !isLogoHeader && (

            <div className={`relative ${pfpCentered ? "inline-block" : ""} mb-4`}>
              <OptimizedAvatar
                src={profile.profile_photo_url}
                alt={profile.full_name}
                size={28}
                className={`border-4 ${isDarkBg ? 'border-black/30' : 'border-white'}`}
                priority
                fallbackInitial={profile.full_name.charAt(0).toUpperCase()}
                objectFit="contain"
              />
              <div className={`absolute bottom-1 right-1 h-7 w-7 bg-primary rounded-full flex items-center justify-center border-2 shadow-sm ${isDarkBg ? 'border-black/30' : 'border-white'}`}>
                <CheckCircle2 className="h-4 w-4 text-white" />
              </div>
            </div>
          )}

          {/* Name & Username & Headline/Bio */}
          {hasBanner ? (
            // Banner mode: adaptive text based on banner brightness
            <>
              <h1 className={`text-3xl font-bold drop-shadow-lg ${isLightBanner ? 'text-gray-900' : 'text-white'}`}>
                {profile.show_username !== false ? `@${profile.username}` : profile.full_name}
              </h1>
              {profile.headline && (
                <p className={`text-base mt-2 drop-shadow-md ${isLightBanner ? 'text-gray-800' : 'text-white/90'}`}>
                  {profile.headline}
                </p>
              )}
                {profile.bio && (
                  <p className={`text-base font-bold mt-3 max-w-xs mx-auto drop-shadow-md leading-relaxed ${isLightBanner ? 'text-gray-900' : 'text-white'}`}>
                    {profile.bio}
                  </p>
                )}
              {/* Social icon bar */}
              <SocialIconBar links={iconLinks} isDarkBg={!isLightBanner} profileId={profile.id} />
              <div className="mb-3" />
            </>
          ) : (
            // Standard mode: Current styling
            <>
              <h1 className={`text-2xl font-bold ${headingClass}`} style={headingStyle}>{profile.full_name}</h1>
              {profile.headline && (
                <p className={`text-sm ${textClass} mt-1`} style={textStyle}>{profile.headline}</p>
              )}
              {profile.show_username !== false && (
                <p className={`${mutedClass} text-sm mt-1`}>@{profile.username}</p>
              )}
              {profile.is_founding_user && profile.show_founding_badge && (
                <span className="inline-flex items-center gap-1 mt-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                  <svg className="h-3 w-3 fill-amber-500" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  Founding Creator #{profile.founding_number}
                </span>
              )}
              
              {/* Social icon bar - shows icon-style links */}
              <SocialIconBar links={iconLinks} isDarkBg={isDarkBg} profileId={profile.id} />
              
              {profile.bio && (
                <p className={`${mutedClass} text-sm mt-2 max-w-xs mx-auto`} style={textStyle}>{profile.bio}</p>
              )}
              {/* Inline Save Contact button */}
              {profile.contact_enabled && profile.contact_display_style === 'button' && (
                <button
                  onClick={handleSaveContact}
                  className="w-full flex items-center justify-center gap-2 py-3 mt-4 rounded-full font-semibold shadow-lg text-sm active:scale-95 transition-transform"
                   style={{
                    backgroundColor: (() => {
                      const btn = profileAccentColor;
                      const isHex = btn && /^#[0-9A-Fa-f]{3,6}$/.test(btn);
                      if (isHex && btn !== '#000000') return btn;
                      return isDarkBg ? '#FFFFFF' : '#1A1A1A';
                    })(),
                    color: (() => {
                      const btn = profileAccentColor;
                      const isHex = btn && /^#[0-9A-Fa-f]{3,6}$/.test(btn);
                      const bg = (isHex && btn !== '#000000') ? btn : (isDarkBg ? '#FFFFFF' : '#1A1A1A');
                      return isColorDark(bg) ? '#FFFFFF' : '#1A1A1A';
                    })(),
                  }}
                >
                  <UserPlus className="h-4 w-4" />
                  {(profile as any).contact_button_label || 'Save Contact'}
                </button>
              )}
              <div className="mb-6" />
            </>
          )}

          {/* Links section - solid background starts here for banner mode */}
          <div 
            className={hasBanner ? "rounded-3xl pt-4 pb-6 -mx-4 px-4" : ""}
            style={hasBanner ? { backgroundColor: isLightBanner ? '#1a1a1a' : (extractedBannerColor || undefined) } : undefined}
          >
            {/* Lead Form CTA */}
            <div className="mb-4">
              <LeadFormSheet profileId={profile.id} accentColor={profileAccentColor} />
            </div>

            {/* Featured link - rendered prominently at top */}
            {featuredLink && (
              <div className="mb-4">
                <ProfileLink link={featuredLink} profileId={profile.id} isFeatured index={0} profilePhotoUrl={profile.profile_photo_url} accentColor={profileAccentColor} contrast={hubContrast} />
              </div>
            )}

          {/* Unified content - interleaved links, grid groups, and blocks */}
          {groupedItems.length > 0 && (
            <div className="space-y-3">
              {(() => {
                let linkIndex = featuredLink ? 1 : 0;
                return groupedItems.map((item, idx) => {
                if (item.kind === "grid-group") {
                  const startIndex = linkIndex;
                  linkIndex += item.links.length;
                  return (
                    <div key={`grid-group-${idx}`} className="grid grid-cols-2 gap-3">
                      {item.links.map((link: any, i: number) => (
                        <div key={`grid-${link.id}`} className={item.links.length === 1 ? 'col-span-2' : ''}>
                          <ProfileLink link={link} profileId={profile.id} isGrid index={startIndex + i} profilePhotoUrl={profile.profile_photo_url} accentColor={profileAccentColor} contrast={hubContrast} />
                        </div>
                      ))}
                    </div>
                  );
                } else if (item.kind === "link") {
                  const currentIndex = linkIndex++;
                  return <ProfileLink key={`link-${item.data.id}`} link={item.data} profileId={profile.id} index={currentIndex} profilePhotoUrl={profile.profile_photo_url} accentColor={profileAccentColor} contrast={hubContrast} />;
                } else {
                  // Check if it's a product block
                  const blockData = item.data;
                  const blockContent = blockData.content as Record<string, string>;
                  if (blockData.block_type === "product" && blockContent.product_id) {
                    const product = creatorProducts.find((p: any) => p.id === blockContent.product_id);
                    if (product) {
                      return <ProductBlockCard key={`block-${blockData.id}`} product={product} isDarkBg={isDarkBg} onBuy={handleBuyProduct} onPreview={setPreviewProduct} />;
                    }
                    return null;
                  }
                  return <ProfileBlock key={`block-${item.data.id}`} block={item.data} profileId={profile.id} isDarkBg={isDarkBg} textColor={profileTextColor} />;
                }
              });
              })()}
            </div>
          )}

            {links.length === 0 && blocks.length === 0 && (
              <p className={`${mutedClass} text-center py-8`}>
                No links yet
              </p>
            )}
          </div>

          {/* Purchase Success Download Banner */}
          {purchaseToken && (
            <div className={`mt-6 p-4 rounded-xl border text-center ${isDarkBg ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'}`}>
              <p className={`font-semibold text-sm ${isDarkBg ? 'text-white' : 'text-gray-900'}`}>🎉 Purchase Complete!</p>
              <a
                href={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/download-product?token=${purchaseToken}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 px-6 py-2 bg-primary text-primary-foreground rounded-full text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Download Your File
              </a>
              <p className={`text-xs mt-2 ${isDarkBg ? 'text-white/50' : 'text-gray-500'}`}>Link expires in 72 hours</p>
            </div>
          )}

          {/* Creator Products Shop Section - only if show_shop_section is true */}
          {creatorProducts.length > 0 && (data?.profile as any)?.show_shop_section !== false && (
            <div className="mt-6 space-y-3">
              <h3 className={`text-lg font-bold ${isDarkBg ? 'text-white' : 'text-gray-900'}`}>
                Shop
              </h3>
              <div className="grid gap-3">
                {creatorProducts.map(product => (
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                    isDarkBg={isDarkBg} 
                    onBuy={handleBuyProduct}
                    onPreview={setPreviewProduct}
                  />
                ))}
              </div>
            </div>
          )}


          {/* Footer */}
          <footer className="mt-6 pb-4 text-center space-y-3">
            {/* Glass Pill CTA */}
            <motion.div 
              className="flex justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <a
                href="/personal"
                className="group inline-flex items-center gap-2 px-4 py-2 rounded-full border transition-opacity duration-300 text-sm opacity-60 hover:opacity-80 border-white/20"
              >
                <svg className="h-3.5 w-3.5 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="font-medium text-white/60">
                  Start using TapAway
                </span>
              </a>
            </motion.div>
            
            {/* Subtle tap-enabled indicator — only for users with active NFC cards */}
            {data?.hasActiveCard && (
              <p className={`text-xs flex items-center justify-center gap-1 ${isDarkBg ? 'text-white/40' : 'text-gray-400'}`}>
                <Smartphone className="h-3 w-3" />
                Tap-enabled
              </p>
            )}

            {/* Unclaimed demo hub takedown / claim notice */}
            {isUnclaimedDemo && (
              <p className={`text-[10px] leading-relaxed max-w-xs mx-auto px-4 ${isDarkBg ? 'text-white/35' : 'text-gray-400'}`}>
                Demo profile built using publicly available business information. To claim or request removal within
                14 days, contact{" "}
                <a
                  href="mailto:tap@tapaway.co"
                  className="underline decoration-dotted underline-offset-2"
                >
                  tap@tapaway.co
                </a>
                .
              </p>
            )}
          </footer>

        </div>
      </div>

      {/* Desktop-only QR code - positioned outside the phone frame */}
      <div className="hidden md:flex fixed bottom-8 right-8 bg-white p-4 rounded-2xl shadow-xl flex-col items-center gap-2 z-50">
        <QRCode 
          value={`https://tapaway.co/${profile.username}`} 
          size={100}
          level="M"
        />
        <p className="text-xs text-gray-600 font-medium">Scan to view on mobile</p>
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        profile={{
          username: profile.username,
          full_name: profile.full_name,
          profile_photo_url: profile.profile_photo_url,
          header_type: profile.header_type,
        }}
        shareUrl={`https://tapaway.co/${profile.username}`}
      />

      

      {/* Product Preview Modal */}
      <ProductPreviewModal
        product={previewProduct}
        isOpen={!!previewProduct}
        onClose={() => setPreviewProduct(null)}
        onBuy={handleBuyProduct}
      />
    </div>
  );
};

export default memo(PersonalProfilePage);
