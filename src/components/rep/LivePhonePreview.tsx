import { Phone, Star, Instagram, MapPin, Globe, ExternalLink } from 'lucide-react';
import { getHubTheme, contrastOn, safeColor, DEFAULT_PRIMARY, DEFAULT_SECONDARY, type BackgroundThemeStyle } from '@/lib/hubThemes';

interface Props {
  businessName: string;
  logoUrl: string | null;
  gallery: string[];
  themeStyle: BackgroundThemeStyle;
  primaryColor: string;
  secondaryColor: string;
  hasGoogle: boolean;
  hasYelp: boolean;
  hasInstagram: boolean;
  hasWebsite: boolean;
  businessPhone: string;
}

export const LivePhonePreview = ({
  businessName,
  logoUrl,
  gallery,
  themeStyle,
  primaryColor,
  secondaryColor,
  hasGoogle,
  hasYelp,
  hasInstagram,
  hasWebsite,
  businessPhone,
}: Props) => {
  const theme = getHubTheme(themeStyle);
  const primary = safeColor(primaryColor, DEFAULT_PRIMARY);
  const secondary = safeColor(secondaryColor, DEFAULT_SECONDARY);
  const primaryText = contrastOn(primary);
  const secondaryText = contrastOn(secondary);
  const heading = theme.isDark ? '#ffffff' : '#0a0e1a';
  const subtle = theme.isDark ? 'rgba(255,255,255,0.55)' : 'rgba(10,14,26,0.55)';

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
  });

  return (
    <div className="sticky top-4">
      <div
        className="border-[12px] border-zinc-800 rounded-[3rem] h-[750px] shadow-2xl bg-[#0a0e1a] overflow-hidden mx-auto"
        style={{ width: 360 }}
      >
        <div
          className="w-full h-full overflow-y-auto"
          style={theme.containerStyle}
        >
          <div className="px-5 pt-8 pb-6 flex flex-col items-center text-center">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="w-20 h-20 rounded-2xl object-cover mb-3 border border-white/10" />
            ) : (
              <div className="w-20 h-20 rounded-2xl mb-3 border border-white/10 flex items-center justify-center text-2xl font-bold" style={{ color: heading, background: 'rgba(255,255,255,0.06)' }}>
                {(businessName || '?').charAt(0).toUpperCase()}
              </div>
            )}
            <h1 className="text-xl font-bold" style={{ color: heading }}>
              {businessName || 'Your Business'}
            </h1>
            <p className="text-xs mt-1" style={{ color: subtle }}>
              Tap. Review. Repeat.
            </p>
          </div>

          {gallery.length > 0 && (
            <div className="px-4 pb-4 flex gap-2 overflow-x-auto">
              {gallery.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt=""
                  className="h-24 w-24 rounded-xl object-cover flex-shrink-0 border border-white/10"
                />
              ))}
            </div>
          )}

          <div className="px-5 pb-8 space-y-2.5">
            {hasGoogle && (
              <button type="button" style={btn(primary, primaryText)}>
                <Star className="h-4 w-4" fill={primaryText} /> Leave Us A 5 Star Review!
              </button>
            )}
            {hasYelp && (
              <button type="button" style={btn('#d32323', '#ffffff')}>
                <ExternalLink className="h-4 w-4" /> Check us out on Yelp!
              </button>
            )}
            {hasInstagram && (
              <button
                type="button"
                style={{
                  ...btn('#000', '#fff'),
                  background: 'linear-gradient(45deg,#f58529,#dd2a7b,#8134af,#515bd4)',
                }}
              >
                <Instagram className="h-4 w-4" /> Follow on Instagram
              </button>
            )}
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
                  border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(10,14,26,0.15)'}`,
                }}
              >
                <Globe className="h-4 w-4" /> Visit Website
              </button>
            )}
            {!hasGoogle && !hasYelp && !hasInstagram && !businessPhone && !hasWebsite && (
              <div className="text-center text-xs py-4" style={{ color: subtle }}>
                <MapPin className="inline h-4 w-4 mr-1 opacity-50" />
                Fill in the form to see live buttons.
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
