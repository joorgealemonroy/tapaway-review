export interface CardDesign {
  id: string;
  businessName: string;
  frontImageUrl: string;
  backImageUrl: string | null;
  frontImagePath: string;
  backImagePath: string | null;
  enabled: boolean;
  sortOrder: number;
}
