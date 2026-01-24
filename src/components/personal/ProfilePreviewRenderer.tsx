import { memo, useMemo, useState, useEffect } from "react";
import { ExternalLink } from "lucide-react";
import { getOptimizedImageUrl, OptimizedImage } from "./OptimizedImage";
import { getPlatformConfig, PLATFORM_COLORS } from "@/lib/platformLinks";
import { ImageLightbox } from "./ImageLightbox";
import { extractBottomColor } from "@/lib/imageColorExtraction";

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
  plan_type?: string | null;
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
  
  // Banner for premium users (header_type === "banner")
  const bannerUrl = (headerType === "banner" && profile.banner_image_url) 
    ? getOptimizedImageUrl(profile.banner_image_url, 400, 80) 
    : null;
  const hasBanner = !!bannerUrl;
  
  // Extract color from banner image for natural fade
  const [extractedBannerColor, setExtractedBannerColor] = useState<string | null>(null);
  
  useEffect(() => {
    if (hasBanner && profile.banner_image_url) {
      extractBottomColor(profile.banner_image_url).then(setExtractedBannerColor);
    } else {
      setExtractedBannerColor(null);
    }
  }, [hasBanner, profile.banner_image_url]);
  
  const isDarkBg = useMemo(() => hasBanner || isGradientBg || isColorDark(backgroundColor), [backgroundColor, isGradientBg, hasBanner]);
  
  // Dynamic text classes
  const headingClass = isDarkBg ? "text-white" : "text-gray-900";
  const textClass = isDarkBg ? "text-white/80" : "text-gray-600";
  const mutedClass = isDarkBg ? "text-white/60" : "text-gray-500";
  const pfpPosition = profile.pfp_position || "center";

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

  // Collage preview with lightbox
  const CollagePreview = ({ images, isPreview, onLinkClick }: { images: string[]; isPreview: boolean; onLinkClick?: (url: string) => void }) => {
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    const handleImageClick = (index: number) => {
      if (isPreview) {
        onLinkClick?.("#collage");
        return;
      }
      setLightboxIndex(index);
      setLightboxOpen(true);
    };

    return (
      <>
        <div className="w-full overflow-x-auto scrollbar-hide -mx-6 px-6">
          <div className="flex gap-1.5" style={{ width: 'max-content' }}>
            {images.map((imgUrl, idx) => (
              <button
                key={idx}
                onClick={() => handleImageClick(idx)}
                className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
              >
                <img 
                  src={getOptimizedImageUrl(imgUrl, 150)} 
                  alt="" 
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
        <ImageLightbox
          images={images}
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
              href={link.url}
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

  const renderLink = (link: LinkData, isFeatured = false, isGrid = false) => {
    const platform = getPlatformConfig(link.link_type);
    const Icon = platform?.icon;

    // Grid card-style link with cover image (square, 2-column layout)
    if (link.cover_image_url && isGrid) {
      return (
        <a
          key={link.id}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => handleLinkClick(e, link.url)}
          className="block relative rounded-xl overflow-hidden aspect-square shadow-md group"
        >
          <img 
            src={link.cover_image_url} 
            alt={link.label}
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
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => handleLinkClick(e, link.url)}
          className="block relative rounded-2xl overflow-hidden aspect-[4/3] shadow-lg group"
        >
          <img 
            src={link.cover_image_url} 
            alt={link.label}
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
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => handleLinkClick(e, link.url)}
          className="block w-full rounded-xl px-5 py-4 text-center font-semibold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
          style={{ backgroundColor: link.pill_color || headerColor }}
        >
          <span className="flex items-center justify-center gap-2">
            {Icon && <Icon className="h-5 w-5" />}
            {link.label}
            <ExternalLink className="h-4 w-4 opacity-70" />
          </span>
        </a>
      );
    }

    return (
      <a
        key={link.id}
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => handleLinkClick(e, link.url)}
        className={`flex items-center gap-3 rounded-xl border px-4 py-3 shadow-sm backdrop-blur transition-all hover:shadow-md hover:scale-[1.01] ${isDarkBg ? 'bg-white/10 border-white/20' : 'bg-white/80'}`}
        style={!isDarkBg ? { borderColor: `${headerColor}30` } : undefined}
      >
        {link.thumbnail_url ? (
          <div className="h-10 w-10 rounded-lg overflow-hidden flex-shrink-0">
            <img src={link.thumbnail_url} alt="" className="w-full h-full object-cover" />
          </div>
        ) : Icon && (
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{ backgroundColor: isDarkBg ? 'rgba(255,255,255,0.1)' : `${headerColor}15` }}
          >
            <Icon className="h-5 w-5" style={{ color: isDarkBg ? 'white' : headerColor }} />
          </div>
        )}
        <span className={`flex-1 font-medium ${isDarkBg ? 'text-white' : 'text-gray-800'}`}>{link.label}</span>
        <ExternalLink className={`h-4 w-4 ${isDarkBg ? 'text-white/50' : 'text-gray-400'}`} />
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
                href={linkUrl}
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
        const description = (content.description as string) || "Leave your email and I'll reach out!";
        const buttonText = (content.buttonText as string) || "Submit";
        const showName = content.collectName === "true";
        const showMessage = content.collectMessage === "true";
        
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
            <div className={`h-9 rounded-lg border ${inputBg}`} />
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
      case "photo_collage": {
        // Handle both string (from DB) and array (from state) formats
        let images: string[] = [];
        try {
          images = content.images 
            ? (typeof content.images === 'string' ? JSON.parse(content.images) : content.images as string[])
            : [];
        } catch {
          images = [];
        }
        
        if (images.length === 0) return null;
        
        return (
          <CollagePreview key={block.id} images={images} isPreview={isPreview} onLinkClick={onLinkClick} />
        );
      }
      default:
        return null;
    }
  };

  return (
    <div
      className="min-h-full w-full"
      style={isGradientBg ? { background: backgroundColor } : { backgroundColor }}
    >
      {/* Header or Banner */}
      <div className="relative w-full">
        {hasBanner ? (
          <>
            {/* Banner mode - fully visible with fade at bottom using extracted color */}
            <div className="h-48 overflow-hidden relative">
              <img
                src={bannerUrl}
                alt="Banner"
                className="h-full w-full object-cover object-top"
              />
              {/* Gradient fade using extracted color from image */}
              <div 
                className="absolute inset-x-0 bottom-0 h-20 pointer-events-none"
                style={{
                  background: `linear-gradient(to bottom, transparent 0%, ${
                    extractedBannerColor || (isGradientBg ? getBaseColorFromGradient(backgroundColor) : backgroundColor)
                  } 100%)`
                }}
              />
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
                  isGradientBg ? getBaseColorFromGradient(backgroundColor) : backgroundColor
                }40 40%, ${
                  isGradientBg ? getBaseColorFromGradient(backgroundColor) : backgroundColor
                }90 70%, ${
                  isGradientBg ? getBaseColorFromGradient(backgroundColor) : backgroundColor
                } 100%)`
              }}
            />
          </>
        )}
      </div>

      {/* Profile section - overlapping text for banner */}
      <div
        className={`px-6 ${hasBanner ? '-mt-6' : ''} ${
          pfpPosition === "left" ? "flex items-start gap-4" : ""
        }`}
        style={hasBanner && extractedBannerColor ? { backgroundColor: extractedBannerColor } : undefined}
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
          <h1 className={`text-xl font-bold ${headingClass}`}>
            {profile.full_name}
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

      {/* Content */}
      <div className="mt-6 space-y-3 px-6 pb-8">
        {/* Featured link */}
        {featuredLink && renderLink(featuredLink, true)}

        {/* Unified content - interleaved links, grid groups, and blocks */}
        {groupedItems.map((item, idx) => {
          if (item.kind === "grid-group") {
            return (
              <div key={`grid-group-${idx}`} className="grid grid-cols-2 gap-2">
                {item.links.map((link) => renderLink(link, false, true))}
              </div>
            );
          } else if (item.kind === "link") {
            return renderLink(item.data);
          } else {
            return renderBlock(item.data);
          }
        })}
      </div>
    </div>
  );
}

export const ProfilePreviewRenderer = memo(ProfilePreviewRendererComponent);
