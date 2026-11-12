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

export interface ProfileSmsProgram {
  brand_name: string;
  consent_version: number;
  restock_consent_text: string;
  ordering_consent_text: string;
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
  campaign_type: "restock" | "ordering";
  location_id: string | null;
}

export interface ProfileSmsDashboard {
  program: ProfileSmsProgram;
  audience: { total: number; ordering: number; restock: number };
  locations: { id: string; name: string; subscriber_count: number }[];
  campaigns: ProfileSmsCampaign[];
}
