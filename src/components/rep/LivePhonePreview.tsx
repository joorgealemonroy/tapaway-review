import { Phone, Star, Instagram, Globe, ExternalLink, Facebook, Music2, UserPlus, Sparkles } from 'lucide-react';
import {
  getHubTheme,
  contrastOn,
  safeColor,
  DEFAULT_PRIMARY,
  DEFAULT_SECONDARY,
  type BackgroundThemeStyle,
} from '@/lib/hubThemes';
import { toSocialDeepLink } from '@/lib/deepLinks';

export type HeaderStyle = 'solid' | 'image' | 'full_banner';

export interface LinkBlock {
  id: string;
  title: string;
  url: string;
  kind: 'email' | 'website' | 'directions' | 'custom';
  active: boolean;
}

export interface Socials {
  instagram?: string;
  yelp?: string;
  facebook?: string;
  tiktok?: string;
}

interface Props {
  businessName: string;
  bio?: string;
  logoUrl: string | null;
  gallery: string[];
  themeStyle: BackgroundThemeStyle;
  primaryColor: string;
  secondaryColor: string;
  businessPhone: string;
  headerStyle?: HeaderStyle;
  bannerUrl?: string | null;
  socials?: Socials;
  blocks?: LinkBlock[];
  contactCardEnabled?: boolean;
  foundingBadge?: boolean;
  leadFormEnabled?: boolean;
  hasGoogle?: boolean;
  hasWebsite?: boolean;
}

