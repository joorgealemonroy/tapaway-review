import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowUp,
  CalendarDays,
  Loader2,
  Clock,
  ExternalLink,
  Share2,
} from "lucide-react";
import { isSubscriptionAllowed } from "@/lib/subscriptionStatus";
import {
  MilestoneBadges,
  UsageNudge,
  PlaybookSection,
  FeatureDiscovery,
  type DiscoveryFeature,
} from "@/components/dashboard/ClientEngagement";
import { WelcomeIntro } from "@/components/dashboard/WelcomeIntro";
import { toast } from "sonner";
import {
  getPersonalHubSummary,
  getPersonalHubDaily,
  losAngelesDayLabel,
  losAngelesWeekday,
  type HubDailyPoint,
  type HubEventSummary,
} from "@/lib/clientStats";

/**
 * DashboardOverview — the overview-first landing tab for the Solo (personal)
 * dashboard. Answers "here's what you've got done so far":
 *
 * 1. Account status header (plan, Hub Live/Paused, trial countdown)
 * 2. Your progress — own stats only: visits this week + trend vs last week,
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
  /** Admin previewing someone else's hub — suppress nudges/discovery. */
  isReadOnlyView?: boolean;
}

interface ProgressStats {
  week: number;
  prevWeek: number;
  total: number;
  linkClicksWeek: number;
  /** All-time link clicks — feeds the first-link-click milestone. */
  linkClicksAllTime: number;
}

