import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HubRow, ProbeState, liveHubs, runHealthSweep, hubKey } from "@/lib/hubHealthProbe";

export type EngagementRange = "today" | "30d" | "all";

export interface OverviewCounts {
  personalTotal: number;
  restaurantTotal: number;
  activeSubs: number;
  trialing: number;
  newLast7: number;
  pendingApproval: number;
  changesRequested: number;
  printAwaiting: number;
  repAppsPending: number;
  demoRequestsPending: number;
  taxPending: number;
  unpaidCommissions: number;
  trialsExpiring7d: number;
  errors24h: number;
  /** Opted-in VIP SMS subscribers across all restaurants. */
  smsSubscribers: number;
  /** Van sales closed today (immediate-charge, outside the trial pipeline). */
  vanSalesToday: number;
}

export interface FulfillmentSummary {
  needsReview: number;
  toPrint: number;
  toDeliver: number;
}

export interface OverviewEngagement {
  taps: number;
  clicks: number;
  saves: number;
  activeHubs: number;
}

export interface ActivityItem {
  id: string;
  label: string;
  detail: string;
  at: string;
  tone: "neutral" | "good" | "warn";
  path?: string;
}

export interface HealthSummary {
  total: number;
  ok: number;
  broken: number;
  pending: number;
  brokenSlugs: { slug: string; detail: string }[];
  running: boolean;
  lastCheckedAt: Date | null;
}

export interface DailyPoint {
  day: string;
  taps: number;
  clicks: number;
  saves: number;
}

export interface BrokenLinkRow {
  hub_id: string;
  slug: string | null;
  label: string | null;
  url: string;
  status: string;
  classification: string | null;
  admin_review_state?: string | null;
  http_status: number | null;
  detail: string | null;
}

export interface LinkBreakdown {
  healthy: number;
  redirected: number;
  confirmed_broken: number;
  server_error: number;
  tls_error: number;
  timeout: number;
  blocked_unverifiable: number;
  malformed: number;
  false_positive: number;
}

export interface LinkHealth {
  totalLinks: number;
  brokenLinks: number;
  needsAttention: number;
  hubsWithBroken: number;
  breakdown: LinkBreakdown;
  worst: BrokenLinkRow[];
  lastCheckedAt: Date | null;
  running: boolean;
}

/* ---------------- command center additions ---------------- */

export interface MrrInfo {
  /** Sum of per-plan amounts for active/past_due accounts, excluding comped. */
  mrr: number;
  paying: number;
  trialsActive: number;
  note: string;
}

export interface TrialAccount {
  id: string;
  kind: "solo" | "business";
  name: string;
  /** Days until trial_ends_at; null when no end date recorded. */
  daysLeft: number | null;
  trialEndsAt: string | null;
}

export interface FollowupDue {
  id: string;
  name: string;
  /** Nurture day from the trial-followup cron: 3 | 10 | 13. */
  day: 3 | 10 | 13;
  hasPhone: boolean;
}

export interface LeaderboardRow {
  id: string;
  kind: "solo" | "business";
  name: string;
  taps: number;
  /** Percent change vs prior 30 days; null when there was no prior activity. */
  trendPct: number | null;
}

export interface AtRiskRow {
  id: string;
  kind: "solo" | "business";
  name: string;
  reason: "past_due" | "canceled";
  at: string | null;
}

/**
 * MRR is derived from the two account tables because there is no synced
 * Stripe subscriptions table in the DB — the webhook only writes
 * subscription_status / plan_type onto restaurants + personal_profiles.
 *
 * Plan → $/mo mapping (keep in sync with create-checkout-session PLAN_CONFIG
 * and PERSONAL_PRICING in src/lib/personalConfig.ts):
 * - restaurants: solo=$20, venue=$39, monthly/standard=$30 (legacy Venue),
 *   bundle=$25, legacy yearly=$199/yr amortized over 12;
 *   solo_yearly=$199/12 ($16.58), venue_yearly=$390/12 ($32.50)
 * - personal_profiles: monthly=$20, yearly=$199/12 ($16.58)
 * MRR FORMULA: sum over subscription_status IN ('active','past_due') of
 *   (plan is yearly → yearly_price / 12, else → monthly price).
 * Only subscription_status IN ('active','past_due') counts; trialing pays $0
 * until it converts; payment_state='complimentary' is always excluded.
 * Known imprecision: grandfathered Solo accounts billed at $15 read as $20 —
 * the DB cannot tell them apart from $20 signups.
 */
