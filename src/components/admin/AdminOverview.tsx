import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  FileText,
  Link2,
  Loader2,
  MapPin,
  MousePointerClick,
  PackageCheck,
  Printer,
  RefreshCw,
  ShieldAlert,
  Timer,
  Users,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { useAdminOverview, EngagementRange } from "@/hooks/useAdminOverview";
import { STATUS_LABELS, StatusKey, useLocationIntel } from "@/hooks/useLocationIntel";
import MrrGoalBar from "./MrrGoalBar";
import TrialPipeline from "./TrialPipeline";
import TapLeaderboard from "./TapLeaderboard";
import AtRiskList from "./AtRiskList";


const Panel = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-xl border border-white/5 bg-white/[0.02] ${className}`}>{children}</div>
);

const Metric = ({
  label,
  value,
  sub,
  loading,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  loading?: boolean;
}) => (
  <Panel className="p-5">
    <div className="text-xs uppercase tracking-widest text-white/40">{label}</div>
    <div className="text-3xl font-semibold text-white mt-2 tabular-nums">
      {loading ? <span className="inline-block h-8 w-16 rounded bg-white/[0.06] animate-pulse" /> : value}
    </div>
    {sub && <div className="text-xs text-white/40 mt-1">{sub}</div>}
  </Panel>
);

const relative = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
};

const RANGES: { id: EngagementRange; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "30d", label: "30 days" },
  { id: "all", label: "All time" },
];

const DAY_RANGES = [7, 30, 90];

const dayLabel = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${Number(m)}/${Number(d)}`;
};

