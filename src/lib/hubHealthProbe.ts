/**
 * Shared hub-health probing.
 *
 * Verifies that a hub the platform expects to be publicly live is actually
 * reachable by a logged-out visitor, using the exact same anonymous endpoints
 * the public site hits. Used by both the Admin Overview status band and the
 * full Hub Health page so there is only one implementation.
 */

export interface HubRow {
  slug: string;
  kind: "personal" | "restaurant";
  owner_label: string | null;
  expected_status: "live" | "expired";
  subscription_status: string | null;
  is_approved: boolean | null;
  expires_at: string | null;
}

export type ProbeResult = "ok" | "empty" | "error" | "pending";

export interface ProbeState {
  status: ProbeResult;
  detail?: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export const hubKey = (row: Pick<HubRow, "kind" | "slug">) => `${row.kind}:${row.slug}`;

export async function probeHub(row: HubRow): Promise<ProbeState> {
  try {
    const isPersonal = row.kind === "personal";
    const url = isPersonal
      ? `${SUPABASE_URL}/rest/v1/rpc/get_public_personal_profile`
      : `${SUPABASE_URL}/rest/v1/rpc/get_public_restaurant_hub`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ _slug: row.slug }),
    });
    if (!res.ok) {
      const text = await res.text();
      return { status: "error", detail: `profile HTTP ${res.status}: ${text.slice(0, 160)}` };
    }
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      return { status: "empty", detail: "profile RPC returned 0 rows" };
    }

    // For personal hubs, also probe the tables the client reads directly.
    // A missing GRANT here is what silently emptied paying customers' hubs.
    if (isPersonal) {
      const profileId = data[0].id as string;
      const linksRes = await fetch(
        `${SUPABASE_URL}/rest/v1/personal_links?select=id&profile_id=eq.${profileId}&limit=1`,
        { headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` } },
      );
      if (!linksRes.ok) {
        const text = await linksRes.text();
        return { status: "error", detail: `links HTTP ${linksRes.status}: ${text.slice(0, 160)}` };
      }
      const blocksRes = await fetch(
        `${SUPABASE_URL}/rest/v1/personal_blocks?select=id&profile_id=eq.${profileId}&limit=1`,
        { headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` } },
      );
      if (!blocksRes.ok) {
        const text = await blocksRes.text();
        return { status: "error", detail: `blocks HTTP ${blocksRes.status}: ${text.slice(0, 160)}` };
      }
    }
    return { status: "ok" };
  } catch (e) {
    return { status: "error", detail: e instanceof Error ? e.message : "unknown error" };
  }
}

/**
 * Probes every hub in `list` with a small concurrency pool.
 * `onResult` fires per hub so callers can stream results into UI state.
 */
export async function runHealthSweep(
  list: HubRow[],
  onResult: (row: HubRow, state: ProbeState) => void,
  concurrency = 6,
): Promise<void> {
  const queue = [...list];
  const workers = Array.from({ length: Math.min(concurrency, Math.max(queue.length, 1)) }, async () => {
    while (queue.length) {
      const row = queue.shift();
      if (!row) break;
      const state = await probeHub(row);
      onResult(row, state);
    }
  });
  await Promise.all(workers);
}

export const liveHubs = (rows: HubRow[]) =>
  rows.filter((r) => r.expected_status === "live" && !!r.slug);