const RESTAURANT_PLAN_MRR: Record<string, number> = {
  solo: 20,
  venue: 39,
  monthly: 30,
  standard: 30,
  bundle: 25,
  yearly: 199 / 12,
  // Yearly plans (written by create-checkout-session when billingInterval='year')
  solo_yearly: 199 / 12, // $16.58
  venue_yearly: 390 / 12, // $32.50
};

const PERSONAL_PLAN_MRR: Record<string, number> = {
  monthly: 20,
  yearly: 199 / 12,
};



const EMPTY_COUNTS: OverviewCounts = {
  personalTotal: 0,
  restaurantTotal: 0,
  activeSubs: 0,
  trialing: 0,
  newLast7: 0,
  pendingApproval: 0,
  changesRequested: 0,
  printAwaiting: 0,
  repAppsPending: 0,
  demoRequestsPending: 0,
  taxPending: 0,
  unpaidCommissions: 0,
  trialsExpiring7d: 0,
  errors24h: 0,
  smsSubscribers: 0,
  vanSalesToday: 0,
};

const EMPTY_FULFILLMENT: FulfillmentSummary = {
  needsReview: 0,
  toPrint: 0,
  toDeliver: 0,
};

const sinceFor = (range: EngagementRange): string | null => {
  if (range === "all") return null;
  const d = new Date();
  if (range === "today") d.setHours(0, 0, 0, 0);
  else d.setDate(d.getDate() - 30);
  return d.toISOString();
};

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};

const daysAhead = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
};

/** Start of today on the admin's own clock (local midnight), ISO. */
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

type CountQuery = { count: number | null };

const num = (r: PromiseSettledResult<CountQuery>) =>
  r.status === "fulfilled" ? r.value.count ?? 0 : 0;

/** The admin's own timezone, so "today" means today on their clock. */
const browserTz = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};