const AdminOverview = ({ onOpenAccounts }: { onOpenAccounts: () => void }) => {
  const navigate = useNavigate();
  const [range, setRange] = useState<EngagementRange>("30d");
  const [dailyDays, setDailyDays] = useState(30);
  const {
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
  } = useAdminOverview(true, range, dailyDays);

  const {
    counts: locCounts,
    loading: locLoading,
    error: locError,
    reload: reloadLocations,
  } = useLocationIntel(true);

  const totalHubs = counts.personalTotal + counts.restaurantTotal;
  const today = daily.length ? daily[daily.length - 1] : null;
  const yesterday = daily.length > 1 ? daily[daily.length - 2] : null;
  const deltaPct =
    today && yesterday && yesterday.taps > 0
      ? Math.round(((today.taps - yesterday.taps) / yesterday.taps) * 100)
      : null;


  const healthTone =
    health.broken > 0 ? "err" : health.running || health.pending > 0 ? "warn" : "ok";
  const healthClasses =
    healthTone === "err"
      ? "border-red-500/30 bg-red-500/[0.07]"
      : healthTone === "warn"
        ? "border-amber-500/25 bg-amber-500/[0.05]"
        : "border-emerald-500/25 bg-emerald-500/[0.05]";

  const queues = [
    { label: "Hubs pending approval", value: counts.pendingApproval, icon: ClipboardList, action: onOpenAccounts },
    { label: "Changes requested", value: counts.changesRequested, icon: AlertTriangle, action: onOpenAccounts },
    { label: "Cards awaiting print", value: counts.printAwaiting, icon: Printer, path: "/admin/print-queue" },
    { label: "Demos to review", value: fulfillmentLoading ? 0 : fulfillment.needsReview, icon: ClipboardList, path: "/admin/fulfillment" },
    { label: "Demos to print", value: fulfillmentLoading ? 0 : fulfillment.toPrint, icon: Printer, path: "/admin/fulfillment" },
    { label: "Demos to deliver", value: fulfillmentLoading ? 0 : fulfillment.toDeliver, icon: PackageCheck, path: "/admin/fulfillment" },
    { label: "Rep applications", value: counts.repAppsPending, icon: Users, path: "/admin/reps" },
    { label: "Demo kit requests", value: counts.demoRequestsPending, icon: ClipboardList, path: "/admin/demo-requests" },
    { label: "W-9s to review", value: counts.taxPending, icon: FileText, path: "/admin/tax-review" },
    { label: "Unpaid commissions", value: counts.unpaidCommissions, icon: DollarSign, path: "/admin/payouts" },
    { label: "Trials ending in 7d", value: counts.trialsExpiring7d, icon: Timer, action: onOpenAccounts },
  ];

  return (
    <div className="space-y-6">
      {/* Header / freshness */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-white font-medium">Command Center</h2>
          <p className="text-sm text-white/40">
            {lastUpdatedAt
              ? `Updated ${lastUpdatedAt.toLocaleTimeString()} · auto-refreshes every 60s`
              : "Loading live data…"}
          </p>
        </div>
        <Button
          onClick={() => void refresh()}
          variant="ghost"
          size="sm"
          className="text-white/70 hover:text-white hover:bg-white/[0.05] border border-white/5"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* 1 — MONEY: MRR + goal, trials active, van sales today, taps today */}
      <MrrGoalBar mrr={mrr} loading={mrrLoading} />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Metric
          label="Trials active"
          value={pipelineLoading ? null : trials.length}
          sub={`${followupsDue.length} follow-up${followupsDue.length === 1 ? "" : "s"} due today`}
          loading={pipelineLoading}
        />
        <Metric
          label="Van sales today"
          value={loading ? null : counts.vanSalesToday}
          sub="Paid on the spot — outside the trial pipeline"
          loading={loading}
        />
        <Metric
          label="Taps today"
          value={dailyLoading ? null : (today?.taps ?? 0).toLocaleString()}
          sub="Across all hubs"
          loading={dailyLoading}
        />
      </div>

      {/* 2 — TRIAL PIPELINE: who to close */}
      <TrialPipeline
        trials={trials}
        followupsDue={followupsDue}
        loading={pipelineLoading}
        onOpenAccounts={onOpenAccounts}
      />

      {/* 3 — NEEDS ACTION queues */}
      <Panel className="p-5">
        <div className="mb-3">
          <h3 className="text-white font-medium">Needs action</h3>
          <p className="text-sm text-white/40">Everything waiting on you right now.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {queues.map((q) => (
            <button
              key={q.label}
              onClick={() => (q.action ? q.action() : q.path && navigate(q.path))}
              className={`group flex items-center justify-between gap-2 px-3 py-3 rounded-lg border transition-all text-left min-h-[56px] ${
                q.value > 0
                  ? "border-primary/25 bg-primary/[0.06] hover:bg-primary/[0.1]"
                  : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04]"
              }`}
            >
              <span className="flex items-center gap-2 min-w-0">
                <q.icon className={`h-4 w-4 shrink-0 ${q.value > 0 ? "text-primary" : "text-white/40"}`} />
                <span className="text-xs text-white/70 group-hover:text-white truncate">{q.label}</span>
              </span>
              <span
                className={`text-sm font-semibold tabular-nums shrink-0 ${
                  q.value > 0 ? "text-white" : "text-white/30"
                }`}
              >
                {q.value}
              </span>
            </button>
          ))}
        </div>
      </Panel>

      {/* 3b — FULFILLMENT: one-tap entry to the pipeline board */}
      <Panel className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-white font-medium">Fulfillment</h3>
            <p className="text-sm text-white/40">
              {fulfillmentLoading
                ? "Loading queue…"
                : `${fulfillment.needsReview} to review · ${fulfillment.toPrint} to print · ${fulfillment.toDeliver} to deliver`}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="min-h-[44px]"
            onClick={() => navigate("/admin/fulfillment")}
          >
            Open pipeline <ArrowUpRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </Panel>

      {/* 3c — VIP SMS: opted-in subscriber count, links to the subscriber list */}
      <Panel className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-white font-medium flex items-center gap-2">
              VIP SMS subscribers
              <span className="text-2xl font-semibold text-white tabular-nums">
                {loading ? "—" : counts.smsSubscribers.toLocaleString()}
              </span>
            </h3>
            <p className="text-sm text-white/40">
              {loading
                ? "Loading…"
                : counts.smsSubscribers === 0
                  ? "No one has opted in yet"
                  : "Opted in across all restaurants"}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="min-h-[44px]"
            onClick={() => navigate("/admin/sms-subscribers")}
          >
            Open list <ArrowUpRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </Panel>

      {/* 4 — TAP LEADERBOARD (admin only) */}
      <TapLeaderboard
        leaderboard={leaderboard}
        loading={leaderboardLoading}
        onOpenAccounts={onOpenAccounts}
      />

      {/* 5 — AT RISK */}
      <AtRiskList atRisk={atRisk} loading={atRiskLoading} onOpenAccounts={onOpenAccounts} />

      {/* 6 — HUB HEALTH: problems scream here */}
      <div className={`rounded-xl border p-5 ${healthClasses}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {healthTone === "ok" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5" />
            ) : healthTone === "warn" ? (
              <Loader2 className="h-5 w-5 text-amber-400 mt-0.5 animate-spin" />
            ) : (
              <ShieldAlert className="h-5 w-5 text-red-400 mt-0.5" />
            )}
            <div>
              <div className="text-white font-medium">
                {health.broken > 0
                  ? `${health.broken} of ${health.total} live hubs are not reachable`
                  : health.running || health.pending > 0
                    ? `Checking ${health.total} live hubs…`
                    : health.total > 0
                      ? `All ${health.total} live hubs are reachable`
                      : "No live hubs to check"}
              </div>
              <div className="text-xs text-white/50 mt-1">
                Anonymous probes against the public endpoints ·{" "}
                {health.lastCheckedAt ? `checked ${relative(health.lastCheckedAt.toISOString())}` : "running now"}
              </div>
              {health.brokenSlugs.length > 0 && (
                <div className="mt-3 space-y-1">
                  {health.brokenSlugs.slice(0, 4).map((b) => (
                    <div key={b.slug} className="text-xs flex gap-2">
                      <span className="font-mono text-red-200">/{b.slug}</span>
                      <span className="text-red-200/70 truncate">{b.detail}</span>
                    </div>
                  ))}
                  {health.brokenSlugs.length > 4 && (
                    <div className="text-xs text-red-200/60">+{health.brokenSlugs.length - 4} more</div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => void runHealth()}
              disabled={health.running}
              size="sm"
              variant="ghost"
              className="text-white/70 hover:text-white hover:bg-white/[0.06] border border-white/10"
            >
              <Activity className="h-3.5 w-3.5 mr-2" />
              Run check
            </Button>
            <Button
              onClick={() => navigate("/admin/hub-health")}
              size="sm"
              variant="ghost"
              className="text-white/70 hover:text-white hover:bg-white/[0.06] border border-white/10"
            >
              Details
              <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* Link health band */}
      <div
        className={`rounded-xl border p-5 ${
          linkHealth.needsAttention > 0
            ? "border-amber-500/30 bg-amber-500/[0.06]"
            : "border-white/5 bg-white/[0.02]"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <Link2
              className={`h-5 w-5 mt-0.5 ${linkHealth.needsAttention > 0 ? "text-amber-400" : "text-emerald-400"}`}
            />
            <div className="min-w-0">
              <div className="text-white font-medium">
                {linkHealth.totalLinks === 0
                  ? "Links have not been checked yet"
                  : linkHealth.needsAttention > 0
                    ? `${linkHealth.needsAttention} of ${linkHealth.totalLinks} links need attention (${linkHealth.brokenLinks} confirmed broken across ${linkHealth.hubsWithBroken} hub${linkHealth.hubsWithBroken === 1 ? "" : "s"})`
                    : `All ${linkHealth.totalLinks} checkable links responded`}
              </div>
              <div className="text-xs text-white/50 mt-1">
                Every outbound link opened server-side ·{" "}
                {linkHealth.lastCheckedAt
                  ? `checked ${relative(linkHealth.lastCheckedAt.toISOString())}`
                  : "never run"}
              </div>
              {linkHealth.totalLinks > 0 && (
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-white/50">
                  <span className="text-emerald-300/80">{linkHealth.breakdown.healthy} healthy</span>
                  <span>{linkHealth.breakdown.redirected} redirected</span>
                  <span className="text-red-300/80">{linkHealth.breakdown.confirmed_broken} confirmed broken</span>
                  <span>{linkHealth.breakdown.server_error} server error</span>
                  <span>{linkHealth.breakdown.tls_error} TLS error</span>
                  <span>{linkHealth.breakdown.timeout} timeout</span>
                  <span>{linkHealth.breakdown.malformed} malformed</span>
                  <span className="text-white/40">
                    {linkHealth.breakdown.blocked_unverifiable} blocked / unverifiable
                  </span>
                  {linkHealth.breakdown.false_positive > 0 && (
                    <span className="text-white/40">{linkHealth.breakdown.false_positive} marked false positive</span>
                  )}
                </div>
              )}
              {linkHealth.worst.length > 0 && (
                <div className="mt-3 space-y-1">
                  {linkHealth.worst.slice(0, 5).map((b) => (
                    <div key={`${b.hub_id}-${b.url}`} className="text-xs flex gap-2 min-w-0">
                      <span className="font-mono text-amber-200 shrink-0">/{b.slug ?? "?"}</span>
                      <span className="text-white/50 shrink-0">{b.label}</span>
                      <span className="text-white/40 shrink-0">{b.classification ?? b.status}</span>
                      <span className="text-amber-200/70 truncate">{b.detail ?? ""}</span>
                    </div>
                  ))}
                  {linkHealth.worst.length > 5 && (
                    <div className="text-xs text-amber-200/60">+{linkHealth.worst.length - 5} more</div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => void runLinkCheck()}
              disabled={linkHealth.running}
              size="sm"
              variant="ghost"
              className="text-white/70 hover:text-white hover:bg-white/[0.06] border border-white/10"
            >
              {linkHealth.running ? (
                <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
              ) : (
                <Link2 className="h-3.5 w-3.5 mr-2" />
              )}
              Check links
            </Button>
            <Button
              onClick={() => navigate("/admin/hub-health")}
              size="sm"
              variant="ghost"
              className="text-white/70 hover:text-white hover:bg-white/[0.06] border border-white/10"
            >
              Details
              <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* Engagement detail (kept, below the do-today sections) */}
      <Panel className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-white font-medium">Engagement</h3>
            <p className="text-sm text-white/40">Same source as Accounts &amp; Hubs, so the numbers match.</p>
          </div>
          <div className="flex rounded-lg border border-white/5 bg-white/[0.02] p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.id}
                onClick={() => setRange(r.id)}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                  range === r.id ? "bg-white/[0.08] text-white" : "text-white/50 hover:text-white/80"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Taps", value: engagement?.taps ?? 0 },
            { label: "Clicks", value: engagement?.clicks ?? 0 },
            { label: "Contact saves", value: engagement?.saves ?? 0 },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-xs uppercase tracking-widest text-white/40">{s.label}</div>
              <div className="text-2xl font-semibold text-white mt-1 tabular-nums">
                {engagementLoading ? (
                  <span className="inline-block h-7 w-14 rounded bg-white/[0.06] animate-pulse" />
                ) : (
                  s.value.toLocaleString()
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Day-by-day activity */}
        <div className="mt-6 pt-5 border-t border-white/5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h4 className="text-white text-sm font-medium">Daily taps &amp; clicks</h4>
              <p className="text-xs text-white/40">
                {lastEventAt ? `Last event received ${relative(lastEventAt)}` : "No events recorded yet"} · your local
                timezone
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-widest text-white/40">Today so far</div>
                <div className="text-lg font-semibold text-white tabular-nums">
                  {(today?.taps ?? 0).toLocaleString()}
                  <span className="text-xs text-white/40 font-normal"> taps</span>
                  {deltaPct !== null && (
                    <span className={`ml-2 text-xs ${deltaPct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {deltaPct >= 0 ? "+" : ""}
                      {deltaPct}%
                    </span>
                  )}
                </div>
              </div>
              <div className="flex rounded-lg border border-white/5 bg-white/[0.02] p-0.5">
                {DAY_RANGES.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDailyDays(d)}
                    className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                      dailyDays === d ? "bg-white/[0.08] text-white" : "text-white/50 hover:text-white/80"
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="h-56">
            {dailyLoading ? (
              <div className="h-full rounded-lg bg-white/[0.03] animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={daily} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tickFormatter={dayLabel}
                    tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                    minTickGap={16}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                    contentStyle={{
                      background: "#0a0e1a",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "rgba(255,255,255,0.6)" }}
                  />
                  <Bar dataKey="taps" name="Taps" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="clicks" name="Clicks" fill="rgba(255,255,255,0.28)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </Panel>

      {/* Business KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric
          label="Total hubs"
          value={totalHubs}
          sub={`${counts.personalTotal} Solo · ${counts.restaurantTotal} Business`}
          loading={loading}
        />
        <Metric
          label="Active subscriptions"
          value={counts.activeSubs}
          sub={`${counts.trialing} on trial`}
          loading={loading}
        />
        <Metric label="New hubs · 7d" value={counts.newLast7} sub="Created this week" loading={loading} />
        <Metric
          label="Hubs active · 7d"
          value={engagement?.activeHubs ?? 0}
          sub="Tapped in the last 7 days"
          loading={engagementLoading}
        />
      </div>

      {/* Recent activity */}
      <Panel className="p-5">
        <div className="mb-3">
          <h3 className="text-white font-medium">Recent activity</h3>
          <p className="text-sm text-white/40">Newest hub, submission and partner events.</p>
        </div>
        {loading ? (
          <div className="py-6 text-center text-white/40 text-sm">Loading…</div>
        ) : activity.length === 0 ? (
          <div className="py-6 text-center text-white/40 text-sm">No recent activity.</div>
        ) : (
          <div className="divide-y divide-white/5">
            {activity.map((a) => (
              <button
                key={a.id}
                onClick={() => a.path && navigate(a.path)}
                className="w-full flex items-center justify-between gap-3 py-2.5 text-left hover:bg-white/[0.02] rounded px-1"
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                      a.tone === "good" ? "bg-emerald-400" : a.tone === "warn" ? "bg-amber-400" : "bg-white/30"
                    }`}
                  />
                  <span className="text-sm text-white/80 truncate">{a.label}</span>
                  <span className="text-xs text-white/40 truncate hidden sm:inline">{a.detail}</span>
                </span>
                <span className="text-xs text-white/35 shrink-0">{relative(a.at)}</span>
              </button>
            ))}
          </div>
        )}
      </Panel>

      {/* Location classification (kept at the bottom) */}
      <Panel className="p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <div className="text-white font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4 text-emerald-400" /> Location classification
            </div>
            <div className="text-xs text-white/40">
              Access and payment classification from the location system · does not affect MRR reporting
            </div>
          </div>
          <Button
            onClick={() => navigate("/admin/locations")}
            size="sm"
            variant="ghost"
            className="text-white/70 hover:text-white hover:bg-white/[0.06] border border-white/10"
          >
            Open Locations <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
        {locError ? (
          <div className="text-sm text-red-300">
            Couldn't load location classification.{" "}
            <button className="underline" onClick={() => void reloadLocations()}>Retry</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {(Object.keys(STATUS_LABELS) as StatusKey[]).map((key) => (
              <button
                key={key}
                onClick={() => navigate(`/admin/locations?status=${key}`)}
                className="text-left rounded-lg border border-white/5 bg-white/[0.02] p-3 hover:bg-white/[0.04] transition-colors"
              >
                <div className="text-[10px] uppercase tracking-widest text-white/40">{STATUS_LABELS[key]}</div>
                <div className="text-xl font-semibold text-white mt-1 tabular-nums">
                  {locLoading ? (
                    <span className="inline-block h-5 w-8 rounded bg-white/[0.06] animate-pulse" />
                  ) : (
                    locCounts[key]
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </Panel>

      {/* App errors */}
      <button
        onClick={() => navigate("/admin/errors")}
        className={`text-left rounded-xl border p-5 transition-colors w-full ${
          counts.errors24h > 0
            ? "border-red-500/30 bg-red-500/[0.07] hover:bg-red-500/[0.1]"
            : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04]"
        }`}
      >
        <div className="text-xs uppercase tracking-widest text-white/40 flex items-center gap-1.5">
          <MousePointerClick className="h-3.5 w-3.5" /> App errors · 24h
        </div>
        <div
          className={`text-3xl font-semibold mt-2 tabular-nums ${
            counts.errors24h > 0 ? "text-red-300" : "text-white"
          }`}
        >
          {counts.errors24h}
        </div>
        <div className="text-xs text-white/40 mt-1">
          {counts.errors24h > 0 ? "Open the error log" : "No crashes captured"}
        </div>
      </button>
    </div>
  );
};

export default AdminOverview;
