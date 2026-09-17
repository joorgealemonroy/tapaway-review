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
}
