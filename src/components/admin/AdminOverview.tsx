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
  Printer,
  RefreshCw,
  ShieldAlert,
  Timer,
  Users,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { useAdminOverview, EngagementRange } from "@/hooks/useAdminOverview";


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

const AdminOverview = ({ onOpenAccounts }: { onOpenAccounts: () => void }) => {
  const navigate = useNavigate();
  const [range, setRange] = useState<EngagementRange>("30d");
  const { counts, engagement, engagementLoading, activity, loading, lastUpdatedAt, health, refresh, runHealth } =
    useAdminOverview(true, range);

  const totalHubs = counts.personalTotal + counts.restaurantTotal;

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
          <h2 className="text-white font-medium">Live Overview</h2>
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

      {/* Row 1 — live status band */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={`lg:col-span-2 rounded-xl border p-5 ${healthClasses}`}>
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

        <button
          onClick={() => navigate("/admin/errors")}
          className={`text-left rounded-xl border p-5 transition-colors ${
            counts.errors24h > 0
              ? "border-red-500/30 bg-red-500/[0.07] hover:bg-red-500/[0.1]"
              : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04]"
          }`}
        >
          <div className="text-xs uppercase tracking-widest text-white/40">App errors · 24h</div>
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

      {/* Row 2 — business KPIs */}
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

      {/* Engagement with range switch */}
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
      </Panel>

      {/* Row 3 — action queues */}
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
              className={`group flex items-center justify-between gap-2 px-3 py-3 rounded-lg border transition-all text-left ${
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

      {/* Row 4 — recent activity */}
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
    </div>
  );
};

export default AdminOverview;
