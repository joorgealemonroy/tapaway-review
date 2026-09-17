import type { CachedBlock, CachedLink, CachedProfile } from "@/hooks/useProfileCache";

export interface CardDesign {
  id: string;
  businessName: string;
  frontImageUrl: string;
  backImageUrl: string | null;
  frontImagePath: string;
  backImagePath: string | null;
  enabled: boolean;
  sortOrder: number;
  hubKind: "personal" | "restaurant" | null;
  hubId: string | null;
  hubSlug: string | null;
  hubUrl: string | null;
  hubScreenshotPath: string | null;
  hubScreenshotUrl: string | null;
  hubPreview: HubPreviewData | null;
}

export interface HubPreviewAction {
  id: string;
  type: string;
  label: string;
  url: string;
}

export interface HubPreviewData {
  name: string;
  description: string | null;
  logoUrl: string | null;
  actions: HubPreviewAction[];
  profile: CachedProfile | null;
  links: CachedLink[];
  blocks: CachedBlock[];
}
