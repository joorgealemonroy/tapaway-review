import { memo, useMemo } from "react";
import { ExternalLink } from "lucide-react";
import { getOptimizedImageUrl, OptimizedImage } from "./OptimizedImage";
import { getPlatformConfig } from "@/lib/platformLinks";

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
  const backgroundColor = profile.background_color || "#ffffff";
  const isDarkBg = useMemo(() => isColorDark(backgroundColor), [backgroundColor]);
  
  // Dynamic text classes
  const headingClass = isDarkBg ? "text-white" : "text-gray-900";
  const textClass = isDarkBg ? "text-white/80" : "text-gray-600";
  const mutedClass = isDarkBg ? "text-white/60" : "text-gray-500";
  const pfpPosition = profile.pfp_position || "center";

  const activeLinks = useMemo(
    () => links.filter((l) => l.is_active !== false),
    [links]
  );

  const featuredLink = useMemo(
    () => activeLinks.find((l) => l.is_featured),
    [activeLinks]
  );

  const regularLinks = useMemo(
    () =>
      activeLinks
        .filter((l) => !l.is_featured)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [activeLinks]
  );

  const activeBlocks = useMemo(
    () =>
      blocks
        .filter((b) => b.is_active !== false)
        .sort((a, b) => a.sort_order - b.sort_order),
    [blocks]
  );

  const unifiedItems = useMemo(() => {
    const items: Array<{ type: "link" | "block"; data: LinkData | BlockData }> =
      [];
    regularLinks.forEach((link) => items.push({ type: "link", data: link }));
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
  }, [regularLinks, activeBlocks]);

  const handleLinkClick = (e: React.MouseEvent, url: string) => {
    if (isPreview) {
      e.preventDefault();
      onLinkClick?.(url);
    }
  };

  const renderLink = (link: LinkData, isFeatured = false) => {
    const platform = getPlatformConfig(link.link_type);
    const Icon = platform?.icon;

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
        {Icon && (
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
          <div key={block.id} className="w-full overflow-x-auto scrollbar-hide -mx-6 px-6">
            <div className="flex gap-1.5" style={{ width: 'max-content' }}>
              {images.map((imgUrl, idx) => (
                <div key={idx} className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden">
                  <img 
                    src={getOptimizedImageUrl(imgUrl, 150)} 
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
  };

  return (
    <div
      className="min-h-full w-full"
      style={{ backgroundColor }}
    >
      {/* Header */}
      <div className="relative h-32 w-full overflow-hidden">
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

      {/* Profile section */}
      <div
        className={`px-6 ${
          pfpPosition === "left" ? "flex items-start gap-4" : ""
        }`}
      >
        {/* Avatar */}
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

        {/* Unified items (links + blocks) */}
        {unifiedItems.map((item) =>
          item.type === "link"
            ? renderLink(item.data as LinkData)
            : renderBlock(item.data as BlockData)
        )}
      </div>
    </div>
  );
}

export const ProfilePreviewRenderer = memo(ProfilePreviewRendererComponent);
