export interface VibeTemplate {
  id: string;
  name: string;
  subtitle: string;
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
  };
}

export const VIBE_TEMPLATES: VibeTemplate[] = [
  {
    id: "artemis",
    name: "Artemis",
    subtitle: "Minimalist",
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
  {
    id: "balcombe",
    name: "Balcombe",
    subtitle: "Botanical",
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
    style: { bgColor: "#f5f0e8", headerColor: "#2d5a3d" },
  },
  {
    id: "boultont",
    name: "Boultont",
    subtitle: "Premium",
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
    style: { bgColor: "#1a1a1a", headerColor: "#2a2a2a" },
  },
];

export function getVibeTemplate(id: string): VibeTemplate | undefined {
  return VIBE_TEMPLATES.find((t) => t.id === id);
}