export const DashboardOverview = ({ profile, links, onGoToTab, isReadOnlyView = false }: DashboardOverviewProps) => {
  const [stats, setStats] = useState<ProgressStats | null>(null);
  /** Per-day clicks/visits from the edge function; null when unavailable (legacy fallback in use). */
  const [dailyClicks, setDailyClicks] = useState<HubDailyPoint[] | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  /** Feature usage for "Try this" discovery cards — null until loaded. */
  const [featureUsage, setFeatureUsage] = useState<{ customerInfo: boolean; sms: boolean } | null>(null);

  // Own-stats only: this profile's visits and link clicks. No comparisons.
  //
  // Reads go through the analytics-report edge function, which serves
  // human-validated traffic from analytics_hits (bots, previews and staff
  // views are classified server-side and excluded). The legacy
  // personal_analytics table is no longer written to, so it is only a
  // fallback for the window before the edge function is deployed.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setStatsLoading(true);
      try {
        const now = Date.now();
        const d7 = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
        const d14 = new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString();
        const [weekEv, prevEv, totalEv, daily] = await Promise.all([
          getPersonalHubSummary(profile.id, d7),
          getPersonalHubSummary(profile.id, d14, d7),
          getPersonalHubSummary(profile.id),
          getPersonalHubDaily(profile.id, 14),
        ]);
        if (cancelled) return;
        const pick = (evs: HubEventSummary[], name: string) =>
          evs.find((e) => e.event_name === name)?.events ?? 0;
        setStats({
          week: pick(weekEv, "hub_view"),
          prevWeek: pick(prevEv, "hub_view"),
          total: pick(totalEv, "hub_view"),
          linkClicksWeek: pick(weekEv, "link_click"),
          linkClicksAllTime: pick(totalEv, "link_click"),
        });
        setDailyClicks(daily);
      } catch (err) {
        console.warn("analytics-report unavailable, using legacy stats fallback", err);
        const now = new Date();
        const d7 = new Date(now);
        d7.setDate(d7.getDate() - 7);
        const d14 = new Date(now);
        d14.setDate(d14.getDate() - 14);
        const d7Iso = d7.toISOString();
        const d14Iso = d14.toISOString();

        const [weekRes, prevRes, totalRes, clicksRes, clicksAllRes] = await Promise.all([
          supabase.from("personal_analytics").select("*", { count: "exact", head: true }).eq("profile_id", profile.id).eq("event_type", "profile_visit").gte("created_at", d7Iso),
          supabase.from("personal_analytics").select("*", { count: "exact", head: true }).eq("profile_id", profile.id).eq("event_type", "profile_visit").gte("created_at", d14Iso).lt("created_at", d7Iso),
          supabase.from("personal_analytics").select("*", { count: "exact", head: true }).eq("profile_id", profile.id).eq("event_type", "profile_visit"),
          supabase.from("personal_analytics").select("*", { count: "exact", head: true }).eq("profile_id", profile.id).eq("event_type", "link_click").gte("created_at", d7Iso),
          supabase.from("personal_analytics").select("*", { count: "exact", head: true }).eq("profile_id", profile.id).eq("event_type", "link_click"),
        ]);

        if (!cancelled) {
          setStats({
            week: weekRes.count ?? 0,
            prevWeek: prevRes.count ?? 0,
            total: totalRes.count ?? 0,
            linkClicksWeek: clicksRes.count ?? 0,
            linkClicksAllTime: clicksAllRes.count ?? 0,
          });
          // No per-day data on the legacy path — the card below stays hidden
          // rather than showing stale guesses.
          setDailyClicks(null);
        }
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [profile.id]);

  const activeLinks = links.filter((l) => l.is_active !== false);
  // Feature usage for "Try this" discovery — checked against real data, never
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
            .from("sms_campaigns" as any)
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

  // Days since the last visit, from the 14-day per-day series. When the hub
  // has visits but none in the window, the last visit was 15+ days ago.
  const daysIdle: number | null =
    statsLoading || dailyClicks === null
      ? null
      : (() => {
          for (let i = dailyClicks.length - 1; i >= 0; i--) {
            if (dailyClicks[i].total > 0) return dailyClicks.length - 1 - i;
          }
          return (stats?.total ?? 0) > 0 ? 15 : null;
        })();

  const showNudge =
    !isReadOnlyView &&
    !statsLoading &&
    !isComplimentary &&
    !isPaused &&
    accountAgeDays >= 7 &&
    hubIsSetUp &&
    (stats?.total ?? 0) > 0 &&
    daysIdle !== null &&
    daysIdle >= 7;

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
  const nameInitial = (profile.full_name || profile.username || "?").trim().charAt(0).toUpperCase();

  const goTo = (tab: string) => {
    onGoToTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const hubUrl = profile.username ? `${window.location.origin}/${profile.username}` : null;
  const locationLabel = profile.contact_address
    ?.split(",")
    .slice(-2)
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
  const weeklyChange = stats && stats.prevWeek > 0
    ? Math.round(((stats.week - stats.prevWeek) / stats.prevWeek) * 100)
    : null;
  const peakDay = dailyClicks
    ?.filter((day) => (day.events.hub_view ?? 0) > 0)
    .reduce<HubDailyPoint | null>((best, day) => {
      if (!best || (day.events.hub_view ?? 0) > (best.events.hub_view ?? 0)) return day;
      return best;
    }, null);
  const milestoneTargets = [50, 100, 250, 500, 1000];
  const milestoneTarget = milestoneTargets.find((target) => target > (stats?.total ?? 0))
    ?? Math.ceil((stats?.total ?? 0) / 1000 + 1) * 1000;
  const milestoneProgress = Math.min(100, ((stats?.total ?? 0) / milestoneTarget) * 100);

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

      {/* One-time first-run intro — new accounts only, never in admin view */}
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

      {/* Engagement: milestone celebrations + gentle usage nudge */}
      {!isReadOnlyView && !statsLoading && stats && (
        <>
          <MilestoneBadges
            accountId={profile.id}
            totalActivity={stats.total}
            reviewClicks={stats.linkClicksAllTime}
            noun="visits"
          />
          {showNudge && daysIdle !== null && (
            <UsageNudge daysIdle={daysIdle} noun="visits" kind="personal" onNavigateTab={goTo} />
          )}
        </>
      )}

      <section aria-label="Hub performance" className="space-y-5">
        <div>
          <p className="mb-3 text-xs font-black uppercase text-muted-foreground">Momentum</p>
          {statsLoading ? (
            <Card className="flex min-h-24 items-center justify-center card-elevated">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              <Card className="p-4 card-elevated">
                <div className="flex items-center gap-2 text-xl font-black">
                  {weeklyChange !== null && weeklyChange > 0 && <ArrowUp className="h-5 w-5" />}
                  {weeklyChange === null
                    ? stats?.week ? "A fresh start" : "Ready for the first tap"
                    : `${weeklyChange > 0 ? "+" : ""}${weeklyChange}%`}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {weeklyChange === null
                    ? stats?.week
                      ? `${stats.week} visits this week — your first weekly baseline.`
                      : "Share your hub to start building momentum."
                    : weeklyChange >= 0
                      ? "More visits than last week. Your cards are getting out there."
                      : "A quieter week so far — every tap still counts."}
                </p>
              </Card>
              <Card className="p-4 card-elevated">
                <div className="flex items-center gap-2 text-xl font-black">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  {peakDay ? `${losAngelesWeekday(peakDay.date)} rush` : "Your busiest day"}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {peakDay
                    ? `${peakDay.events.hub_view ?? 0} visits landed on ${losAngelesDayLabel(peakDay.date)}.`
                    : "Once visits come in, your strongest day will appear here."}
                </p>
              </Card>
            </div>
          )}
        </div>

        <div>
          <p className="mb-3 text-xs font-black uppercase text-muted-foreground">The numbers</p>
          <Card className="p-4 card-elevated">
            <div className="grid grid-cols-3 divide-x divide-border text-center">
              {[
                { value: stats?.week ?? 0, top: "visits", bottom: "this week" },
                { value: stats?.linkClicksWeek ?? 0, top: "link taps", bottom: "this week" },
                { value: stats?.total ?? 0, top: "total", bottom: "visits" },
              ].map((item) => (
                <div key={`${item.top}-${item.bottom}`} className="min-w-0 px-2 sm:px-5">
                  <p className="text-3xl font-black sm:text-4xl">{item.value}</p>
                  <p className="mt-1 text-xs leading-tight text-muted-foreground">
                    {item.top}<br />{item.bottom}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between gap-3 text-sm font-bold">
                <span>First {milestoneTarget} visits</span>
                <span className="text-primary">
                  {stats?.total ?? 0} of {milestoneTarget} · {Math.max(0, milestoneTarget - (stats?.total ?? 0))} to go
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-500"
                  style={{ width: `${milestoneProgress}%` }}
                />
              </div>
            </div>
          </Card>
        </div>

        {/* When your clicks happened — per-day link clicks (America/Los_Angeles days) */}
        {dailyClicks !== null && !statsLoading && (
          <Card className="p-4 card-elevated mt-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">When your clicks happened</p>
                <p className="text-xs text-muted-foreground">Link clicks, day by day — last 14 days</p>
              </div>
            </div>
            {dailyClicks.every((d) => (d.events["link_click"] ?? 0) === 0) ? (
              <p className="text-sm text-muted-foreground">
                No link clicks in the last 14 days yet — when someone taps a link on your
                hub, you'll see exactly which day it happened here.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {[...dailyClicks].reverse().map((day) => {
                  const clicks = day.events["link_click"] ?? 0;
                  const visits = day.events["hub_view"] ?? 0;
                  return (
                    <li key={day.date} className="py-2 flex items-center justify-between gap-3">
                      <p className="text-sm font-medium min-w-0 flex-1">
                        {losAngelesWeekday(day.date)}, {losAngelesDayLabel(day.date)}
                      </p>
                      <p className="text-xs text-muted-foreground shrink-0">
                        {clicks > 0 ? (
                          <span className="font-bold text-primary text-sm">
                            {clicks} {clicks === 1 ? "click" : "clicks"}
                          </span>
                        ) : (
                          "No clicks"
                        )}
                        {visits > 0 && (
                          <span>
                            {" "}· {visits} {visits === 1 ? "visit" : "visits"}
                          </span>
                        )}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        )}
      </section>

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
