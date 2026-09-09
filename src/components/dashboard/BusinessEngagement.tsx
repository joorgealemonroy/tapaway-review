/**
 * BusinessEngagement — engagement widgets on the business dashboard overview.
 *
 * Order: hub identity (delight) → milestone badges → usage nudge →
 * playbook ("Get more taps") → feature discovery ("Try this").
 *
 * Data rules (full spec in ENGAGEMENT-NUDGES.md):
 * - Nudge shows only when the account is active, NOT complimentary, NOT a
 *   demo preview, at least 7 days old, the hub is set up, it has at least one
 *   tap ever, and the last tap was 7+ days ago. Never shaming.
 * - Milestones come from real counts only, shown once per account.
 * - Feature cards only for features with zero real usage.
 */

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { isSubscriptionAllowed } from "@/lib/subscriptionStatus";
import {
  getClientLastTapAt,
  getClientTapStats,
  getClientReviewClickTotal,
} from "@/lib/clientStats";
import {
  MilestoneBadges,
  UsageNudge,
  PlaybookSection,
  FeatureDiscovery,
  type DiscoveryFeature,
} from "@/components/dashboard/ClientEngagement";

export interface BusinessEngagementProps {
  restaurantId: string;
  restaurantName: string;
  logoUrl: string | null;
  customSlug: string | null;
  createdAt?: string | null;
  paymentState?: string | null;
  subscriptionStatus?: string | null;
  /** Hub basics: menu image or Google review link present. */
  hasMenu: boolean;
  hasGoogleLink: boolean;
  isDemoView?: boolean;
  onNavigateTab: (tab: string) => void;
}

interface FeatureUsage {
  smsUsed: boolean;
  promotionsUsed: boolean;
  pollsUsed: boolean;
}

const DAY_MS = 86_400_000;

export const BusinessEngagement = ({
  restaurantId,
  restaurantName,
  logoUrl,
  customSlug,
  createdAt,
  paymentState,
  subscriptionStatus,
  hasMenu,
  hasGoogleLink,
  isDemoView = false,
  onNavigateTab,
}: BusinessEngagementProps) => {
  const [totalTaps, setTotalTaps] = useState(0);
  const [reviewClicks, setReviewClicks] = useState(0);
  const [lastTapAt, setLastTapAt] = useState<string | null>(null);
  const [neverTapped, setNeverTapped] = useState(false);
  const [usage, setUsage] = useState<FeatureUsage | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [tapStats, lastTap, reviewTotal, smsRes, engRes] = await Promise.all([
          getClientTapStats(restaurantId),
          getClientLastTapAt(restaurantId),
          getClientReviewClickTotal(restaurantId),
          supabase
            .from("restaurant_sms_campaigns" as any)
            .select("id", { count: "exact", head: true })
            .eq("restaurant_id", restaurantId),
          supabase
            .from("restaurant_engagement" as any)
            .select("type")
            .eq("restaurant_id", restaurantId),
        ]);
        if (cancelled) return;
        setTotalTaps(tapStats.totalTaps);
        setLastTapAt(lastTap);
        setNeverTapped(lastTap === null && tapStats.totalTaps === 0);
        setReviewClicks(reviewTotal);
        const engRows = (engRes.data ?? []) as unknown as Array<{ type: string }>;
        setUsage({
          smsUsed: (smsRes.count ?? 0) > 0,
          promotionsUsed: engRows.some((r) => r.type === "promotion"),
          pollsUsed: engRows.some((r) => r.type === "poll"),
        });
      } catch (err) {
        // Engagement is decorative — a stats failure must never break the
        // overview. Log and leave everything hidden.
        console.warn("BusinessEngagement failed to load", err);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [restaurantId]);

  const isComplimentary = paymentState === "complimentary";
  const effectiveStatus = isDemoView ? "active" : subscriptionStatus;
  const isPaused = !isSubscriptionAllowed(effectiveStatus);
  const accountAgeDays = createdAt
    ? Math.floor((Date.now() - new Date(createdAt).getTime()) / DAY_MS)
    : 0;
  const hubIsSetUp = hasMenu || hasGoogleLink;

  const daysIdle =
    lastTapAt === null ? null : Math.floor((Date.now() - new Date(lastTapAt).getTime()) / DAY_MS);

  // Nudge rules: active + not complimentary + not a demo preview + account at
  // least a week old + hub set up + has been tapped before + quiet for 7+ days.
  // Complimentary accounts are free on purpose — never nagged.
  const showNudge =
    loaded &&
    !isDemoView &&
    !isComplimentary &&
    !isPaused &&
    accountAgeDays >= 7 &&
    hubIsSetUp &&
    !neverTapped &&
    daysIdle !== null &&
    daysIdle >= 7;

  const features: DiscoveryFeature[] = usage
    ? [
        { id: "sms", used: usage.smsUsed, tab: "sms", tabLabel: "Open SMS" },
        {
          id: "promotions",
          used: usage.promotionsUsed,
          tab: "engagement",
          tabLabel: "Create a promotion",
        },
        { id: "polls", used: usage.pollsUsed, tab: "engagement", tabLabel: "Create a poll" },
      ]
    : [];

  const initial = (restaurantName || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Delight: their place — logo, name, one tap to the live hub */}
      <Card className="p-4 sm:p-5 card-elevated">
        <div className="flex items-center gap-4">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={`${restaurantName} logo`}
              className="w-14 h-14 rounded-xl object-cover shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center shrink-0">
              <span className="text-2xl font-bold text-white">{initial}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Your hub</p>
            <h2 className="text-xl sm:text-2xl font-bold truncate">{restaurantName}</h2>
          </div>
          {customSlug && (
            <Button asChild variant="outline" className="min-h-[44px] shrink-0">
              <a href={`/${customSlug}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">View your live hub</span>
                <span className="sm:hidden">Live hub</span>
              </a>
            </Button>
          )}
        </div>
      </Card>

      {loaded && !isDemoView && (
        <>
          <MilestoneBadges
            accountId={restaurantId}
            totalActivity={totalTaps}
            reviewClicks={reviewClicks}
            noun="taps"
          />

          {showNudge && daysIdle !== null && (
            <UsageNudge
              daysIdle={daysIdle}
              noun="taps"
              kind="business"
              onNavigateTab={onNavigateTab}
            />
          )}
        </>
      )}

      {!isDemoView && loaded && (
        <>
          <PlaybookSection kind="business" onNavigateTab={onNavigateTab} />
          <FeatureDiscovery features={features} onNavigateTab={onNavigateTab} />
        </>
      )}
    </div>
  );
};
