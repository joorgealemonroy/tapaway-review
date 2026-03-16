export interface VibeTemplate {
  id: string;
  name: string;
  subtitle: string;
  glowColor: string;
  mockupTheme: {
    bg: string;
    text: string;
    accent: string;
    cardBg: string;
    border: string;
  };
  defaultLinks: Array<{
    type: string;
    label: string;
    placeholder: string;
    displayStyle?: string;
    pillColor?: string;
    gridSize?: string;
    isFeatured?: boolean;
    sortOrder?: number;
    iconHint?: string;
  }>;
  defaultBlocks: Array<{
    type: "youtube" | "image" | "text" | "button";
    content: Record<string, string>;
    sortOrder?: number;
  }>;
  headerType: "color" | "image" | "banner";
  style: {
    bgColor: string;
    headerColor: string;
    bgStyle: string;
  };
}

export const VIBE_TEMPLATES: VibeTemplate[] = [
  {
    id: "obsidian",
    name: "Obsidian",
    subtitle: "Premium",
    glowColor: "#c9a96e",
    mockupTheme: {
      bg: "#1a1a1a",
      text: "#f0e6d3",
      accent: "#c9a96e",
      cardBg: "#2a2a2a",
      border: "#3a3a3a",
    },
    defaultLinks: [
      { type: "instagram", label: "Instagram", placeholder: "@yourhandle", sortOrder: 0, displayStyle: "grid", gridSize: "half" },
      { type: "tiktok", label: "TikTok", placeholder: "@yourhandle", sortOrder: 1, displayStyle: "grid", gridSize: "half" },
      { type: "x", label: "X / Twitter", placeholder: "@yourhandle", sortOrder: 2 },
      { type: "website", label: "Website", placeholder: "https://yoursite.com", sortOrder: 3 },
    ],
    defaultBlocks: [],
    headerType: "color",
    style: { bgColor: "#1a1a1a", headerColor: "#2a2a2a", bgStyle: "linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 100%)" },
  },
  {
    id: "bloom",
    name: "Bloom",
    subtitle: "Soft & Feminine",
    glowColor: "#FF8FAB",
    mockupTheme: {
      bg: "#FFF9F8",
      text: "#5C3D4E",
      accent: "#FF8FAB",
      cardBg: "#FDE2E4",
      border: "#F5C6CB",
    },
    defaultLinks: [
      { type: "instagram", label: "Instagram", placeholder: "@yourhandle", sortOrder: 0, displayStyle: "grid", gridSize: "half" },
      { type: "tiktok", label: "TikTok", placeholder: "@yourhandle", sortOrder: 1, displayStyle: "grid", gridSize: "half" },
      { type: "website", label: "Website", placeholder: "https://yoursite.com", sortOrder: 2 },
      { type: "email", label: "Email", placeholder: "you@email.com", sortOrder: 3 },
    ],
    defaultBlocks: [
      {
        type: "text",
        content: { title: "About Me", body: "Share your story and what inspires you." },
        sortOrder: 0,
      },
    ],
    headerType: "color",
    style: { bgColor: "#FFF9F8", headerColor: "#FDE2E4", bgStyle: "linear-gradient(180deg, #FDE2E4 0%, #FFF9F8 30%)" },
  },
  {
    id: "organic",
    name: "Organic",
    subtitle: "Botanical",
    glowColor: "#4a8c5c",
    mockupTheme: {
      bg: "#f5f0e8",
      text: "#2d5a3d",
      accent: "#8fbc8f",
      cardBg: "#ede7db",
      border: "#d4cbbf",
    },
    defaultLinks: [
      { type: "instagram", label: "Instagram", placeholder: "@yourhandle", sortOrder: 0, displayStyle: "grid", gridSize: "half" },
      { type: "tiktok", label: "TikTok", placeholder: "@yourhandle", sortOrder: 1, displayStyle: "grid", gridSize: "half" },
      { type: "website", label: "Portfolio", placeholder: "https://yoursite.com", sortOrder: 2 },
      { type: "youtube", label: "YouTube", placeholder: "@yourchannel", sortOrder: 3 },
    ],
    defaultBlocks: [
      {
        type: "text",
        content: { title: "About Me", body: "Share your story and what inspires you." },
        sortOrder: 0,
      },
    ],
    headerType: "color",
    style: { bgColor: "#f5f0e8", headerColor: "#2d5a3d", bgStyle: "linear-gradient(180deg, #4a8c5c 0%, #f5f0e8 30%)" },
  },
  {
    id: "vogue",
    name: "Vogue",
    subtitle: "Classic & Elegant",
    glowColor: "#c4a882",
    mockupTheme: {
      bg: "#f5f0eb",
      text: "#2c2420",
      accent: "#8c7355",
      cardBg: "#ebe5dd",
      border: "#d9d0c4",
    },
    defaultLinks: [
      { type: "website", label: "Read My Blog", placeholder: "https://yourblog.com", sortOrder: 0 },
      { type: "instagram", label: "Instagram", placeholder: "@yourhandle", sortOrder: 1 },
      { type: "email", label: "Newsletter", placeholder: "you@email.com", sortOrder: 2 },
    ],
    defaultBlocks: [
      {
        type: "image",
        content: { alt: "Featured Image" },
        sortOrder: 0,
      },
      {
        type: "text",
        content: { title: "Latest", body: "A peek into what I've been working on." },
        sortOrder: 1,
      },
    ],
    headerType: "color",
    style: { bgColor: "#f5f0eb", headerColor: "#3d342c", bgStyle: "linear-gradient(180deg, #3d342c 0%, #f5f0eb 30%)" },
  },
  {
    id: "neon",
    name: "Neon",
    subtitle: "Midnight Glow",
    glowColor: "#00F2FF",
    mockupTheme: {
      bg: "#050505",
      text: "#e0e0e0",
      accent: "#00F2FF",
      cardBg: "#0f0f15",
      border: "#1a1a2e",
    },
    defaultLinks: [
      { type: "instagram", label: "Instagram", placeholder: "@yourhandle", sortOrder: 0, displayStyle: "grid", gridSize: "half" },
      { type: "tiktok", label: "TikTok", placeholder: "@yourhandle", sortOrder: 1, displayStyle: "grid", gridSize: "half" },
      { type: "website", label: "Website", placeholder: "https://yoursite.com", sortOrder: 2 },
      { type: "discord", label: "Discord", placeholder: "discord.gg/invite", sortOrder: 3 },
    ],
    defaultBlocks: [],
    headerType: "color",
    style: { bgColor: "#050505", headerColor: "#0a0a1a", bgStyle: "linear-gradient(180deg, #0a0a1a 0%, #050505 100%)" },
  },
  {
    id: "elevate",
    name: "Elevate",
    subtitle: "Professional",
    glowColor: "#3b6ba5",
    mockupTheme: {
      bg: "#ffffff",
      text: "#1e293b",
      accent: "#1e3a5f",
      cardBg: "#f1f5f9",
      border: "#e2e8f0",
    },
    defaultLinks: [
      { type: "calendly", label: "Book a Call", placeholder: "https://calendly.com/you", sortOrder: 0, iconHint: "calendar" },
      { type: "linkedin", label: "LinkedIn", placeholder: "linkedin.com/in/you", sortOrder: 1 },
      { type: "website", label: "Company Site", placeholder: "https://yourcompany.com", sortOrder: 2 },
      { type: "email", label: "Email", placeholder: "you@company.com", sortOrder: 3 },
    ],
    defaultBlocks: [],
    headerType: "color",
    style: { bgColor: "#ffffff", headerColor: "#1e3a5f", bgStyle: "linear-gradient(180deg, #1e3a5f 0%, #ffffff 30%)" },
  },
  {
    id: "pure",
    name: "Pure",
    subtitle: "Minimalist",
    glowColor: "#888888",
    mockupTheme: {
      bg: "#ffffff",
      text: "#111111",
      accent: "#888888",
      cardBg: "#f5f5f5",
      border: "#e5e5e5",
    },
    defaultLinks: [
      { type: "website", label: "Website", placeholder: "https://yoursite.com", sortOrder: 0 },
      { type: "instagram", label: "Instagram", placeholder: "@yourhandle", sortOrder: 1 },
      { type: "email", label: "Email", placeholder: "you@email.com", sortOrder: 2 },
    ],
    defaultBlocks: [],
    headerType: "color",
    style: { bgColor: "#ffffff", headerColor: "#333333" },
  },
];

export function getVibeTemplate(id: string): VibeTemplate | undefined {
  return VIBE_TEMPLATES.find((t) => t.id === id);
}
