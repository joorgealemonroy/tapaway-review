import { memo, useMemo, useState, useEffect } from "react";

import { ExternalLink, Mail, UserPlus } from "lucide-react";
import { getOptimizedImageUrl, OptimizedImage } from "./OptimizedImage";
import { getPlatformConfig, PLATFORM_COLORS } from "@/lib/platformLinks";
import { bannerAspectCss } from "@/lib/bannerAspect";
import { ImageLightbox } from "./ImageLightbox";
import { extractBottomColor } from "@/lib/imageColorExtraction";
import useEmblaCarousel from "embla-carousel-react";
import { sanitizeUrl } from "@/lib/sanitizeUrl";
import MarketingExamplesCard from "./MarketingExamplesCard";
import { parseMenuContent } from "@/lib/menuBlock";


// Helper to extract a base color from a gradient for fade effect
function getBaseColorFromGradient(gradient: string): string {
  const colorMatch = gradient.match(/#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}|rgb\([^)]+\)|rgba\([^)]+\)/g);
  if (colorMatch && colorMatch.length > 0) {
    return colorMatch[colorMatch.length - 1];
  }
  return "#000000";
}

// Helper to determine if a color is dark (handles null, undefined, shorthand hex)
function isColorDark(hexColor: string | null | undefined): boolean {
  if (!hexColor) return false;
  try {
    const hex = hexColor.replace('#', '');
    if (hex.length === 3) {
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

interface ProfileData {
  id: string;
  full_name: string;
  username: string;
  headline?: string | null;
  bio?: string | null;
  profile_photo_url?: string | null;
  header_type?: string | null;
  header_color?: string | null;
  header_image_url?: string | null;
  background_color?: string | null;
  pfp_position?: string | null;
  banner_image_url?: string | null;
  banner_fit?: string | null;
  banner_aspect?: string | null;
  plan_type?: string | null;
  show_username?: boolean;
  contact_enabled?: boolean | null;
  contact_display_style?: string | null;
  contact_name?: string | null;
  contact_button_label?: string | null;
  button_theme?: string | null;
  text_color?: string | null;
}

interface LinkData {
  id: string;
  label: string;
  url: string;
  link_type: string;
  is_active?: boolean | null;
  is_featured?: boolean | null;
  sort_order?: number | null;
  pill_color?: string | null;
  display_style?: string | null;
  cover_image_url?: string | null;
  grid_size?: string | null;
  thumbnail_url?: string | null;
}

interface BlockData {
  id: string;
  block_type: string;
  content: Record<string, unknown>;
  is_active?: boolean | null;
  sort_order: number;
  alignment?: string | null;
}

interface ProfilePreviewRendererProps {
  profile: ProfileData;
  links: LinkData[];
  blocks: BlockData[];
  isPreview?: boolean;
  onLinkClick?: (url: string) => void;
}

function ProfilePreviewRendererComponent({
  profile,
  links,
  blocks,
  isPreview = false,
  onLinkClick,
}: ProfilePreviewRendererProps) {
  const headerType = profile.header_type || "color";
  const headerColor = profile.header_color || "#6366f1";
  const headerImageUrl = profile.header_image_url;
  // Default to black background
  const backgroundColor = profile.background_color || "#000000";
  const isGradientBg = backgroundColor.startsWith('linear-gradient') || backgroundColor.startsWith('radial-gradient');
  
  // Premium dark base with brand glow for flat dark backgrounds
  const isDefaultDarkBg = !isGradientBg && isColorDark(backgroundColor);
  const effectiveBgColor = isDefaultDarkBg ? '#020617' : backgroundColor;
  const brandGlowStyle = isDefaultDarkBg && backgroundColor !== '#020617'
    ? { background: `radial-gradient(ellipse at top center, ${backgroundColor}30 0%, transparent 60%)` }
    : undefined;
  
  // Banner for premium users (header_type === "banner")
  // Uses profile_photo_url as the banner (no separate upload)
  const hasBanner = headerType === "banner";
  const bannerUrl = (hasBanner && profile.profile_photo_url) 
    ? getOptimizedImageUrl(profile.profile_photo_url, 400, 80) 
    : null;
  
  // Extract color from profile photo (used as banner) for natural fade
  const [extractedBannerColor, setExtractedBannerColor] = useState<string | null>(null);
  
  useEffect(() => {
    if (hasBanner && profile.profile_photo_url) {
      extractBottomColor(profile.profile_photo_url).then(setExtractedBannerColor);
    } else {
      setExtractedBannerColor(null);
    }
  }, [hasBanner, profile.profile_photo_url]);
  
  const isDarkBg = useMemo(() => hasBanner || (isGradientBg ? isColorDark(getBaseColorFromGradient(backgroundColor)) : isColorDark(backgroundColor)), [backgroundColor, isGradientBg, hasBanner]);
  
  // Dynamic text classes
  const headingClass = isDarkBg ? "text-white" : "text-gray-900";
  const textClass = isDarkBg ? "text-white/80" : "text-gray-600";
  const mutedClass = isDarkBg ? "text-white/60" : "text-gray-500";
  const pfpPosition = profile.header_type === "banner" ? "center" : (profile.pfp_position || "center");

  const activeLinks = useMemo(
    () => links.filter((l) => l.is_active !== false),
    [links]
  );

  // Separate icon-style links from pill-style links
  // "icon" and "both" both show in the icon bar
  const iconLinks = useMemo(
    () => activeLinks.filter((l) => l.display_style === 'icon' || l.display_style === 'both'),
    [activeLinks]
  );

  // "pill" and "both" both show as buttons (exclude "icon" only)
  const pillLinks = useMemo(
    () => activeLinks.filter((l) => l.display_style !== 'icon'),
    [activeLinks]
  );

  const featuredLink = useMemo(
    () => pillLinks.find((l) => l.is_featured),
    [pillLinks]
  );

  // Non-featured links for unified list
  const nonFeaturedPillLinks = useMemo(
    () => pillLinks.filter((l) => !l.is_featured),
    [pillLinks]
  );

  const activeBlocks = useMemo(
    () =>
      blocks
        .filter((b) => b.is_active !== false)
        .sort((a, b) => a.sort_order - b.sort_order),
    [blocks]
  );

  // Unified items sorted by sort_order (same logic as live profile)
  const unifiedItems = useMemo(() => {
    const items: Array<{ type: "link" | "block"; data: LinkData | BlockData }> = [];
    nonFeaturedPillLinks.forEach((link) => items.push({ type: "link", data: link }));
    activeBlocks.forEach((block) => items.push({ type: "block", data: block }));
    items.sort((a, b) => {
      const aOrder =
        a.type === "link"
          ? (a.data as LinkData).sort_order ?? 0
          : (a.data as BlockData).sort_order;
      const bOrder =
        b.type === "link"
          ? (b.data as LinkData).sort_order ?? 0
          : (b.data as BlockData).sort_order;
      return aOrder - bOrder;
    });
    return items;
  }, [nonFeaturedPillLinks, activeBlocks]);

  // Group consecutive grid links for 2-column rendering (same as live profile)
  const groupedItems = useMemo(() => {
    const result: Array<
      | { kind: "grid-group"; links: LinkData[] }
      | { kind: "link"; data: LinkData }
      | { kind: "block"; data: BlockData }
    > = [];
    let currentGridGroup: LinkData[] = [];

    for (const item of unifiedItems) {
      if (item.type === "link") {
        const link = item.data as LinkData;
        if (link.cover_image_url && link.grid_size === "half") {
          currentGridGroup.push(link);
        } else {
          // Flush current grid group if any
          if (currentGridGroup.length > 0) {
            result.push({ kind: "grid-group", links: currentGridGroup });
            currentGridGroup = [];
          }
          result.push({ kind: "link", data: link });
        }
      } else {
        // Flush current grid group if any
        if (currentGridGroup.length > 0) {
          result.push({ kind: "grid-group", links: currentGridGroup });
          currentGridGroup = [];
        }
        result.push({ kind: "block", data: item.data as BlockData });
      }
    }
    // Flush remaining grid group
    if (currentGridGroup.length > 0) {
      result.push({ kind: "grid-group", links: currentGridGroup });
    }
    return result;
  }, [unifiedItems]);

  const handleLinkClick = (e: React.MouseEvent, url: string) => {
    if (isPreview) {
      e.preventDefault();
      onLinkClick?.(url);
    }
  };

  // Collage preview with lightbox - horizontal swipeable carousel (supports mixed media)
  const CollagePreview = ({ media, isPreview, onLinkClick }: { media: Array<{ url: string; type: "image" | "video"; poster?: string }>; isPreview: boolean; onLinkClick?: (url: string) => void }) => {
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [emblaRef] = useEmblaCarousel({ 
      loop: false, 
      align: "start",
      containScroll: "trimSnaps",
      dragFree: true
    });

    const handleItemClick = (index: number) => {
      if (isPreview) {
        onLinkClick?.("#collage");
        return;
      }
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
                className="flex-shrink-0 w-[31%] aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity relative"
                style={{ touchAction: "pan-x" }}
              >
                {item.type === "video" ? (
                  <>
                    {item.poster ? (
                      <img src={getOptimizedImageUrl(item.poster, 150)} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-muted animate-pulse" />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-6 w-6 rounded-full bg-black/50 flex items-center justify-center">
                        <div className="w-0 h-0 border-t-[4px] border-t-transparent border-l-[7px] border-l-white border-b-[4px] border-b-transparent ml-0.5" />
                      </div>
                    </div>
                  </>
                ) : (
                  <img 
                    src={getOptimizedImageUrl(item.url, 150)} 
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
  };

  // Social icon bar for icon-style links - vibrant brand colors
  const renderIconBar = () => {
    if (iconLinks.length === 0) return null;
    
    // Get brand color for platform
    const getBrandColor = (type: string): string => {
      const colors = PLATFORM_COLORS as Record<string, string>;
      return colors[type] || '#6366f1';
    };
    
    // Get gradient for Instagram
    const getBrandStyle = (type: string): React.CSSProperties => {
      if (type === 'instagram') {
        return { background: PLATFORM_COLORS.instagramGradient };
      }
      return { backgroundColor: getBrandColor(type) };
    };
    
    // Determine if icon should be dark (for light bg platforms like Snapchat)
    const needsDarkIcon = (type: string): boolean => {
      return type === 'snapchat';
    };
    
    return (
      <div className="flex flex-wrap justify-center gap-2 mt-3">
        {iconLinks.map((link) => {
          const config = getPlatformConfig(link.link_type);
          const Icon = config?.icon;
          if (!Icon) return null;
          
          return (
            <a
              key={link.id}
              href={sanitizeUrl(link.url)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => handleLinkClick(e, link.url)}
              className="h-9 w-9 rounded-full flex items-center justify-center transition-all hover:scale-110 hover:shadow-lg shadow-sm"
              style={getBrandStyle(link.link_type)}
              title={config?.label}
            >
              <Icon className={`h-[18px] w-[18px] ${needsDarkIcon(link.link_type) ? 'text-black' : 'text-white'}`} />
            </a>
          );
        })}
      </div>
    );
  };

  const renderLink = (link: LinkData, isFeatured = false, isGrid = false, index = 99) => {
    const platform = getPlatformConfig(link.link_type);
    const Icon = platform?.icon;

    // Email link — inline bar with email + Connect button
    if (link.link_type === "email") {
      const emailAddress = link.url.replace(/^mailto:/i, "");
      return (
        <div
          key={link.id}
          className="flex items-center gap-2 rounded-full bg-gray-100 p-1 pl-3"
        >
          <Mail className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
          <span className="flex-1 text-xs font-medium text-gray-700 truncate">{emailAddress}</span>
          <span className="flex items-center gap-1.5 rounded-full bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white flex-shrink-0">
            Connect
            {profile.profile_photo_url ? (
              <img src={getOptimizedImageUrl(profile.profile_photo_url, 40)} alt="" className="h-5 w-5 rounded-full object-cover" />
            ) : (
              <div className="h-5 w-5 rounded-full bg-gray-600 flex items-center justify-center">
                <Mail className="h-2.5 w-2.5 text-gray-300" />
              </div>
            )}
          </span>
        </div>
      );
    }

    // Grid card-style link with cover image (square, 2-column layout)
    if (link.cover_image_url && isGrid) {
      return (
        <a
          key={link.id}
          href={sanitizeUrl(link.url)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => handleLinkClick(e, link.url)}
          className="block relative rounded-xl overflow-hidden aspect-square shadow-md group"
        >
          <img 
            src={getOptimizedImageUrl(link.cover_image_url, 300)} 
            alt={link.label}
            decoding="async"
            loading={index < 4 ? "eager" : "lazy"}
            fetchPriority={index < 4 ? "high" : undefined}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          {Icon && (
            <div 
              className={`absolute top-1.5 left-1.5 h-6 w-6 rounded-full flex items-center justify-center shadow-lg ${platform?.gradient || platform?.bgColor || 'bg-primary'}`}
            >
              <Icon className={`h-3 w-3 ${platform?.color || 'text-white'}`} />
            </div>
          )}
          <div className="absolute bottom-1.5 left-1.5 right-1.5">
            <span className="text-white font-bold text-xs drop-shadow-lg uppercase tracking-wide">
              {link.label}
            </span>
          </div>
        </a>
      );
    }

    // Full-width card-style link with cover image
    if (link.cover_image_url) {
      return (
        <a
          key={link.id}
          href={sanitizeUrl(link.url)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => handleLinkClick(e, link.url)}
          className="block relative rounded-2xl overflow-hidden aspect-[4/3] shadow-lg group"
        >
          <img 
            src={getOptimizedImageUrl(link.cover_image_url, 640)} 
            alt={link.label}
            decoding="async"
            loading={index < 4 ? "eager" : "lazy"}
            fetchPriority={index < 4 ? "high" : undefined}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          {Icon && (
            <div 
              className={`absolute top-2 left-2 h-8 w-8 rounded-full flex items-center justify-center shadow-lg ${platform?.gradient || platform?.bgColor || 'bg-primary'}`}
            >
              <Icon className={`h-4 w-4 ${platform?.color || 'text-white'}`} />
            </div>
          )}
          <div className="absolute bottom-2 left-2 right-2">
            <span className="text-white font-bold text-base drop-shadow-lg uppercase tracking-wide">
              {link.label}
            </span>
          </div>
        </a>
      );
    }

    if (isFeatured) {
      return (
        <a
          key={link.id}
          href={sanitizeUrl(link.url)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => handleLinkClick(e, link.url)}
          className="block w-full rounded-xl px-5 py-4 text-center font-semibold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] bg-white/10 backdrop-blur-md border border-white/10"
        >
          <span className="flex items-center justify-center gap-2">
            {Icon && <Icon className="h-5 w-5" />}
            {link.label}
            <ExternalLink className="h-4 w-4 opacity-70" />
          </span>
        </a>
      );
    }

    const isGoogleReview = link.link_type === 'google_review';
    const isYelp = link.link_type === 'yelp';
    const isWhitePill = isGoogleReview || isYelp;

    return (
      <a
        key={link.id}
        href={sanitizeUrl(link.url)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => handleLinkClick(e, link.url)}
        className={`flex items-center gap-3 rounded-xl border px-4 py-3 shadow-sm transition-all hover:shadow-md hover:scale-[1.01] ${
          isWhitePill
            ? 'bg-white hover:bg-gray-100 border-white/20 text-gray-900'
            : 'bg-white/10 backdrop-blur-md border-white/10 hover:bg-white/15'
        }`}
      >
        {link.thumbnail_url ? (
          <div className="h-10 w-10 rounded-lg overflow-hidden flex-shrink-0">
            <img src={getOptimizedImageUrl(link.thumbnail_url, 80)} alt="" decoding="async" loading={index < 4 ? "eager" : "lazy"} fetchPriority={index < 4 ? "high" : undefined} className="w-full h-full object-cover" />
          </div>
        ) : isWhitePill && Icon ? (
          <Icon className="h-7 w-7 flex-shrink-0" />
        ) : Icon && (
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${platform?.gradient || platform?.bgColor || 'bg-white/20'}`}
          >
            <Icon className={`h-5 w-5 ${platform?.color || 'text-white'}`} />
          </div>
        )}
        <span className={`flex-1 font-medium ${isWhitePill ? 'text-gray-900' : 'text-white'}`}>{link.label}</span>
        <ExternalLink className={`h-4 w-4 ${isWhitePill ? 'text-gray-400' : 'text-white/50'}`} />
      </a>
    );
  };

  const renderBlock = (block: BlockData) => {
    const content = block.content as Record<string, unknown>;
    const alignment = block.alignment || "left";
    const alignClass =
      alignment === "center"
        ? "text-center"
        : alignment === "right"
        ? "text-right"
        : "text-left";

    switch (block.block_type) {
      case "text": {
        const text = (content.text as string) || "";
        return (
          <div key={block.id} className={`px-1 ${alignClass}`}>
            <p className={`whitespace-pre-wrap ${textClass}`}>{text}</p>
          </div>
        );
      }
      case "heading": {
        const headingText = (content.text as string) || "";
        return (
          <div key={block.id} className={`px-1 ${alignClass}`}>
            <h2 className={`text-xl font-bold ${headingClass}`}>{headingText}</h2>
          </div>
        );
      }
      case "divider":
        return (
          <div key={block.id} className="py-2">
            <hr
              className="border-t-2"
              style={{ borderColor: isDarkBg ? 'rgba(255,255,255,0.2)' : `${headerColor}30` }}
            />
          </div>
        );
      case "image": {
        const imageUrl = content.url as string;
        const linkUrl = content.linkUrl as string | undefined;
        const size = (content.size as string) || "large";
        const overlayTitle = content.overlayTitle as string | undefined;
        const overlaySubtitle = content.overlaySubtitle as string | undefined;
        const overlayCta = content.overlayCta as string | undefined;
        const hasOverlay = overlayTitle || overlaySubtitle || overlayCta;

        if (!imageUrl) return null;

        const optimizedUrl = getOptimizedImageUrl(
          imageUrl,
          size === "small" ? 400 : 640
        );
        const sizeClasses =
          size === "small"
            ? "max-h-48 w-auto mx-auto"
            : "w-full max-h-80 object-cover";

        const imageWithOverlay = (
          <div className="relative rounded-xl overflow-hidden">
            <img
              src={optimizedUrl}
              alt=""
              className={sizeClasses}
              loading="lazy"
              decoding="async"
            />
            {hasOverlay && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-white text-center p-4">
                {overlayTitle && (
                  <h3 className="text-lg font-bold mb-0.5 drop-shadow-lg">{overlayTitle}</h3>
                )}
                {overlaySubtitle && (
                  <p className="text-xs font-medium mb-0.5 drop-shadow-md">{overlaySubtitle}</p>
                )}
                {overlayCta && (
                  <p className="text-xs font-semibold text-emerald-400 drop-shadow-md">{overlayCta}</p>
                )}
              </div>
            )}
          </div>
        );

        return (
          <div key={block.id} className={alignClass}>
            {linkUrl ? (
              <a
                href={sanitizeUrl(linkUrl)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => handleLinkClick(e, linkUrl)}
                className="block"
              >
                {imageWithOverlay}
              </a>
            ) : (
              imageWithOverlay
            )}
          </div>
        );
      }
      case "email_capture": {
        const headline = (content.headline as string) || "Stay Connected 💌";
        const description = (content.description as string) || "Leave your info and I'll reach out!";
        const buttonText = (content.buttonText as string) || "Submit";
        const showName = content.collectName === "true";
        const showMessage = content.collectMessage === "true";
        // Default to email-only for backward compat
        const showEmail = content.collectEmail !== "false";
        const showPhone = content.collectPhone === "true";
        
        const inputBg = isDarkBg ? 'bg-white/10 border-white/20' : 'bg-gray-100 border-gray-200';
        return (
          <div key={block.id} className={`w-full p-4 rounded-xl border shadow-sm space-y-2 ${isDarkBg ? 'bg-white/10 border-white/20' : 'bg-white/80'}`} style={!isDarkBg ? { borderColor: `${headerColor}30` } : undefined}>
            <div className="text-center">
              <h3 className={`font-semibold text-sm ${headingClass}`}>{headline}</h3>
              <p className={`text-xs mt-0.5 ${textClass}`}>{description}</p>
            </div>
            {showName && (
              <div className={`h-9 rounded-lg border ${inputBg}`} />
            )}
            {/* Phone first, then Email */}
            {showPhone && (
              <div className={`h-9 rounded-lg border ${inputBg}`} />
            )}
            {showEmail && (
              <div className={`h-9 rounded-lg border ${inputBg}`} />
            )}
            {showMessage && (
              <div className={`h-16 rounded-lg border ${inputBg}`} />
            )}
            <button
              className="w-full py-2 text-sm rounded-lg font-semibold text-white"
              style={{ backgroundColor: headerColor }}
            >
              {buttonText}
            </button>
          </div>
        );
      }
      case "sms_subscribe": {
        const headline = (content.headline as string) || "Join our VIP Text List";
        const description = (content.description as string) || "Get exclusive updates and offers via text.";
        const buttonText = (content.buttonText as string) || "Join the VIP List";
        return (
          <div
            key={block.id}
            className={`w-full p-4 rounded-xl border shadow-sm space-y-2 ${isDarkBg ? 'bg-white/10 border-white/20' : 'bg-white/80'}`}
            style={!isDarkBg ? { borderColor: `${headerColor}30` } : undefined}
          >
            <div className="text-center">
              <h3 className={`font-semibold text-sm ${headingClass}`}>{headline}</h3>
              <p className={`text-xs mt-0.5 ${textClass}`}>{description}</p>
            </div>
            <button
              className="w-full py-2 text-sm rounded-lg font-semibold text-white"
              style={{ backgroundColor: headerColor }}
              onClick={(e) => { if (isPreview) { e.preventDefault(); onLinkClick?.("#sms"); } }}
              type="button"
            >
              {buttonText}
            </button>
          </div>
        );
      }
      case "menu": {
        const menu = parseMenuContent(content);
        if (menu.sections.length === 0) return null;
        return (
          <div
            key={block.id}
            className={`w-full rounded-xl border px-3 py-2.5 text-center text-xs font-semibold ${
              isDarkBg ? "bg-white/10 border-white/20 text-white" : "bg-white/80 text-foreground"
            }`}
            style={!isDarkBg ? { borderColor: `${headerColor}30` } : undefined}
          >
            🍽 {menu.buttonLabel}
          </div>
        );
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
          <CollagePreview key={block.id} media={media} isPreview={isPreview} onLinkClick={onLinkClick} />
        );
      }
      case "product": {
        const productId = content.product_id as string;
        if (!productId) return null;
        return (
          <div key={block.id} className={`rounded-xl overflow-hidden border shadow-sm ${isDarkBg ? 'bg-white/10 border-white/20' : 'bg-white/80'}`} style={!isDarkBg ? { borderColor: `${headerColor}30` } : undefined}>
            <div className="p-3 space-y-1.5">
              <p className={`font-bold text-xs ${headingClass}`}>Product Block</p>
              <p className={`text-[10px] ${textClass}`}>Product will render here</p>
              <button className="w-full py-1.5 text-xs rounded-lg font-semibold text-white" style={{ backgroundColor: headerColor }}>
                Get it Now
              </button>
            </div>
          </div>
        );
      }
      case "marketing_cta":
        return (
          <div key={block.id}>
            <a
              href="/onboarding"
              className="block w-full rounded-full bg-primary py-3 text-center"
            >
              <span className="block text-base font-bold text-primary-foreground">Try It Free with your logo</span>
              <span className="block text-[10px] text-primary-foreground/70 mt-0.5">We'll cover shipping</span>
            </a>
          </div>
        );
      case "marketing_examples":
        return <MarketingExamplesCard key={block.id} compact />;
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
          <div key={block.id} className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-4">
            <h4 className="text-white font-semibold text-xs mb-2">Everything in one place</h4>
            <div className="grid grid-cols-2 gap-2">
              {feats.map(f => (
                <div key={f.title} className="flex flex-col gap-0.5">
                  <span className="text-white text-[10px] font-medium">{f.title}</span>
                  <p className="text-white/50 text-[8px] leading-tight">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div
      className="min-h-full w-full relative"
      style={isGradientBg ? { background: backgroundColor } : { backgroundColor: effectiveBgColor }}
    >
      {/* Brand color radial glow overlay */}
      {brandGlowStyle && (
        <div className="absolute inset-0 pointer-events-none" style={brandGlowStyle} />
      )}
      {/* Header or Banner */}
      <div className="relative w-full">
        {hasBanner ? (
          <>
            {/* Banner mode - fully visible with fade at bottom using extracted color */}
            <div 
              className="overflow-hidden relative"
              style={{
                backgroundColor: extractedBannerColor || headerColor,
                aspectRatio: bannerAspectCss(profile.banner_aspect),
              }}
            >
              {bannerUrl ? (
                <img
                  src={bannerUrl}
                  alt="Banner"
                  className={
                    profile.banner_fit === 'cover'
                      ? 'h-full w-full object-cover object-center'
                      : 'w-full h-full object-contain object-center block'
                  }
                  style={profile.banner_fit === 'cover' ? {
                    WebkitMaskImage: 'linear-gradient(to bottom, black 75%, transparent 100%)',
                    maskImage: 'linear-gradient(to bottom, black 75%, transparent 100%)',
                  } : undefined}
                />
              ) : (
                <div 
                  className="h-full w-full flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${headerColor}, ${headerColor}88)` }}
                >
                  <span className="text-white/60 text-xs">Add a photo for your banner</span>
                </div>
              )}

              {/* Gradient fade using extracted color from image - taller for text overlap */}
              {profile.banner_fit === 'cover' && (
                <div 
                  className="absolute inset-x-0 bottom-0 h-40 pointer-events-none"
                  style={{
                    background: `linear-gradient(to bottom, transparent 0%, transparent 30%, ${
                      extractedBannerColor || (isGradientBg ? getBaseColorFromGradient(backgroundColor) : backgroundColor)
                    }40 60%, ${
                      extractedBannerColor || (isGradientBg ? getBaseColorFromGradient(backgroundColor) : backgroundColor)
                    } 100%)`
                  }}
                />
              )}
            </div>

          </>
        ) : (
          <>
            <div className="h-32 overflow-hidden">
              {headerType === "image" && headerImageUrl ? (
                <OptimizedImage
                  src={headerImageUrl}
                  alt="Header"
                  className="h-full w-full object-cover"
                  width={800}
                />
              ) : (
                <div
                  className="h-full w-full"
                  style={{ backgroundColor: headerColor }}
                />
              )}
            </div>
            {/* Fade overlay from header to background */}
            <div 
              className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
              style={{
                background: `linear-gradient(to bottom, transparent 0%, ${
                  isGradientBg ? getBaseColorFromGradient(backgroundColor) : effectiveBgColor
                }40 40%, ${
                  isGradientBg ? getBaseColorFromGradient(backgroundColor) : effectiveBgColor
                }90 70%, ${
                  isGradientBg ? getBaseColorFromGradient(backgroundColor) : effectiveBgColor
                } 100%)`
              }}
            />
          </>
        )}
      </div>

      {/* Profile section - overlapping text for banner (transparent, text floats on banner) */}
      <div
        className={`px-6 ${hasBanner ? (profile.banner_fit === 'cover' ? '-mt-16' : 'mt-4') : ''} ${
          pfpPosition === "left" ? "flex items-start gap-4" : ""
        }`}
      >
        {/* Avatar - hidden when using full banner */}
        {!hasBanner && (
          <div
            className={`relative ${
              pfpPosition === "left"
                ? "-mt-10"
                : pfpPosition === "right"
                ? "-mt-12 ml-auto mr-4"
                : "-mt-12 mx-auto"
            } ${pfpPosition === "center" ? "w-24" : "w-20"}`}
          >
            {profile.profile_photo_url ? (
              <OptimizedImage
                src={profile.profile_photo_url}
                alt={profile.full_name}
                className={`${
                  pfpPosition === "center" ? "h-24 w-24" : "h-20 w-20"
                } rounded-full border-4 border-white object-cover shadow-lg`}
                width={96}
              />
            ) : (
              <div
                className={`${
                  pfpPosition === "center" ? "h-24 w-24" : "h-20 w-20"
                } rounded-full border-4 border-white shadow-lg flex items-center justify-center text-2xl font-bold text-white`}
                style={{ backgroundColor: headerColor }}
              >
                {profile.full_name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        )}

        {/* Name and headline */}
        <div
          className={`${
            pfpPosition === "left" ? "flex-1 pt-2" : "mt-4"
          } ${pfpPosition === "center" ? "text-center" : ""}`}
        >
          <h1 className={`${hasBanner ? 'text-3xl' : 'text-xl'} font-bold ${headingClass}`}>
            {hasBanner
              ? (profile.show_username !== false ? `@${profile.username}` : profile.full_name)
              : profile.full_name}
          </h1>
          {profile.headline && (
            <p className={`mt-1 text-sm ${textClass}`}>{profile.headline}</p>
          )}
          {/* Social icon bar */}
          {renderIconBar()}
        </div>
      </div>

      {/* Bio */}
      {profile.bio && (
        <div className="mt-4 px-6">
          <p
            className={`text-sm whitespace-pre-wrap ${textClass} ${
              pfpPosition === "center" ? "text-center" : ""
            }`}
          >
            {profile.bio}
          </p>
        </div>
      )}

      {/* Inline contact button */}
      {profile.contact_enabled && profile.contact_display_style === 'button' && (
        <div className="mt-4 px-6">
          <button
            className="w-full flex items-center justify-center gap-2 py-3 rounded-full font-semibold shadow-lg text-sm"
            style={{
              backgroundColor: (() => {
                const btn = profile.button_theme;
                const isHex = btn && /^#[0-9A-Fa-f]{3,6}$/.test(btn);
                if (isHex) return btn;
                return isDarkBg ? '#FFFFFF' : '#1A1A1A';
              })(),
              color: (() => {
                const btn = profile.button_theme;
                const isHex = btn && /^#[0-9A-Fa-f]{3,6}$/.test(btn);
                const bg = isHex ? btn! : (isDarkBg ? '#FFFFFF' : '#1A1A1A');
                return isColorDark(bg) ? '#FFFFFF' : '#1A1A1A';
              })(),
            }}
          >
            <UserPlus className="h-4 w-4" />
            {profile.contact_button_label || 'Save Contact'}
          </button>
        </div>
      )}

      {/* Content - solid background for banner mode */}
      <div 
        className={`mt-6 space-y-3 px-6 pb-8 ${hasBanner ? 'rounded-2xl pt-4 pb-6 -mx-0' : ''}`}
        style={hasBanner ? { backgroundColor: extractedBannerColor || '#1a1a1a' } : undefined}
      >
        {/* Featured link */}
        {featuredLink && renderLink(featuredLink, true, false, 0)}

        {/* Unified content - interleaved links, grid groups, and blocks */}
        {(() => {
          let linkIndex = featuredLink ? 1 : 0;
          return groupedItems.map((item, idx) => {
          if (item.kind === "grid-group") {
            const startIndex = linkIndex;
            linkIndex += item.links.length;
            return (
              <div key={`grid-group-${idx}`} className="grid grid-cols-2 gap-2">
                {item.links.map((link, i) => (
                  <div key={`grid-wrap-${link.id}`} className={item.links.length === 1 ? 'col-span-2' : ''}>
                    {renderLink(link, false, true, startIndex + i)}
                  </div>
                ))}
              </div>
            );
          } else if (item.kind === "link") {
            const currentIndex = linkIndex++;
            return renderLink(item.data, false, false, currentIndex);
          } else {
            return renderBlock(item.data);
          }
        });
        })()}
      </div>
      
    </div>
  );
}

export const ProfilePreviewRenderer = memo(ProfilePreviewRendererComponent);