export const LivePhonePreview = ({
  businessName,
  bio,
  logoUrl,
  gallery,
  themeStyle,
  primaryColor,
  secondaryColor,
  businessPhone,
  headerStyle = 'solid',
  bannerUrl,
  socials = {},
  blocks = [],
  contactCardEnabled = true,
  foundingBadge = false,
  leadFormEnabled = false,
  hasGoogle = false,
  hasWebsite = false,
}: Props) => {
  const theme = getHubTheme(themeStyle);
  const primary = safeColor(primaryColor, DEFAULT_PRIMARY);
  const secondary = safeColor(secondaryColor, DEFAULT_SECONDARY);
  const primaryText = contrastOn(primary);
  const secondaryText = contrastOn(secondary);
  const heading = theme.isDark ? '#ffffff' : '#0a0e1a';
  const subtle = theme.isDark ? 'rgba(255,255,255,0.55)' : 'rgba(10,14,26,0.55)';
  const cardBg = theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(10,14,26,0.04)';
  const border = theme.isDark ? 'rgba(255,255,255,0.10)' : 'rgba(10,14,26,0.10)';

  const btn = (bg: string, color: string): React.CSSProperties => ({
    backgroundColor: bg,
    color,
    width: '100%',
    padding: '12px 14px',
    borderRadius: 12,
    fontWeight: 700,
    fontSize: 13,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    border: 'none',
    transition: 'transform 0.2s ease',
  });

  const activeBlocks = blocks.filter(b => b.active && b.title.trim() && b.url.trim());

  const bannerHeight = headerStyle === 'full_banner' ? 160 : headerStyle === 'image' ? 110 : 80;
  const bannerBg =
    headerStyle === 'solid' || !bannerUrl
      ? secondary
      : undefined;

  const socialIcon = (
    icon: React.ReactNode,
    bg: string,
    color: string,
    key: string
  ) => (
    <div
      key={key}
      style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        background: bg,
        color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {icon}
    </div>
  );

  return (
    <div className="sticky top-4">
      <div
        className="border-[12px] border-zinc-800 rounded-[3rem] h-[750px] shadow-2xl bg-[#0a0e1a] overflow-hidden mx-auto"
        style={{ width: 360 }}
      >
        <div className="w-full h-full overflow-y-auto" style={theme.containerStyle}>
          {/* Banner */}
          <div
            style={{
              height: bannerHeight,
              backgroundColor: bannerBg,
              backgroundImage: bannerUrl && headerStyle !== 'solid' ? `url(${bannerUrl})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              position: 'relative',
            }}
          />

          {/* Content below banner */}
          <div className="flex flex-col items-center px-5 pt-4 text-center">
            <h1 className="text-xl font-bold" style={{ color: heading }}>

              {businessName || 'Your Business'}
            </h1>

            {bio && bio.trim() && (
              <p className="text-xs mt-1 leading-relaxed" style={{ color: subtle }}>
                {bio}
              </p>
            )}

            {foundingBadge && (
              <span
                className="inline-flex items-center gap-1 mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-semibold"
                style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.35)' }}
              >
                <Sparkles className="h-2.5 w-2.5" /> Founding Creator
              </span>
            )}
          </div>

          {/* Save contact pill */}
          {contactCardEnabled && (
            <div className="px-5 mt-3">
              <button
                type="button"
                className="w-full flex items-center justify-center gap-2 py-2 rounded-full text-xs font-semibold"
                style={{ background: cardBg, color: heading, border: `1px solid ${border}` }}
              >
                <UserPlus className="h-3.5 w-3.5" /> Save Contact
              </button>
            </div>
          )}

          {/* Social icons row */}
          {(socials.instagram || socials.facebook || socials.tiktok || socials.yelp) && (
            <div className="flex justify-center gap-2.5 mt-4 px-5">
              {socials.instagram &&
                socialIcon(
                  <Instagram className="h-4 w-4" />,
                  'linear-gradient(45deg,#f58529,#dd2a7b,#8134af,#515bd4)',
                  '#fff',
                  'ig'
                )}
              {socials.facebook &&
                socialIcon(<Facebook className="h-4 w-4" />, '#1877f2', '#fff', 'fb')}
              {socials.tiktok &&
                socialIcon(<Music2 className="h-4 w-4" />, '#000', '#fff', 'tt')}
              {socials.yelp &&
                socialIcon(<ExternalLink className="h-4 w-4" />, '#d32323', '#fff', 'yelp')}
            </div>
          )}

          {/* Gallery */}
          {gallery.length > 0 && (
            <div className="px-4 mt-4 flex gap-2 overflow-x-auto">
              {gallery.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt=""
                  className="h-24 w-24 rounded-xl object-cover flex-shrink-0"
                  style={{ border: `1px solid ${border}` }}
                />
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="px-5 pt-4 pb-6 space-y-2.5">
            {hasGoogle && (
              <button type="button" style={btn(primary, primaryText)}>
                <Star className="h-4 w-4" fill={primaryText} /> Leave Us A 5 Star Review!
              </button>
            )}

            {activeBlocks.map((b, idx) => (
              <button
                key={b.id}
                type="button"
                style={{
                  ...btn(cardBg, heading),
                  border: `1px solid ${border}`,
                  transitionDelay: `${idx * 30}ms`,
                }}
                className="hover:scale-[1.01]"
              >
                {b.kind === 'email' && <ExternalLink className="h-4 w-4" />}
                {b.kind === 'website' && <Globe className="h-4 w-4" />}
                {b.kind === 'directions' && <ExternalLink className="h-4 w-4" />}
                {b.kind === 'custom' && <ExternalLink className="h-4 w-4" />}
                {b.title}
              </button>
            ))}

            {businessPhone && (
              <button type="button" style={btn(secondary, secondaryText)}>
                <Phone className="h-4 w-4" /> Call Us Now
              </button>
            )}

            {hasWebsite && (
              <button
                type="button"
                style={{
                  ...btn('transparent', heading),
                  border: `1px solid ${border}`,
                }}
              >
                <Globe className="h-4 w-4" /> Visit Website
              </button>
            )}

            {leadFormEnabled && (
              <div
                className="mt-4 p-3 rounded-xl"
                style={{ background: cardBg, border: `1px solid ${border}` }}
              >
                <p className="text-[11px] font-semibold mb-2" style={{ color: heading }}>
                  Connect — Join our VIP Club for updates!
                </p>
                <div
                  className="w-full px-3 py-2 rounded-lg text-[11px]"
                  style={{ background: theme.isDark ? 'rgba(0,0,0,0.3)' : '#fff', color: subtle, border: `1px solid ${border}` }}
                >
                  Enter your email…
                </div>
              </div>
            )}

            {!hasGoogle && activeBlocks.length === 0 && !businessPhone && !hasWebsite && (
              <div className="text-center text-xs py-4" style={{ color: subtle }}>
                Fill in the Links tab to see live buttons.
              </div>
            )}
          </div>
        </div>
      </div>
      <p className="text-center text-[11px] text-white/30 mt-3 uppercase tracking-widest">
        Live preview · updates as you type
      </p>
    </div>
  );
};
