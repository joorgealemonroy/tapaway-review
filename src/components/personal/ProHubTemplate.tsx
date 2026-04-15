import { memo } from "react";
import { ExternalLink } from "lucide-react";
import { getPlatformConfig } from "@/lib/platformLinks";

interface ProLink {
  id: string;
  link_type: string;
  label: string;
  url: string;
  pill_color?: string | null;
  display_style?: string | null;
  grid_size?: string | null;
  thumbnail_bg_url?: string | null;
  cover_image_url?: string | null;
  is_active?: boolean | null;
}

interface ProHubTemplateProps {
  displayName: string;
  profilePhotoUrl?: string | null;
  backgroundColor?: string | null;
  secondaryColor?: string | null;
  links: ProLink[];
  onLinkClick?: (url: string) => void;
}

// Social platform icon mapping
const SocialIcon = ({ type }: { type: string }) => {
  const config = getPlatformConfig(type);
  if (!config) return null;
  
  const colorMap: Record<string, string> = {
    instagram: '#E1306C',
    tiktok: '#00F2EA',
    youtube: '#FF0000',
    twitter: '#1DA1F2',
    facebook: '#1877F2',
  };
  
  return (
    <div
      className="w-8 h-8 rounded-lg flex items-center justify-center"
      style={{ backgroundColor: colorMap[type] || 'rgba(255,255,255,0.2)' }}
    >
      {config.icon ? (
        <config.icon className="w-4 h-4 text-white" />
      ) : (
        <span className="text-white text-xs font-bold">{type[0]?.toUpperCase()}</span>
      )}
    </div>
  );
};

export const ProHubTemplate = memo(({
  displayName,
  profilePhotoUrl,
  backgroundColor,
  secondaryColor,
  links,
  onLinkClick,
}: ProHubTemplateProps) => {
  const bgColor = backgroundColor || '#0F172A';
  const secColor = secondaryColor || '#1E293B';
  
  const activeLinks = links.filter(l => l.is_active !== false);
  
  // Separate social tiles from standard links
  const socialTiles = activeLinks.filter(l => l.thumbnail_bg_url && l.grid_size === 'half');
  const standardLinks = activeLinks.filter(l => !l.thumbnail_bg_url || l.grid_size !== 'half');

  const handleClick = (url: string) => {
    if (onLinkClick) {
      onLinkClick(url);
    } else {
      window.open(url, '_blank', 'noopener');
    }
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center px-4 py-8"
      style={{ backgroundColor: bgColor }}
    >
      {/* ── A. Logo Framing ── */}
      {profilePhotoUrl && (
        <div className="mb-8 mt-4">
          <div className="backdrop-blur-md bg-white/10 rounded-2xl p-5 max-w-[200px]">
            <img
              src={profilePhotoUrl}
              alt={displayName}
              className="w-full h-auto max-h-28 object-contain rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Display name */}
      <h1 className="text-2xl font-bold text-white text-center mb-6">{displayName}</h1>

      {/* ── B. Social Media Image Tiles ── */}
      {socialTiles.length >= 2 && (
        <div className="grid grid-cols-2 gap-3 w-full max-w-sm mb-4">
          {socialTiles.slice(0, 2).map((link) => (
            <button
              key={link.id}
              onClick={() => handleClick(link.url)}
              className="aspect-square rounded-2xl relative overflow-hidden group"
            >
              {/* Background image */}
              {link.thumbnail_bg_url && (
                <img
                  src={link.thumbnail_bg_url}
                  alt={link.label}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              {/* Social icon — top left */}
              <div className="absolute top-3 left-3 z-10">
                <SocialIcon type={link.link_type} />
              </div>

              {/* Label — bottom center */}
              <div className="absolute bottom-3 left-0 right-0 z-10 text-center">
                <span className="text-white text-xs font-bold uppercase tracking-wider">
                  {link.label}
                </span>
              </div>

              {/* Hover effect */}
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      )}

      {/* Any remaining social tiles as single row */}
      {socialTiles.length === 1 && (
        <div className="w-full max-w-sm mb-4">
          <button
            onClick={() => handleClick(socialTiles[0].url)}
            className="w-full aspect-video rounded-2xl relative overflow-hidden group"
          >
            {socialTiles[0].thumbnail_bg_url && (
              <img
                src={socialTiles[0].thumbnail_bg_url}
                alt={socialTiles[0].label}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute top-3 left-3 z-10">
              <SocialIcon type={socialTiles[0].link_type} />
            </div>
            <div className="absolute bottom-3 left-0 right-0 z-10 text-center">
              <span className="text-white text-xs font-bold uppercase tracking-wider">
                {socialTiles[0].label}
              </span>
            </div>
          </button>
        </div>
      )}

      {/* ── C. Standard Links ── */}
      <div className="w-full max-w-sm space-y-3">
        {standardLinks.map((link) => {
          const isGoogleReview = link.link_type === 'google_review';
          const config = getPlatformConfig(link.link_type);

          return (
            <button
              key={link.id}
              onClick={() => handleClick(link.url)}
              className={`w-full rounded-xl px-5 py-4 flex items-center justify-between transition-all group ${
                isGoogleReview
                  ? 'bg-white text-gray-900 hover:bg-gray-100'
                  : 'hover:opacity-90'
              }`}
              style={
                isGoogleReview
                  ? undefined
                  : {
                      backgroundColor: link.pill_color || secColor,
                      color: '#FFFFFF',
                    }
              }
            >
              <div className="flex items-center gap-3">
                {config?.icon && (
                  <config.icon className={`w-5 h-5 shrink-0 ${isGoogleReview ? 'text-gray-700' : 'text-white/80'}`} />
                )}
                <span className="font-semibold text-sm">{link.label}</span>
              </div>
              <ExternalLink className={`w-4 h-4 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity ${
                isGoogleReview ? 'text-gray-500' : 'text-white/60'
              }`} />
            </button>
          );
        })}
      </div>

      {/* TapAway branding */}
      <p className="mt-auto pt-8 text-white/20 text-xs font-medium">
        Powered by TapAway
      </p>
    </div>
  );
});

ProHubTemplate.displayName = 'ProHubTemplate';
