import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AccountStatusStrip } from "@/components/dashboard/AccountStatusStrip";
import {
  CheckCircle2,
  Circle,
  ChevronRight,
  Eye,
  MousePointerClick,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isSubscriptionAllowed } from "@/lib/subscriptionStatus";
import {
  MilestoneBadges,
  UsageNudge,
  PlaybookSection,
  FeatureDiscovery,
  type DiscoveryFeature,
} from "@/components/dashboard/ClientEngagement";
import { WelcomeIntro } from "@/components/dashboard/WelcomeIntro";
import { ExternalLink } from "lucide-react";
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
}

export interface DashboardOverviewProps {
  profile: OverviewProfile;
  links: OverviewLink[];
  isTrialing: boolean;
  onGoToTab: (tab: string) => void;
  /** Admin previewing someone else's hub — suppress nudges/discovery. */
  isReadOnlyView?: boolean;
}

interface ChecklistItem {
  id: string;
  label: string;
  hint: string;
  done: boolean;
  targetTab: string;
}

interface ProgressStats {
  week: number;
  prevWeek: number;
  total: number;
  linkClicksWeek: number;
  /** All-time link clicks — feeds the first-link-click milestone. */
  linkClicksAllTime: number;
}

export const DashboardOverview = ({ profile, links, isTrialing, onGoToTab, isReadOnlyView = false }: DashboardOverviewProps) => {
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
  const hasGoogleReview = activeLinks.some(
    (l) =>
      l.link_type === "google_review" ||
      (l.url && l.url.includes("search.google.com/local/writereview")),
  );

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

  // Banner/logo hubs show the full picture as the header — headline & bio
  // are intentionally skipped there, so don't nag about them.
  const hideHeadlineStep =
    profile.header_type === "banner" || profile.header_type === "logo";

  const checklist: ChecklistItem[] = [
    {
      id: "photo",
      label: "Profile photo",
      hint: "People tap more when they see a face or logo.",
      done: !!profile.profile_photo_url,
      targetTab: "links",
    },
    {
      id: "headline",
      label: "Headline & bio",
      hint: "Tell visitors who you are in one line.",
      done: !!profile.headline?.trim() && !!profile.bio?.trim(),
      targetTab: "links",
    },
    {
      id: "first-link",
      label: "First link added",
      hint: "Google review, Instagram, booking — whatever matters.",
      done: activeLinks.length > 0,
      targetTab: "links",
    },
    {
      id: "google",
      label: "Google review link",
      hint: "The #1 driver of reviews for local businesses.",
      done: hasGoogleReview,
      targetTab: "links",
    },
    {
      id: "contact",
      label: "Contact card",
      hint: "Let visitors save your info to their phone in one tap.",
      done: !!profile.contact_enabled,
      targetTab: "design",
    },
    {
      id: "card",
      label: "First card claimed",
      hint: "Tap your card to link it to this hub.",
      done: !!profile.card_confirmed,
      targetTab: isTrialing ? "links" : "cards",
    },
  ].filter((c) => !(hideHeadlineStep && c.id === "headline"));

  const doneCount = checklist.filter((c) => c.done).length;

  // Trend vs last week — framed as progress, never shamed.
  const trend =
    stats === null
      ? null
      : stats.prevWeek === 0
        ? stats.week > 0
          ? { kind: "new" as const, label: "First visits this week" }
          : { kind: "flat" as const, label: "No visits yet" }
        : stats.week === stats.prevWeek
          ? { kind: "flat" as const, label: "Same as last week" }
          : stats.week > stats.prevWeek
            ? {
                kind: "up" as const,
                label: `Up ${Math.round(((stats.week - stats.prevWeek) / stats.prevWeek) * 100)}% vs last week`,
              }
            : {
                kind: "down" as const,
                label: `Down ${Math.round(((stats.prevWeek - stats.week) / stats.prevWeek) * 100)}% vs last week`,
              };

  const goTo = (tab: string) => {
    onGoToTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* 1. Account status — plan, live/paused, trial countdown */}
      <AccountStatusStrip
        planType={profile.plan_type}
        subscriptionStatus={profile.subscription_status}
        trialEndsAt={profile.trial_ends_at}
        paymentState={profile.payment_state ?? null}
        nextBillingDate={profile.next_billing_date ?? null}
        pausedAction={
          <Button className="min-h-[44px] w-full sm:w-auto" onClick={() => goTo("plan")}>
            View plan options
          </Button>
        }
      />

      {/* Live hub strip — no photo here; design lives in the Design tab */}
      {profile.username && (
        <Card className="p-3 sm:p-4 card-elevated">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">Your hub is live</p>
              <p className="text-xs text-muted-foreground truncate font-mono">
                tapaway.co/{profile.username}
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="min-h-[44px] shrink-0">
              <a href={`/${profile.username}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-1.5" />
                View
              </a>
            </Button>
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

      {/* 2. Your progress — own stats only */}
      <section aria-label="Your progress">
        <h2 className="text-lg sm:text-xl font-bold mb-3">Your progress</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="p-4 card-elevated">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Eye className="w-4 h-4 text-primary" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Visits this week</p>
            </div>
            {statsLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <p className="text-3xl font-bold">{stats?.week ?? 0}</p>
                {trend && (
                  <p
                    className={cn(
                      "text-xs mt-1 flex items-center gap-1",
                      trend.kind === "up" && "text-emerald-600",
                      trend.kind === "down" && "text-amber-600",
                      trend.kind !== "up" && trend.kind !== "down" && "text-muted-foreground",
                    )}
                  >
                    {trend.kind === "up" && <TrendingUp className="w-3.5 h-3.5" />}
                    {trend.kind === "down" && <TrendingDown className="w-3.5 h-3.5" />}
                    {trend.kind === "flat" && <Minus className="w-3.5 h-3.5" />}
                    {trend.label}
                  </p>
                )}
              </>
            )}
          </Card>

          <Card className="p-4 card-elevated">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <MousePointerClick className="w-4 h-4 text-accent" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Link clicks this week</p>
            </div>
            {statsLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <p className="text-3xl font-bold">{stats?.linkClicksWeek ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats && stats.linkClicksWeek > 0
                    ? "People are tapping through."
                    : "Share your link to get clicks."}
                </p>
              </>
            )}
          </Card>

          <Card className="p-4 card-elevated">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Total visits</p>
            </div>
            {statsLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <p className="text-3xl font-bold">{stats?.total ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">All time, your hub only.</p>
              </>
            )}
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

      {/* 3. Setup checklist — "here's what you've got done so far" */}
      <section aria-label="Setup checklist">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-lg sm:text-xl font-bold">Your setup</h2>
          <span className="text-sm text-muted-foreground">
            {doneCount} of {checklist.length} done
          </span>
        </div>
        <Card className="card-elevated overflow-hidden">
          <ul className="divide-y divide-border">
            {checklist.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => goTo(item.targetTab)}
                  className="w-full flex items-center gap-3 p-4 min-h-[64px] text-left transition-colors hover:bg-muted/50 active:bg-muted"
                >
                  <span className="shrink-0" aria-hidden>
                    {item.done ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    ) : (
                      <Circle className="w-6 h-6 text-muted-foreground/40" />
                    )}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span
                      className={cn(
                        "block font-medium text-sm sm:text-base",
                        item.done && "text-muted-foreground",
                      )}
                    >
                      {item.label}
                      {item.done && <span className="sr-only"> (done)</span>}
                    </span>
                    {!item.done && (
                      <span className="block text-xs text-muted-foreground mt-0.5 truncate">
                        {item.hint}
                      </span>
                    )}
                  </span>
                  {!item.done && (
                    <span className="shrink-0 text-xs font-semibold text-primary flex items-center gap-1">
                      Set up <ChevronRight className="w-4 h-4" />
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </Card>
        {doneCount === checklist.length && (
          <p className="text-sm text-muted-foreground mt-3 text-center">
            🎉 All set — now share your link everywhere.
          </p>
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
