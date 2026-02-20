export interface LayoutTemplate {
  id: string;
  name: string;
  description: string;
  emoji: string;
  defaultLinks: Array<{
    type: string;
    label: string;
    placeholder: string;
  }>;
  defaultBlocks: Array<{
    type: "youtube" | "image" | "text" | "button";
    content: Record<string, string>;
  }>;
  headerType: "color" | "image" | "banner";
  style: {
    bgColor: string;
    headerColor: string;
  };
}

export const LAYOUT_TEMPLATES: LayoutTemplate[] = [
  {
    id: "social-star",
    name: "Social Star",
    description: "All your social links in one place — perfect for creators",
    emoji: "⭐",
    defaultLinks: [
      { type: "instagram", label: "Instagram", placeholder: "@yourhandle" },
      { type: "tiktok", label: "TikTok", placeholder: "@yourhandle" },
      { type: "youtube", label: "YouTube", placeholder: "@yourchannel" },
      { type: "x", label: "X / Twitter", placeholder: "@yourhandle" },
    ],
    defaultBlocks: [],
    headerType: "color",
    style: { bgColor: "#ffffff", headerColor: "#E1306C" },
  },
  {
    id: "business-pro",
    name: "Business Pro",
    description: "Contact card + professional links — great for networking",
    emoji: "💼",
    defaultLinks: [
      { type: "website", label: "Website", placeholder: "https://yoursite.com" },
      { type: "linkedin", label: "LinkedIn", placeholder: "yourprofile" },
      { type: "email", label: "Email", placeholder: "you@email.com" },
    ],
    defaultBlocks: [
      {
        type: "text",
        content: { title: "About Me", body: "Add a short bio about yourself or your business." },
      },
    ],
    headerType: "color",
    style: { bgColor: "#ffffff", headerColor: "#1A1A2E" },
  },
  {
    id: "creative",
    name: "Creative Portfolio",
    description: "Showcase your work with images + links",
    emoji: "🎨",
    defaultLinks: [
      { type: "instagram", label: "Instagram", placeholder: "@yourhandle" },
      { type: "website", label: "Portfolio", placeholder: "https://yoursite.com" },
    ],
    defaultBlocks: [
      {
        type: "text",
        content: { title: "My Work", body: "Share what you do and what inspires you." },
      },
      {
        type: "image",
        content: { url: "", caption: "Add your best work" },
      },
    ],
    headerType: "color",
    style: { bgColor: "#ffffff", headerColor: "#6BCB77" },
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Clean & simple — just the essentials",
    emoji: "✨",
    defaultLinks: [
      { type: "website", label: "Website", placeholder: "https://yoursite.com" },
      { type: "instagram", label: "Instagram", placeholder: "@yourhandle" },
      { type: "email", label: "Email", placeholder: "you@email.com" },
    ],
    defaultBlocks: [],
    headerType: "color",
    style: { bgColor: "#ffffff", headerColor: "#333333" },
  },
];

export function getLayoutTemplate(id: string): LayoutTemplate | undefined {
  return LAYOUT_TEMPLATES.find((t) => t.id === id);
}
