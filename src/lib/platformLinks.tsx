import { 
  Instagram, 
  Youtube, 
  Globe, 
  Mail, 
  DollarSign, 
  Music,
  LucideIcon
} from "lucide-react";

// X icon
export const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

// TikTok icon
export const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

// Venmo icon
export const VenmoIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M19.23 2.476c.685 1.14 1.008 2.316 1.008 3.815 0 4.754-4.062 10.937-7.359 15.284H5.456L2.77 3.617l6.324-.604 1.476 11.837c1.37-2.238 3.06-5.762 3.06-8.172 0-1.423-.244-2.393-.648-3.177l6.249-1.025z"/>
  </svg>
);

// CashApp icon
export const CashAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M23.59 3.47A5.47 5.47 0 0020.12.01L12.75 0l-.52 2.77a3.68 3.68 0 00.29 2.55A3.53 3.53 0 0015.77 7a7.38 7.38 0 01-1.3 3.78 6.81 6.81 0 01-3.47 2.54 9.07 9.07 0 01-4.13.43 9.68 9.68 0 01-3.72-1.1 6.34 6.34 0 01-1.08-.78L0 13.57a9.85 9.85 0 004.22 2.7 13.2 13.2 0 006 .68 10.33 10.33 0 005.37-2.1 9.66 9.66 0 003.53-5.3 11.55 11.55 0 00.38-4.85A5.44 5.44 0 0023.59 3.47z"/>
  </svg>
);

// Spotify icon
export const SpotifyIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
  </svg>
);

export interface PlatformConfig {
  type: string;
  label: string;
  icon: LucideIcon | React.FC<{ className?: string }>;
  inputType: "handle" | "email" | "url" | "options" | "cashtag";
  placeholder: string;
  prefix?: string;
  generateUrl: (value: string) => string;
  extractValue: (url: string) => string;
  color: string;
  bgColor: string;
  gradient?: string;
  // For button text color when using custom pill colors
  textOnCustom?: string;
}

// Platform color presets for custom link styling
export const PLATFORM_COLORS = {
  instagram: "#E4405F",
  instagramGradient: "linear-gradient(135deg, #833AB4, #E4405F, #FCAF45)",
  tiktok: "#000000",
  youtube: "#FF0000",
  x: "#000000",
  venmo: "#008CFF",
  cashapp: "#00D632",
  spotify: "#1DB954",
  applemusic: "#FC3C44",
  website: "#475569",
  email: "#64748b",
} as const;

export const PLATFORM_CONFIGS: PlatformConfig[] = [
  {
    type: "instagram",
    label: "Instagram",
    icon: Instagram,
    inputType: "handle",
    placeholder: "yourname",
    prefix: "@",
    generateUrl: (v) => `https://instagram.com/${v.replace(/^@/, "")}`,
    extractValue: (url) => url.replace(/^https?:\/\/(www\.)?instagram\.com\/@?/, "").split("/")[0] || "",
    color: "text-white",
    bgColor: "bg-[#E4405F]",
    gradient: "bg-gradient-to-br from-[#833AB4] via-[#E4405F] to-[#FCAF45]",
  },
  {
    type: "tiktok",
    label: "TikTok",
    icon: TikTokIcon,
    inputType: "handle",
    placeholder: "yourname",
    prefix: "@",
    generateUrl: (v) => `https://tiktok.com/@${v.replace(/^@/, "")}`,
    extractValue: (url) => url.replace(/^https?:\/\/(www\.)?tiktok\.com\/@?/, "").split("/")[0] || "",
    color: "text-white",
    bgColor: "bg-black",
  },
  {
    type: "youtube",
    label: "YouTube",
    icon: Youtube,
    inputType: "options",
    placeholder: "handle or channel ID",
    generateUrl: (v) => v.startsWith("UC") ? `https://youtube.com/channel/${v}` : `https://youtube.com/@${v.replace(/^@/, "")}`,
    extractValue: (url) => {
      if (url.includes("/channel/")) return url.split("/channel/")[1]?.split("/")[0] || "";
      return url.replace(/^https?:\/\/(www\.)?youtube\.com\/@?/, "").split("/")[0] || "";
    },
    color: "text-white",
    bgColor: "bg-[#FF0000]",
  },
  {
    type: "x",
    label: "X",
    icon: XIcon,
    inputType: "handle",
    placeholder: "yourname",
    prefix: "@",
    generateUrl: (v) => `https://x.com/${v.replace(/^@/, "")}`,
    extractValue: (url) => url.replace(/^https?:\/\/(www\.)?(x|twitter)\.com\/@?/, "").split("/")[0] || "",
    color: "text-white",
    bgColor: "bg-black",
  },
  {
    type: "website",
    label: "Website",
    icon: Globe,
    inputType: "url",
    placeholder: "https://yourwebsite.com",
    generateUrl: (v) => v.startsWith("http") ? v : `https://${v}`,
    extractValue: (url) => url,
    color: "text-white",
    bgColor: "bg-slate-700",
  },
  {
    type: "email",
    label: "Email",
    icon: Mail,
    inputType: "email",
    placeholder: "your@email.com",
    generateUrl: (v) => `mailto:${v.replace(/^mailto:/, "")}`,
    extractValue: (url) => url.replace(/^mailto:/, ""),
    color: "text-white",
    bgColor: "bg-slate-500",
  },
  {
    type: "venmo",
    label: "Venmo",
    icon: VenmoIcon,
    inputType: "handle",
    placeholder: "yourname",
    prefix: "@",
    generateUrl: (v) => `https://venmo.com/${v.replace(/^@/, "")}`,
    extractValue: (url) => url.replace(/^https?:\/\/(www\.)?venmo\.com\/@?/, "").split("/")[0] || "",
    color: "text-white",
    bgColor: "bg-[#008CFF]",
  },
  {
    type: "cashapp",
    label: "Cash App",
    icon: CashAppIcon,
    inputType: "cashtag",
    placeholder: "cashtag",
    prefix: "$",
    generateUrl: (v) => `https://cash.app/$${v.replace(/^\$/, "")}`,
    extractValue: (url) => url.replace(/^https?:\/\/(www\.)?cash\.app\/\$?/, "").split("/")[0] || "",
    color: "text-white",
    bgColor: "bg-[#00D632]",
  },
  {
    type: "spotify",
    label: "Spotify",
    icon: SpotifyIcon,
    inputType: "url",
    placeholder: "spotify.com/artist/...",
    generateUrl: (v) => v.startsWith("http") ? v : `https://open.spotify.com/${v}`,
    extractValue: (url) => url,
    color: "text-white",
    bgColor: "bg-[#1DB954]",
  },
  {
    type: "applemusic",
    label: "Apple Music",
    icon: Music,
    inputType: "url",
    placeholder: "music.apple.com/...",
    generateUrl: (v) => v.startsWith("http") ? v : `https://music.apple.com/${v}`,
    extractValue: (url) => url,
    color: "text-white",
    bgColor: "bg-gradient-to-br from-[#FC3C44] to-[#A445B2]",
  },
];

export const getPlatformConfig = (type: string): PlatformConfig | undefined => {
  return PLATFORM_CONFIGS.find(p => p.type === type);
};

export const getPlatformIcon = (type: string) => {
  return getPlatformConfig(type)?.icon || Globe;
};
