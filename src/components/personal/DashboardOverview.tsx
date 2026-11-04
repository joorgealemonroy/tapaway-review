import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ExternalLink,
  Share2,
} from "lucide-react";
import { isSubscriptionAllowed } from "@/lib/subscriptionStatus";
import {
  PlaybookSection,
  FeatureDiscovery,
  type DiscoveryFeature,
} from "@/components/dashboard/ClientEngagement";
import { WelcomeIntro } from "@/components/dashboard/WelcomeIntro";
import { toast } from "sonner";
import { CanonicalHubReport } from "@/components/analytics/CanonicalHubReport";


/**
 * DashboardOverview. The overview-first landing tab for the Solo (personal)
 * dashboard. Answers "here's what you've got done so far":
 *
 * 1. Account status header (plan, Hub Live/Paused, trial countdown)
 * 2. Your progress. Own stats only: visits this week + trend vs last week,
 *    link clicks this week, total visits. No cross-business comparisons.
 * 3. Setup checklist with done/todo states, each linking to the right tab.
 *
 * Mobile-first: stacked cards, min 44px tap targets, no horizontal overflow.
 */

interface OverviewLink {
  id: string;
  link_type: string;
  label: string;
  url: string;
  is_active?: boolean | null;
}

interface OverviewProfile {
  id: string;
  profile_photo_url: string | null;
  username?: string | null;
  full_name?: string | null;
  headline: string | null;
  bio: string | null;
  header_type?: string | null;
  plan_type: string | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
  payment_state?: string | null;
  card_confirmed: boolean | null;
  contact_enabled?: boolean | null;
  next_billing_date?: string | null;
  created_at?: string | null;
  contact_address?: string | null;
}

export interface DashboardOverviewProps {
  profile: OverviewProfile;
  links: OverviewLink[];
  isTrialing: boolean;
  onGoToTab: (tab: string) => void;
  /** Admin previewing someone else's hub. Suppress nudges/discovery. */
  isReadOnlyView?: boolean;
}

export const DashboardOverview = ({ profile, links, onGoToTab, isReadOnlyView = false }: DashboardOverviewProps) => {
  /** Feature usage for "Try this" discovery cards. Null until loaded. */
  const [featureUsage, setFeatureUsage] = useState<{ customerInfo: boolean; sms: boolean } | null>(null);

  // Visible analytics use the shared private report. Legacy milestones/nudges stay
  // disabled here rather than substituting historical counts on an error.
  const activeLinks = links.filter((l) => l.is_active !== false);
  // Feature usage for "Try this" discovery. Checked against real data, never
  // assumed. Read-only views skip it (discovery cards are suppressed there).
  useEffect(() => {
    if (isReadOnlyView) return;
    let cancelled = false;
    const load = async () => {
      try {
        const [leadRes, smsRes] = await Promise.all([
          supabase
            .from("lead_forms")
            .select("id", { count: "exact", head: true })
            .eq("profile_id", profile.id),
          supabase
            .from("sms_campaigns")
            .select("id", { count: "exact", head: true })
            .eq("profile_id", profile.id),
        ]);
        if (cancelled) return;
        setFeatureUsage({
          customerInfo: (leadRes.count ?? 0) > 0,
          sms: (smsRes.count ?? 0) > 0,
        });
      } catch (err) {
        console.warn("Engagement feature-usage check failed", err);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [profile.id, isReadOnlyView]);

  // --- Engagement inputs (rules documented in ENGAGEMENT-NUDGES.md) ---
  const isComplimentary = profile.payment_state === "complimentary";
  const isPaused = !isSubscriptionAllowed(profile.subscription_status);
  const accountAgeDays = profile.created_at
    ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86_400_000)
    : 0;
  const hubIsSetUp = activeLinks.length > 0;

  const discoveryFeatures: DiscoveryFeature[] = featureUsage
    ? [
        {
          id: "customerInfo",
          used: featureUsage.customerInfo,
          tab: "leads",
          tabLabel: "Open Customer info",
        },
        { id: "sms", used: featureUsage.sms, tab: "sms", tabLabel: "Open SMS" },
      ]
    : [];

  const displayName =
    profile.full_name?.trim() || (profile.username ? `@${profile.username}` : "Your hub");

  const goTo = (tab: string) => {
    onGoToTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const hubUrl = profile.username ? `${window.location.origin}/${profile.username}` : null;
  const locationLabel = profile.contact_address
    ?.split(",")
    .slice(-3)
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
  const shareHub = async () => {
    if (!hubUrl) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: displayName, url: hubUrl });
      } else {
        await navigator.clipboard.writeText(hubUrl);
        toast.success("Hub link copied");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      await navigator.clipboard.writeText(hubUrl);
      toast.success("Hub link copied");
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Live hub command block */}
      {profile.username && (
        <Card className="overflow-hidden border-border bg-card p-4 sm:p-6 card-elevated">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-emerald-500">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            {isPaused ? "Paused" : "Live"}
          </div>
          <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <h1 className="max-w-xl text-3xl font-black leading-tight sm:text-5xl">
                {isPaused ? "Your hub is currently paused." : "Your hub is taking taps."}
              </h1>
              <p className="mt-2 truncate text-sm text-muted-foreground sm:text-base">
                tapaway.co/{profile.username}{locationLabel ? ` · ${locationLabel}` : ""}
              </p>
            </div>
            <div className="grid w-full grid-cols-2 gap-2 lg:w-auto lg:min-w-[360px]">
              {isPaused ? (
                <Button className="col-span-2 min-h-[48px]" onClick={() => goTo("plan")}>
                  View plan options
                </Button>
              ) : (
                <>
                  <Button className="min-h-[48px]" onClick={shareHub}>
                    <Share2 className="mr-2 h-4 w-4" /> Share your hub
                  </Button>
                  <Button asChild variant="outline" className="min-h-[48px]">
                    <a href={`/${profile.username}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" /> View
                    </a>
                  </Button>
                </>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* One-time first-run intro. New accounts only, never in admin view */}
      {!isReadOnlyView && (
        <WelcomeIntro
          accountId={profile.id}
          kind="personal"
          displayName={displayName}
          hubPath={profile.username ? `/${profile.username}` : null}
          createdAt={profile.created_at ?? null}
          onNavigateTab={goTo}
        />
      )}

      <CanonicalHubReport key={profile.id} hubId={profile.id} kind="solo" initialDays={7}/>

      {/* Engagement: playbook + feature discovery */}
      {!isReadOnlyView && (
        <>
          <PlaybookSection kind="personal" onNavigateTab={goTo} />
          {featureUsage && (
            <FeatureDiscovery features={discoveryFeatures} onNavigateTab={goTo} />
          )}
        </>
      )}
    </div>
  );
};