export function useAdminOverview(enabled: boolean, range: EngagementRange, dailyDays = 30) {
  const [counts, setCounts] = useState<OverviewCounts>(EMPTY_COUNTS);
  const [engagement, setEngagement] = useState<OverviewEngagement | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [engagementLoading, setEngagementLoading] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [daily, setDaily] = useState<DailyPoint[]>([]);
  const [dailyLoading, setDailyLoading] = useState(true);
  const [lastEventAt, setLastEventAt] = useState<string | null>(null);

  const [health, setHealth] = useState<HealthSummary>({
    total: 0,
    ok: 0,
    broken: 0,
    pending: 0,
    brokenSlugs: [],
    running: false,
    lastCheckedAt: null,
  });
  const healthRunning = useRef(false);

  const [linkHealth, setLinkHealth] = useState<LinkHealth>({
    totalLinks: 0,
    brokenLinks: 0,
    needsAttention: 0,
    hubsWithBroken: 0,
    breakdown: {
      healthy: 0,
      redirected: 0,
      confirmed_broken: 0,
      server_error: 0,
      tls_error: 0,
      timeout: 0,
      blocked_unverifiable: 0,
      malformed: 0,
      false_positive: 0,
    },
    worst: [],
    lastCheckedAt: null,
    running: false,
  });

  /* ---------------- command center state ---------------- */
  const [mrr, setMrr] = useState<MrrInfo | null>(null);
  const [mrrLoading, setMrrLoading] = useState(true);
  const [trials, setTrials] = useState<TrialAccount[]>([]);
  const [followupsDue, setFollowupsDue] = useState<FollowupDue[]>([]);
  const [pipelineLoading, setPipelineLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [atRisk, setAtRisk] = useState<AtRiskRow[]>([]);
  const [atRiskLoading, setAtRiskLoading] = useState(true);
  const [fulfillment, setFulfillment] = useState<FulfillmentSummary>(EMPTY_FULFILLMENT);
  const [fulfillmentLoading, setFulfillmentLoading] = useState(true);

  /* ---------------- MRR + trial pipeline ---------------- */
  const loadMrr = useCallback(async () => {
    setMrrLoading(true);
    const [rb, pp] = await Promise.allSettled([
      supabase
        .from("restaurants")
        .select("plan_type, subscription_status, payment_state")
        .in("subscription_status", ["active", "past_due"]),
      supabase
        .from("personal_profiles")
        .select("plan_type, subscription_status")
        .in("subscription_status", ["active", "past_due"]),
    ]);
    let total = 0;
    let paying = 0;
    if (rb.status === "fulfilled") {
      for (const r of (rb.value.data ?? []) as { plan_type: string | null; payment_state: string | null }[]) {
        if (r.payment_state === "complimentary") continue;
        const amt = RESTAURANT_PLAN_MRR[r.plan_type ?? ""] ?? 0;
        total += amt;
        paying += 1;
      }
    }
    if (pp.status === "fulfilled") {
      for (const r of (pp.value.data ?? []) as { plan_type: string | null }[]) {
        total += PERSONAL_PLAN_MRR[r.plan_type ?? ""] ?? 0;
        paying += 1;
      }
    }
    setMrr({
      mrr: total,
      paying,
      trialsActive: counts.trialing,
      note: "Derived from plan prices in the DB — no Stripe sync table exists.",
    });
    setMrrLoading(false);
  }, [counts.trialing]);



  /* ---------------- counts + activity ---------------- */
  const loadCounts = useCallback(async () => {
    const pp = () => supabase.from("personal_profiles").select("id", { count: "exact", head: true });
    const rr = () => supabase.from("restaurants").select("id", { count: "exact", head: true });

    const results = await Promise.allSettled<CountQuery>([
      pp(),
      rr(),
      pp().eq("subscription_status", "active"),
      rr().eq("subscription_status", "active"),
      pp().eq("subscription_status", "trialing"),
      rr().eq("subscription_status", "trialing"),
      pp().gte("created_at", daysAgo(7)),
      rr().gte("created_at", daysAgo(7)),
      pp().eq("is_approved", false).eq("pipeline_status", "ready_for_review"),
      pp().eq("pipeline_status", "changes_requested"),
      pp().not("card_print_pdf_path", "is", null).in("print_status", ["not_downloaded", "downloaded"]),
      supabase.from("rep_applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("rep_demo_requests").select("id", { count: "exact", head: true }).eq("fulfilled", false),
      supabase.from("rep_tax_profiles").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("commissions").select("id", { count: "exact", head: true }).in("status", ["pending", "available"]),
      pp().eq("subscription_status", "trialing").gte("trial_ends_at", new Date().toISOString()).lte("trial_ends_at", daysAhead(7)),
      rr().eq("subscription_status", "trialing").gte("trial_ends_at", new Date().toISOString()).lte("trial_ends_at", daysAhead(7)),
      supabase.from("client_errors").select("id", { count: "exact", head: true }).gte("created_at", daysAgo(1)),
      supabase.from("restaurant_sms_subscribers").select("id", { count: "exact", head: true }).eq("sms_opt_in", true),
      // Van sales today: van-handoff sent since local midnight. Van sales are
      // active from day one and excluded from the trial pipeline by design,
      // so this is a separate count from Trials active.
      pp().not("van_handoff_sent_at", "is", null).gte("van_handoff_sent_at", startOfToday()),
    ] as unknown as Promise<CountQuery>[]);

    setCounts({
      personalTotal: num(results[0]),
      restaurantTotal: num(results[1]),
      activeSubs: num(results[2]) + num(results[3]),
      trialing: num(results[4]) + num(results[5]),
      newLast7: num(results[6]) + num(results[7]),
      pendingApproval: num(results[8]),
      changesRequested: num(results[9]),
      printAwaiting: num(results[10]),
      repAppsPending: num(results[11]),
      demoRequestsPending: num(results[12]),
      taxPending: num(results[13]),
      unpaidCommissions: num(results[14]),
      trialsExpiring7d: num(results[15]) + num(results[16]),
      errors24h: num(results[17]),
      smsSubscribers: num(results[18]),
      vanSalesToday: num(results[19]),
    });

    // Recent activity feed
    const [created, submitted, apps] = await Promise.allSettled([
      supabase
        .from("personal_profiles")
        .select("id, full_name, username, created_at, is_approved, pipeline_status")
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("personal_profiles")
        .select("id, full_name, username, submitted_for_review_at")
        .not("submitted_for_review_at", "is", null)
        .order("submitted_for_review_at", { ascending: false })
        .limit(10),
      supabase
        .from("rep_applications")
        .select("id, created_at, status")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const feed: ActivityItem[] = [];
    if (created.status === "fulfilled") {
      for (const r of created.value.data ?? []) {
        const row = r as { id: string; full_name: string | null; username: string | null; created_at: string; is_approved: boolean | null };
        feed.push({
          id: `new-${row.id}`,
          label: row.full_name || row.username || "New hub",
          detail: row.is_approved ? "Hub created · approved" : "Hub created",
          at: row.created_at,
          tone: "neutral",
          path: "/admin",
        });
      }
    }
    if (submitted.status === "fulfilled") {
      for (const r of submitted.value.data ?? []) {
        const row = r as { id: string; full_name: string | null; username: string | null; submitted_for_review_at: string };
        feed.push({
          id: `sub-${row.id}`,
          label: row.full_name || row.username || "Hub",
          detail: "Submitted for review",
          at: row.submitted_for_review_at,
          tone: "warn",
          path: "/admin",
        });
      }
    }
    if (apps.status === "fulfilled") {
      for (const r of apps.value.data ?? []) {
        const row = r as { id: string; created_at: string; status: string | null };
        feed.push({
          id: `app-${row.id}`,
          label: "Sales partner application",
          detail: `Status: ${row.status ?? "pending"}`,
          at: row.created_at,
          tone: row.status === "pending" ? "warn" : "good",
          path: "/admin/reps",
        });
      }
    }
    feed.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    setActivity(feed.slice(0, 15));

    setLoading(false);
    setLastUpdatedAt(new Date());
  }, []);

  /* ---------------- engagement ---------------- */
  const loadEngagement = useCallback(async () => {
    setEngagementLoading(true);
    const since = sinceFor(range);
    const { data, error } = await supabase.rpc("admin_account_engagement", {
      _since: since,
    } as never);
    if (error) {
      setEngagement(null);
      setEngagementLoading(false);
      return;
    }
    const rows = (data ?? []) as {
      taps: number | null;
      link_clicks: number | null;
      contact_saves: number | null;
      last_active_at: string | null;
    }[];
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    setEngagement({
      taps: rows.reduce((s, r) => s + Number(r.taps ?? 0), 0),
      clicks: rows.reduce((s, r) => s + Number(r.link_clicks ?? 0), 0),
      saves: rows.reduce((s, r) => s + Number(r.contact_saves ?? 0), 0),
      activeHubs: rows.filter((r) => r.last_active_at && new Date(r.last_active_at).getTime() >= cutoff).length,
    });
    setEngagementLoading(false);
  }, [range]);

  /* ---------------- daily series ---------------- */
  const loadDaily = useCallback(async () => {
    setDailyLoading(true);
    const { data, error } = await supabase.rpc("admin_engagement_daily", {
      _days: dailyDays,
      _tz: browserTz(),
    } as never);
    if (!error) {
      const rows = (data ?? []) as { day: string; taps: number | null; clicks: number | null; contact_saves: number | null }[];
      setDaily(
        rows.map((r) => ({
          day: r.day,
          taps: Number(r.taps ?? 0),
          clicks: Number(r.clicks ?? 0),
          saves: Number(r.contact_saves ?? 0),
        })),
      );
    }
    // Freshness signal: newest event across both analytics tables.
    const [pa, ae] = await Promise.allSettled([
      supabase.from("personal_analytics").select("created_at").order("created_at", { ascending: false }).limit(1),
      supabase.from("analytics_events").select("created_at").order("created_at", { ascending: false }).limit(1),
    ]);
    const stamps: string[] = [];
    if (pa.status === "fulfilled" && pa.value.data?.[0]) stamps.push(pa.value.data[0].created_at as string);
    if (ae.status === "fulfilled" && ae.value.data?.[0]) stamps.push(ae.value.data[0].created_at as string);
    stamps.sort();
    setLastEventAt(stamps.length ? stamps[stamps.length - 1] : null);
    setDailyLoading(false);
  }, [dailyDays]);

  /* ---------------- link health ---------------- */
  const loadLinkHealth = useCallback(async () => {
    const { data, error } = await supabase
      .from("hub_link_checks")
      .select(
        "hub_id, slug, label, url, status, classification, admin_review_state, http_status, detail, checked_at",
      );
    if (error) return;
    const rows = (data ?? []) as (BrokenLinkRow & { checked_at: string })[];

    // A link only counts as broken when the checker could prove it. 401/403/429
    // (blocked_unverifiable) never counts, and an admin false-positive override
    // always wins over the detected classification.
    const cls = (r: BrokenLinkRow) => r.classification ?? (r.status === "ok" ? "healthy" : "blocked_unverifiable");
    const overridden = (r: BrokenLinkRow) => r.admin_review_state === "false_positive";
    const confirmed = rows.filter((r) => !overridden(r) && ["confirmed_broken", "malformed"].includes(cls(r)));
    const attention = rows.filter(
      (r) => !overridden(r) && ["confirmed_broken", "malformed", "server_error", "tls_error", "timeout"].includes(cls(r)),
    );
    const n = (c: string) => rows.filter((r) => !overridden(r) && cls(r) === c).length;

    const newest = rows.reduce<string | null>(
      (acc, r) => (!acc || r.checked_at > acc ? r.checked_at : acc),
      null,
    );
    setLinkHealth((s) => ({
      ...s,
      totalLinks: rows.length,
      brokenLinks: confirmed.length,
      needsAttention: attention.length,
      hubsWithBroken: new Set(confirmed.map((b) => b.hub_id)).size,
      breakdown: {
        healthy: n("healthy"),
        redirected: n("redirected"),
        confirmed_broken: n("confirmed_broken"),
        server_error: n("server_error"),
        tls_error: n("tls_error"),
        timeout: n("timeout"),
        blocked_unverifiable: n("blocked_unverifiable"),
        malformed: n("malformed"),
        false_positive: rows.filter(overridden).length,
      },
      worst: attention.slice(0, 25),
      lastCheckedAt: newest ? new Date(newest) : null,
    }));
  }, []);


  const runLinkCheck = useCallback(async () => {
    setLinkHealth((s) => ({ ...s, running: true }));
    try {
      await supabase.functions.invoke("check-hub-links", { body: {} });
      await loadLinkHealth();
    } finally {
      setLinkHealth((s) => ({ ...s, running: false }));
    }
  }, [loadLinkHealth]);

  /* ---------------- health sweep ---------------- */
  const runHealth = useCallback(async () => {
    if (healthRunning.current) return;
    healthRunning.current = true;
    const { data, error } = await supabase.rpc("get_hub_health");
    if (error) {
      healthRunning.current = false;
      return;
    }
    const live = liveHubs((data ?? []) as HubRow[]);
    setHealth((h) => ({ ...h, total: live.length, ok: 0, broken: 0, pending: live.length, brokenSlugs: [], running: true }));

    const states = new Map<string, ProbeState>();
    await runHealthSweep(live, (row, state) => {
      states.set(hubKey(row), state);
      const all = Array.from(states.entries());
      const broken = all.filter(([, s]) => s.status === "error" || s.status === "empty");
      setHealth({
        total: live.length,
        ok: all.filter(([, s]) => s.status === "ok").length,
        broken: broken.length,
        pending: live.length - all.length,
        brokenSlugs: broken.map(([k, s]) => ({ slug: k.split(":")[1], detail: s.detail ?? s.status })),
        running: true,
        lastCheckedAt: null,
      });
    });

    setHealth((h) => ({ ...h, running: false, pending: 0, lastCheckedAt: new Date() }));
    healthRunning.current = false;
  }, []);

  const startOfDayUTC = (d: Date) => {
    const x = new Date(d.getTime());
    x.setUTCHours(0, 0, 0, 0);
    return x;
  };

  /* ---------------- trial pipeline + follow-ups due ----------------
     Mirrors trial-followup's targeting: trialing restaurants (not comped,
     created within 14 days) on nurture day 3/10/13 with no logged send. */
  const loadPipeline = useCallback(async () => {
    setPipelineLoading(true);
    const now = new Date();
    const todayUTC = startOfDayUTC(now);
    const cutoff14 = new Date(todayUTC.getTime() - 14 * 86400000).toISOString();

    const [rb, pp, logged] = await Promise.allSettled([
      supabase
        .from("restaurants")
        .select("id, restaurant_name, trial_ends_at, created_at, payment_state, phone")
        .eq("subscription_status", "trialing")
        .gte("created_at", cutoff14),
      supabase
        .from("personal_profiles")
        .select("id, full_name, username, trial_ends_at")
        .eq("subscription_status", "trialing")
        .gte("trial_ends_at", now.toISOString()),
      supabase
        .from("trial_nurture_log")
        .select("restaurant_id, day_number")
        .gte("sent_at", cutoff14),
    ]);

    const trialRows: TrialAccount[] = [];
    if (rb.status === "fulfilled") {
      for (const r of (rb.value.data ?? []) as {
        id: string; restaurant_name: string | null; trial_ends_at: string | null;
        created_at: string; payment_state: string | null; phone: string | null;
      }[]) {
        if (r.payment_state === "complimentary") continue;
        trialRows.push({
          id: r.id,
          kind: "business",
          name: r.restaurant_name || "Unnamed business",
          daysLeft: r.trial_ends_at
            ? Math.max(0, Math.ceil((new Date(r.trial_ends_at).getTime() - now.getTime()) / 86400000))
            : null,
          trialEndsAt: r.trial_ends_at,
        });
      }
    }
    if (pp.status === "fulfilled") {
      for (const r of (pp.value.data ?? []) as {
        id: string; full_name: string | null; username: string | null; trial_ends_at: string | null;
      }[]) {
        trialRows.push({
          id: r.id,
          kind: "solo",
          name: r.full_name || (r.username ? `@${r.username}` : "Unnamed hub"),
          daysLeft: r.trial_ends_at
            ? Math.max(0, Math.ceil((new Date(r.trial_ends_at).getTime() - now.getTime()) / 86400000))
            : null,
          trialEndsAt: r.trial_ends_at,
        });
      }
    }
    trialRows.sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999));
    setTrials(trialRows);

    // Follow-ups due: same candidate rule as the cron, minus already-logged.
    const loggedSet = new Set<string>();
    if (logged.status === "fulfilled") {
      for (const l of (logged.value.data ?? []) as { restaurant_id: string; day_number: number }[]) {
        loggedSet.add(`${l.restaurant_id}:${l.day_number}`);
      }
    }
    const due: FollowupDue[] = [];
    if (rb.status === "fulfilled") {
      for (const r of (rb.value.data ?? []) as {
        id: string; restaurant_name: string | null; created_at: string;
        payment_state: string | null; phone: string | null;
      }[]) {
        if (r.payment_state === "complimentary") continue;
        const ageDays = Math.floor(
          (todayUTC.getTime() - startOfDayUTC(new Date(r.created_at)).getTime()) / 86400000,
        );
        if (ageDays !== 3 && ageDays !== 10 && ageDays !== 13) continue;
        if (loggedSet.has(`${r.id}:${ageDays}`)) continue;
        due.push({
          id: r.id,
          name: r.restaurant_name || "Unnamed business",
          day: ageDays as 3 | 10 | 13,
          hasPhone: !!r.phone?.trim(),
        });
      }
    }
    setFollowupsDue(due);
    setPipelineLoading(false);
  }, []);

  /* ---------------- tap leaderboard (admin-only, last 30d vs prior) ---------------- */
  const loadLeaderboard = useCallback(async () => {
    setLeaderboardLoading(true);
    const now = new Date();
    const since30 = new Date(now.getTime() - 30 * 86400000).toISOString();
    const since60 = new Date(now.getTime() - 60 * 86400000).toISOString();

    const [cur, prior, names] = await Promise.allSettled([
      supabase.rpc("admin_account_engagement", { _since: since30 } as never),
      supabase.rpc("admin_account_engagement", { _since: since60 } as never),
      Promise.all([
        supabase.from("restaurants").select("id, restaurant_name"),
        supabase.from("personal_profiles").select("id, full_name, username"),
      ]),
    ]);

    const nameOf = (id: string, kind: "solo" | "business"): string => {
      if (names.status !== "fulfilled") return "Unnamed";
      const [rb, pp] = names.value;
      if (kind === "business") {
        const row = (rb.data ?? []).find((r) => (r as { id: string }).id === id) as
          | { restaurant_name: string | null }
          | undefined;
        return row?.restaurant_name || "Unnamed business";
      }
      const row = (pp.data ?? []).find((r) => (r as { id: string }).id === id) as
        | { full_name: string | null; username: string | null }
        | undefined;
      return row?.full_name || (row?.username ? `@${row.username}` : "Unnamed hub");
    };

    type EngRow = { hub_id: string; kind: string; taps: number | null };
    const toMap = (res: PromiseSettledResult<{ data: unknown }>) => {
      const m = new Map<string, { taps: number; kind: "solo" | "business" }>();
      if (res.status === "fulfilled") {
        for (const r of ((res.value as { data: EngRow[] }).data ?? []) as EngRow[]) {
          const key = `${r.kind}:${r.hub_id}`;
          const taps = Number(r.taps ?? 0);
          const entry = m.get(key) ?? { taps: 0, kind: r.kind === "solo" ? "solo" : "business" };
          entry.taps += taps;
          m.set(key, entry);
        }
      }
      return m;
    };
    const curMap = toMap(cur as PromiseSettledResult<{ data: unknown }>);
    const priorMap = toMap(prior as PromiseSettledResult<{ data: unknown }>);

    const rows: LeaderboardRow[] = [];
    for (const [key, entry] of curMap) {
      const [, id] = key.split(":");
      const priorTaps = priorMap.get(key)?.taps ?? 0;
      const trendPct =
        priorTaps > 0 ? Math.round(((entry.taps - priorTaps) / priorTaps) * 100) : null;
      rows.push({ id, kind: entry.kind, name: nameOf(id, entry.kind), taps: entry.taps, trendPct });
    }
    rows.sort((a, b) => b.taps - a.taps);
    setLeaderboard(rows.slice(0, 25));
    setLeaderboardLoading(false);
  }, []);

  /* ---------------- at-risk: past_due + canceled in last 14d ----------------
     Note: the stripe webhook never persists 'past_due' today (only 'active',
     'trialing', 'canceled'), so past_due rows will be empty until Stripe
     invoice.failed / subscription.updated(past_due) events are synced. There
     is also no synced invoices table, so per-account failed payments can't be
     listed from the DB. 'canceled' recency uses updated_at because the tables
     carry no canceled_at column — treat as approximate. */
  const loadAtRisk = useCallback(async () => {
    setAtRiskLoading(true);
    const since14 = daysAgo(14);
    const rows: AtRiskRow[] = [];
    const [rb, pp] = await Promise.allSettled([
      supabase
        .from("restaurants")
        .select("id, restaurant_name, subscription_status, payment_state, updated_at")
        .or("subscription_status.eq.past_due,and(subscription_status.eq.canceled,updated_at.gte." + since14 + ")"),
      supabase
        .from("personal_profiles")
        .select("id, full_name, username, subscription_status, updated_at")
        .or("subscription_status.eq.past_due,and(subscription_status.eq.canceled,updated_at.gte." + since14 + ")"),
    ]);
    if (rb.status === "fulfilled") {
      for (const r of (rb.value.data ?? []) as {
        id: string; restaurant_name: string | null; subscription_status: string | null;
        payment_state: string | null; updated_at: string | null;
      }[]) {
        if (r.payment_state === "complimentary") continue;
        rows.push({
          id: r.id,
          kind: "business",
          name: r.restaurant_name || "Unnamed business",
          reason: r.subscription_status === "past_due" ? "past_due" : "canceled",
          at: r.updated_at,
        });
      }
    }
    if (pp.status === "fulfilled") {
      for (const r of (pp.value.data ?? []) as {
        id: string; full_name: string | null; username: string | null;
        subscription_status: string | null; updated_at: string | null;
      }[]) {
        rows.push({
          id: r.id,
          kind: "solo",
          name: r.full_name || (r.username ? `@${r.username}` : "Unnamed hub"),
          reason: r.subscription_status === "past_due" ? "past_due" : "canceled",
          at: r.updated_at,
        });
      }
    }
    setAtRisk(rows);
    setAtRiskLoading(false);
  }, []);

  /* ---------------- fulfillment queues ---------------- */
  const loadFulfillment = useCallback(async () => {
    setFulfillmentLoading(true);
    const pp = () => supabase.from("personal_profiles").select("id", { count: "exact", head: true });
    const [review, print, deliver] = await Promise.allSettled<CountQuery>([
      pp().eq("is_approved", false).in("pipeline_status", ["draft", "ready_for_review", "changes_requested"]),
      pp().eq("pipeline_status", "approved"),
      pp().eq("pipeline_status", "activated"),
    ] as unknown as Promise<CountQuery>[]);
    setFulfillment({
      needsReview: num(review),
      toPrint: num(print),
      toDeliver: num(deliver),
    });
    setFulfillmentLoading(false);
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([
      loadCounts(),
      loadEngagement(),
      loadDaily(),
      loadLinkHealth(),
      loadMrr(),
      loadPipeline(),
      loadLeaderboard(),
      loadAtRisk(),
      loadFulfillment(),
    ]);
  }, [loadCounts, loadEngagement, loadDaily, loadLinkHealth, loadMrr, loadPipeline, loadLeaderboard, loadAtRisk, loadFulfillment]);

  /* ---------------- lifecycle ---------------- */
  useEffect(() => {
    if (!enabled) return;
    void loadCounts();
  }, [enabled, loadCounts]);

  useEffect(() => {
    if (!enabled) return;
    void loadEngagement();
  }, [enabled, loadEngagement]);

  useEffect(() => {
    if (!enabled) return;
    void loadDaily();
  }, [enabled, loadDaily]);

  useEffect(() => {
    if (!enabled) return;
    void loadLinkHealth();
  }, [enabled, loadLinkHealth]);

  useEffect(() => {
    if (!enabled) return;
    void runHealth();
  }, [enabled, runHealth]);

  useEffect(() => {
    if (!enabled) return;
    void loadMrr();
  }, [enabled, loadMrr]);

  useEffect(() => {
    if (!enabled) return;
    void loadPipeline();
  }, [enabled, loadPipeline]);

  useEffect(() => {
    if (!enabled) return;
    void loadLeaderboard();
  }, [enabled, loadLeaderboard]);

  useEffect(() => {
    if (!enabled) return;
    void loadAtRisk();
  }, [enabled, loadAtRisk]);

  useEffect(() => {
    if (!enabled) return;
    void loadFulfillment();
  }, [enabled, loadFulfillment]);

  // Poll while visible; pause in background tabs.
  useEffect(() => {
    if (!enabled) return;
    const tick = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const id: ReturnType<typeof setInterval> = setInterval(tick, 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [enabled, refresh]);

  return {
    counts,
    engagement,
    engagementLoading,
    daily,
    dailyLoading,
    lastEventAt,
    linkHealth,
    runLinkCheck,
    activity,
    loading,
    lastUpdatedAt,
    health,
    refresh,
    runHealth,
    // Command center
    mrr,
    mrrLoading,
    trials,
    followupsDue,
    pipelineLoading,
    leaderboard,
    leaderboardLoading,
    atRisk,
    atRiskLoading,
    fulfillment,
    fulfillmentLoading,
  };
}
