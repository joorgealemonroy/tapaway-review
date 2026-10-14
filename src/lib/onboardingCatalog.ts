import { useEffect, useState } from "react";

export type OnboardingPlan = "solo" | "venue";
export type BillingInterval = "month" | "year";
export type CatalogItem = { plan: OnboardingPlan; interval: BillingInterval; amount: number; currency: "usd"; trialDays: number; available: boolean };
export const CARD_QUANTITIES = { solo: 4, venue: 15 } as const;
const CACHE_KEY = "tapaway_onboarding_catalog_v1";
let pending: Promise<CatalogItem[]> | null = null;

function validCatalog(value: unknown): value is CatalogItem[] {
  return Array.isArray(value) && value.length > 0 && value.every((item) =>
    item && ["solo", "venue"].includes(item.plan) && ["month", "year"].includes(item.interval)
    && item.currency === "usd" && Number.isFinite(item.amount) && item.amount > 0
    && Number.isFinite(item.trialDays) && typeof item.available === "boolean");
}

export async function loadOnboardingCatalog(): Promise<CatalogItem[]> {
  try {
    const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || "null");
    if (cached?.expiresAt > Date.now() && validCatalog(cached.catalog)) return cached.catalog;
  } catch { /* Blocked storage cannot prevent a catalog request. */ }
  if (pending) return pending;
  pending = (async () => {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/onboarding-plan-catalog`, {
      headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error("Catalog unavailable");
    const data = await response.json();
    if (!validCatalog(data.catalog)) throw new Error("Invalid catalog");
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ expiresAt: Date.now() + 5 * 60 * 1000, catalog: data.catalog }));
    } catch { /* Use the verified response even when storage is blocked. */ }
    return data.catalog;
  })();
  try { return await pending; } finally { pending = null; }
}

export function useOnboardingCatalog() {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    loadOnboardingCatalog().then((items) => {
      if (active) { setCatalog(items); setFailed(false); }
    }).catch(() => { if (active) { setCatalog([]); setFailed(true); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);
  return { catalog, loading, failed, retry: () => setAttempt((value) => value + 1) };
}

export function formatCatalogPrice(item?: CatalogItem) {
  if (!item?.available) return "Unavailable";
  return `$${(item.amount / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}/${item.interval === "year" ? "year" : "month"}`;
}