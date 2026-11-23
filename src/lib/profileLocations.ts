import { tapawayUrl } from "@/lib/siteUrl";

/** A physical stockist belongs to one hub; it never creates another subscription. */
export interface ProfileLocation {
  id: string;
  profile_id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  address: string | null;
  directions_url: string | null;
  image_url: string | null;
  is_placeholder: boolean;
  is_active: boolean;
  sort_order: number;
  restocked_at: string | null;
  restock_note: string | null;
  created_at?: string;
  updated_at?: string;
}

export function profileLocationPath(username: string, locationId?: string | null): string {
  const path = `/${encodeURIComponent(username.replace(/^\/+/, ""))}`;
  return locationId ? `${path}?location=${encodeURIComponent(locationId)}` : path;
}

export function profileLocationUrl(username: string, locationId?: string | null): string {
  return tapawayUrl(profileLocationPath(username, locationId));
}

export function isManagedLocationsBlock(block: { block_type: string; content: unknown }): boolean {
  return block.block_type === "locations" && !!block.content &&
    typeof block.content === "object" &&
    String((block.content as Record<string, unknown>).managed) === "true";
}

/** Pickup cards stay on one hub instead of selecting a location-specific view. */
export function isPickupLocationsBlock(block: { block_type: string; content: unknown }): boolean {
  return isManagedLocationsBlock(block) &&
    (block.content as Record<string, unknown>).mode === "pickup";
}

export function pickupLocationsLimit(content: Record<string, unknown>): number {
  const limit = Number(content.maxLocations);
  return Number.isInteger(limit) && limit >= 1 && limit <= 20 ? limit : 2;
}

/** A directions action is available only after a real pickup address is saved. */
export function pickupLocationDirections(location: Pick<ProfileLocation, "is_placeholder" | "address" | "directions_url">): string | null {
  const address = location.address?.trim();
  if (location.is_placeholder || !address) return null;
  const directions = location.directions_url?.trim();
  if (directions && /^https:\/\//i.test(directions)) {
    try {
      const url = new URL(directions);
      if (url.protocol === "https:" && !url.username && !url.password) return url.href;
    } catch { /* Fall back to an address search when a saved link is invalid. */ }
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export interface ProfileSmsProgram {
  brand_name: string;
  consent_version: number;
  restock_consent_text: string;
  ordering_consent_text: string;
  offers_consent_text?: string;
  frequency_text: string;
  terms_url: string | null;
  privacy_url: string | null;
  sender_ready: boolean;
  sender_status: "pending" | "ready" | "paused";
}

export interface ProfileSmsCampaign {
  id: string;
  message: string;
  recipient_count: number;
  success_count: number;
  failure_count: number;
  created_at: string;
  campaign_type: "restock" | "ordering" | "offers";
  location_id: string | null;
}

export interface ProfileSmsDashboard {
  program: ProfileSmsProgram;
  audience: { total: number; ordering: number; restock: number; offers?: number };
  locations: { id: string; name: string; subscriber_count: number }[];
  campaigns: ProfileSmsCampaign[];
}
