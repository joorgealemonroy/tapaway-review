import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { resolveDisplayName } from "@/lib/displayName";
import { isBrokenPlatformUrl } from "@/lib/brokenLinks";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import HubAnalyticsDialog, { HubAnalyticsTarget } from "@/components/admin/HubAnalyticsDialog";
import { toast } from "sonner";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  BarChart3,
  ExternalLink,
  FileText,
  Loader2,
  Search,
  Trash2,
} from "lucide-react";


type Kind = "legacy" | "lite";

type UnifiedRow = {
  id: string;
  kind: Kind;
  name: string;
  slug: string | null;
  plan_type: string | null;
  subscription_status: string | null;
  is_approved: boolean | null;
  created_at: string | null;
  photo_url: string | null;
  taps: number;
  clicks: number;
  lifetimeTaps: number;
  lastActiveAt: string | null;
  // For actions
  user_id?: string | null;
  sales_rep_id?: string | null;
  created_by_rep_id?: string | null;
  card_print_pdf_path?: string | null;
  broken_links?: number;
};

type SortKey = "taps" | "clicks" | "last_active" | "created_at" | "name";

const SORT_STORAGE_KEY = "admin-accounts-sort";
const RANGE_STORAGE_KEY = "admin-accounts-range";
type SortDir = "asc" | "desc";
type RangeKey = "today" | "30d" | "all";

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "30d", label: "30 days" },
  { key: "all", label: "All time" },
];

/**
 * "Today" is the start of the current UTC day (not a rolling 24h window) so the
 * daily view lines up with daily usage cycles. "30 days" stays rolling.
 */
const sinceForRange = (range: RangeKey): string | null => {
  if (range === "all") return null;
  if (range === "today") {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    return d.toISOString();
  }
  return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
};

const relativeTime = (iso: string | null) => {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
};

const ACTIVE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const isRecentlyActive = (iso: string | null) =>
  Boolean(iso && Date.now() - new Date(iso).getTime() <= ACTIVE_WINDOW_MS);

type EngagementRow = {
  hub_id: string;
  kind: string;
  taps: number;
  link_clicks: number;
  contact_saves: number;
  last_active_at: string | null;
};

const kindLabel: Record<Kind, string> = {
  legacy: "Business",
  lite: "Solo",
};


const AdminUnifiedAccountsTable = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<UnifiedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | Kind>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [brokenOnly, setBrokenOnly] = useState(false);
  const [zeroTapsOnly, setZeroTapsOnly] = useState(false);
  const [range, setRange] = useState<RangeKey>(() => {
    try {
      const raw = localStorage.getItem(RANGE_STORAGE_KEY) as RangeKey | null;
      return raw === "today" || raw === "30d" || raw === "all" ? raw : "30d";
    } catch {
      return "30d";
    }
  });
  // Sort preference persists across pagination, tab switches and reloads.
  const [sortKey, setSortKey] = useState<SortKey>(() => {
    try {
      const raw = localStorage.getItem(SORT_STORAGE_KEY);
      const k = raw ? (JSON.parse(raw).key as SortKey) : null;
      return k === "taps" || k === "clicks" || k === "last_active" || k === "created_at" || k === "name"
        ? k
        : "taps";
    } catch {
      return "taps";
    }
  });
  const [sortDir, setSortDir] = useState<SortDir>(() => {
    try {
      const raw = localStorage.getItem(SORT_STORAGE_KEY);
      const d = raw ? (JSON.parse(raw).dir as SortDir) : null;
      return d === "asc" ? "asc" : "desc";
    } catch {
      return "desc";
    }
  });
  const [deleting, setDeleting] = useState<string | null>(null);
  const [analyticsTarget, setAnalyticsTarget] = useState<HubAnalyticsTarget | null>(null);


  useEffect(() => {
    try {
      localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify({ key: sortKey, dir: sortDir }));
    } catch {
      /* storage unavailable — sorting still works, just not persisted */
    }
  }, [sortKey, sortDir]);

  useEffect(() => {
    try {
      localStorage.setItem(RANGE_STORAGE_KEY, range);
    } catch {
      /* storage unavailable — range still works, just not persisted */
    }
  }, [range]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Restaurants (legacy)
        const { data: restaurants, error: rErr } = await supabase
          .from("restaurants")
          .select(
            "id, restaurant_name, custom_slug, plan_type, subscription_status, is_approved, created_at, logo_url"
          );
        if (rErr) throw rErr;

        // Personal profiles (Solo) — hide unapproved rep demos (in queue instead)
        const { data: profiles, error: pErr } = await supabase
          .from("personal_profiles")
          .select(
            "id, user_id, username, full_name, plan_type, subscription_status, is_approved, created_at, profile_photo_url, sales_rep_id, created_by_rep_id, card_print_pdf_path"
          );
        if (pErr) throw pErr;

        const profileIds = (profiles ?? []).map((p) => p.id);

        // Engagement is aggregated server-side: avoids the 1k row cap and makes
        // the range switch cheap. Lifetime is fetched alongside so the
        // "never tapped" churn tile stays lifetime-accurate whatever the range.
        const since = sinceForRange(range);
        const [rangeRes, lifetimeRes] = await Promise.all([
          supabase.rpc("admin_account_engagement", { _since: since }),
          since === null
            ? Promise.resolve({ data: null, error: null } as const)
            : supabase.rpc("admin_account_engagement", { _since: null }),
        ]);
        if (rangeRes.error) throw rangeRes.error;
        if (lifetimeRes.error) throw lifetimeRes.error;

        const rangeStats: Record<string, EngagementRow> = {};
        ((rangeRes.data ?? []) as EngagementRow[]).forEach((e) => {
          rangeStats[e.hub_id] = e;
        });
        const lifetimeStats: Record<string, EngagementRow> = {};
        ((lifetimeRes.data ?? (rangeRes.data as unknown) ?? []) as EngagementRow[]).forEach((e) => {
          lifetimeStats[e.hub_id] = e;
        });

        // Broken social links (legacy recursive-URL bug), per Solo profile
        const brokenMap: Record<string, number> = {};
        if (profileIds.length > 0) {
          const { data: links } = await supabase
            .from("personal_links")
            .select("profile_id, link_type, url")
            .in("profile_id", profileIds);
          (links ?? []).forEach((l: any) => {
            if (isBrokenPlatformUrl(l)) brokenMap[l.profile_id] = (brokenMap[l.profile_id] ?? 0) + 1;
          });
        }

        const legacyRows: UnifiedRow[] = (restaurants ?? []).map((r) => ({
          id: r.id,
          kind: "legacy",
          name: resolveDisplayName({
            business_name: r.restaurant_name,
            slug: r.custom_slug,
          }),
          slug: r.custom_slug ?? null,
          plan_type: r.plan_type ?? null,
          subscription_status: r.subscription_status ?? null,
          is_approved: r.is_approved ?? null,
          created_at: r.created_at ?? null,
          photo_url: r.logo_url ?? null,
          taps: rangeStats[r.id]?.taps ?? 0,
          clicks: rangeStats[r.id]?.link_clicks ?? 0,
          lifetimeTaps: lifetimeStats[r.id]?.taps ?? 0,
          lastActiveAt: rangeStats[r.id]?.last_active_at ?? null,
        }));

        const liteRows: UnifiedRow[] = (profiles ?? [])
          // Quarantine unapproved rep-built demos to the approval queue only
          .filter((p) => {
            const isRepDemo = Boolean(p.sales_rep_id || p.created_by_rep_id);
            if (isRepDemo && p.is_approved !== true) return false;
            return true;
          })
          .map((p) => ({
            id: p.id,
            kind: "lite",
            name: resolveDisplayName({
              full_name: p.full_name,
              username: p.username,
            }),
            slug: p.username ?? null,
            plan_type: p.plan_type ?? null,
            subscription_status: p.subscription_status ?? null,
            is_approved: p.is_approved ?? null,
            created_at: p.created_at ?? null,
            photo_url: p.profile_photo_url ?? null,
            taps: rangeStats[p.id]?.taps ?? 0,
            clicks: rangeStats[p.id]?.link_clicks ?? 0,
            lifetimeTaps: lifetimeStats[p.id]?.taps ?? 0,
            lastActiveAt: rangeStats[p.id]?.last_active_at ?? null,
            user_id: p.user_id,
            sales_rep_id: p.sales_rep_id,
            created_by_rep_id: p.created_by_rep_id,
            card_print_pdf_path: (p as any).card_print_pdf_path ?? null,
            broken_links: brokenMap[p.id] ?? 0,
          }));

        setRows([...legacyRows, ...liteRows]);
      } catch (e) {
        console.error(e);
        toast.error("Failed to load accounts");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [range]);


  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (kindFilter !== "all" && r.kind !== kindFilter) return false;
        if (statusFilter !== "all" && r.subscription_status !== statusFilter) return false;
        if (brokenOnly && !(r.broken_links && r.broken_links > 0)) return false;
        if (zeroTapsOnly && r.lifetimeTaps > 0) return false;
        if (s) {
          const hay = `${r.name} ${r.slug ?? ""}`.toLowerCase();
          if (!hay.includes(s)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const dir = sortDir === "asc" ? 1 : -1;
        if (sortKey === "taps") return (a.taps - b.taps) * dir;
        if (sortKey === "clicks") return (a.clicks - b.clicks) * dir;
        if (sortKey === "last_active") {
          const at = a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0;
          const bt = b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0;
          return (at - bt) * dir;
        }
        if (sortKey === "name") return a.name.localeCompare(b.name) * dir;
        const at = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
        return (at - bt) * dir;
      });
  }, [rows, search, kindFilter, statusFilter, brokenOnly, zeroTapsOnly, sortKey, sortDir]);

  const summary = useMemo(() => {
    const scoped = rows.filter((r) => (kindFilter === "all" ? true : r.kind === kindFilter));
    return {
      taps: scoped.reduce((n, r) => n + r.taps, 0),
      clicks: scoped.reduce((n, r) => n + r.clicks, 0),
      activeHubs: scoped.filter((r) => r.taps > 0).length,
      neverTapped: scoped.filter((r) => r.lifetimeTaps === 0).length,
    };
  }, [rows, kindFilter]);



  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };

  const openHub = (r: UnifiedRow) => {
    if (!r.slug) return;
    window.open(`/${r.slug}`, "_blank", "noopener,noreferrer");
  };

  const openDashboard = (r: UnifiedRow) => {
    if (r.kind === "legacy") {
      navigate(`/dashboard?admin_view=${r.id}`);
    } else {
      navigate(`/dashboard?admin_view_personal=${r.id}`);
    }
  };

  const downloadPdf = async (r: UnifiedRow) => {
    if (!r.card_print_pdf_path) return;
    try {
      const { data, error } = await supabase.storage
        .from("card-print-files")
        .download(r.card_print_pdf_path);
      if (error || !data) throw error ?? new Error("Empty download");
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      const base = `${r.slug || r.id}-print`;
      a.download = base.toLowerCase().endsWith(".pdf") ? base : `${base}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      console.error("Download failed", e);
      toast.error("Download failed: " + (e instanceof Error ? e.message : "unknown"));
    }
  };

  const remove = async (r: UnifiedRow) => {
    if (!window.confirm(`Delete ${r.name}? This is permanent.`)) return;
    setDeleting(r.id);
    try {
      if (r.kind === "legacy") {
        const { data, error } = await supabase.functions.invoke("delete-user-complete", {
          body: { restaurantId: r.id },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error as string);
      } else {
        await supabase.from("personal_blocks").delete().eq("profile_id", r.id);
        await supabase.from("personal_links").delete().eq("profile_id", r.id);
        await supabase.from("personal_analytics").delete().eq("profile_id", r.id);
        const { error } = await supabase.from("personal_profiles").delete().eq("id", r.id);
        if (error) throw error;
      }
      setRows((prev) => prev.filter((x) => x.id !== r.id));
      toast.success("Deleted");
    } catch (e) {
      toast.error("Delete failed: " + (e instanceof Error ? e.message : "unknown"));
    } finally {
      setDeleting(null);
    }
  };

  const HeaderCell = ({
    label,
    k,
    className = "",
  }: {
    label: string;
    k?: SortKey;
    className?: string;
  }) => {
    const active = sortKey === k;
    const hint =
      k === "taps"
        ? active && sortDir === "desc"
          ? "Sort least taps first"
          : "Sort most taps first"
        : k === "created_at"
        ? active && sortDir === "desc"
          ? "Sort oldest first"
          : "Sort newest first"
        : active && sortDir === "asc"
        ? "Sort Z to A"
        : "Sort A to Z";
    return (
      <th className={`p-2.5 text-left font-medium ${className}`}>
        {k ? (
          <button
            onClick={() => toggleSort(k)}
            title={hint}
            className="inline-flex items-center gap-1 hover:text-white transition-colors"
          >
            {label}
            {active ? (
              sortDir === "asc" ? (
                <ArrowUp className="h-3 w-3 text-white" />
              ) : (
                <ArrowDown className="h-3 w-3 text-white" />
              )
            ) : (
              <ArrowUpDown className="h-3 w-3 text-white/30" />
            )}
          </button>
        ) : (
          label
        )}
      </th>
    );
  };

  const rangeLabel = RANGES.find((r) => r.key === range)?.label ?? "";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-white/5 bg-white/[0.03] p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`px-3 h-8 rounded-md text-xs font-medium transition-colors ${
                range === r.key ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-white/35">Usage shown for: {rangeLabel}</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { label: `Taps · ${rangeLabel}`, value: summary.taps },
          { label: `Clicks · ${rangeLabel}`, value: summary.clicks },
          { label: `Hubs active · ${rangeLabel}`, value: summary.activeHubs },
        ].map((tile) => (
          <div key={tile.label} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <div className="text-[10px] uppercase tracking-wide text-white/40">{tile.label}</div>
            <div className="text-xl font-semibold text-white tabular-nums">
              {tile.value.toLocaleString()}
            </div>
          </div>
        ))}
        <button
          onClick={() => setZeroTapsOnly((v) => !v)}
          className={`text-left rounded-xl border p-3 transition-colors ${
            zeroTapsOnly
              ? "bg-rose-500/15 border-rose-400/40"
              : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04]"
          }`}
        >
          <div className="text-[10px] uppercase tracking-wide text-white/40">Never tapped</div>
          <div className="text-xl font-semibold text-white tabular-nums">
            {summary.neverTapped.toLocaleString()}
          </div>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">

        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
          <Input
            placeholder="Search name or slug"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-8 bg-white/[0.03] border-white/5 text-white placeholder:text-white/30"
          />
        </div>
        <Select value={kindFilter} onValueChange={(v) => setKindFilter(v as typeof kindFilter)}>
          <SelectTrigger className="h-9 w-[140px] bg-white/[0.03] border-white/5 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="legacy">Business (Legacy)</SelectItem>
            <SelectItem value="lite">Solo</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[140px] bg-white/[0.03] border-white/5 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="trialing">Trialing</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="canceled">Canceled</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
        <button
          onClick={() => setBrokenOnly((v) => !v)}
          className={`h-9 px-3 rounded-md text-xs font-medium border transition-colors ${
            brokenOnly
              ? "bg-rose-500/15 border-rose-400/40 text-rose-200"
              : "bg-white/[0.03] border-white/5 text-white/60 hover:text-white/90"
          }`}
        >
          Broken links only
        </button>
        <span className="text-[11px] text-white/40 ml-auto">
          {filtered.length} of {rows.length}
        </span>

      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-10 justify-center text-white/50 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading accounts…
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/5">
          <table className="min-w-[1080px] w-full text-sm">
            <thead>
              <tr className="bg-white/[0.02] text-white/50 uppercase tracking-wide text-[11px]">
                <HeaderCell label="Account" k="name" />
                <HeaderCell label="Type" />
                <HeaderCell label="Slug" />
                <HeaderCell label="Taps" k="taps" className="text-right pr-4" />
                <HeaderCell label="Clicks" k="clicks" className="text-right pr-4" />
                <HeaderCell label="Last active" k="last_active" />
                <HeaderCell label="Links" />

                <HeaderCell label="Plan" />
                <HeaderCell label="Status" />

                <HeaderCell label="Created" k="created_at" />
                <th className="p-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={`${r.kind}-${r.id}`}
                  className="border-t border-white/5 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="p-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      {r.photo_url ? (
                        <img
                          src={r.photo_url}
                          alt=""
                          className="h-7 w-7 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-white/10 text-white/70 flex items-center justify-center text-[11px] shrink-0">
                          {r.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-medium text-white/90 truncate">{r.name}</div>
                        {r.slug && (
                          <div className="text-[10px] font-mono text-white/40 truncate">
                            @{r.slug}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-2.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] ${
                        r.kind === "lite"
                          ? "bg-sky-500/10 text-sky-300"
                          : "bg-violet-500/10 text-violet-300"
                      }`}
                    >
                      {kindLabel[r.kind]}
                    </span>
                  </td>
                  <td className="p-2.5 text-[11px] font-mono text-white/60">
                    {r.slug ?? "—"}
                  </td>
                  <td className="p-2.5 text-right pr-4 text-white/90 font-medium tabular-nums">
                    {r.taps.toLocaleString()}
                  </td>
                  <td className="p-2.5 text-right pr-4 text-white/70 tabular-nums">
                    {r.clicks.toLocaleString()}
                  </td>
                  <td className="p-2.5 text-xs text-white/60 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isRecentlyActive(r.lastActiveAt) ? "bg-emerald-400" : "bg-white/20"
                        }`}
                        title={isRecentlyActive(r.lastActiveAt) ? "Active (tapped in last 7 days)" : "Idle"}
                      />
                      {relativeTime(r.lastActiveAt)}
                    </span>
                  </td>

                  <td className="p-2.5">
                    {r.broken_links && r.broken_links > 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-rose-500/15 text-rose-300">
                        {r.broken_links} broken
                      </span>
                    ) : (
                      <span className="text-white/25 text-[11px]">—</span>
                    )}
                  </td>
                  <td className="p-2.5 text-white/60 text-xs">{r.plan_type ?? "—"}</td>

                  <td className="p-2.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] ${
                        r.subscription_status === "active"
                          ? "bg-emerald-500/10 text-emerald-300"
                          : r.subscription_status === "trialing"
                          ? "bg-amber-500/10 text-amber-300"
                          : r.subscription_status === "canceled" ||
                            r.subscription_status === "expired"
                          ? "bg-red-500/10 text-red-300"
                          : "bg-white/[0.04] text-white/50"
                      }`}
                    >
                      {r.subscription_status ?? "—"}
                    </span>
                  </td>
                  <td className="p-2.5 text-[11px] text-white/50">
                    {r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="p-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        onClick={() =>
                          setAnalyticsTarget({
                            id: r.id,
                            kind: r.kind,
                            name: r.name,
                            slug: r.slug,
                            photo_url: r.photo_url,
                            plan_type: r.plan_type,
                            subscription_status: r.subscription_status,
                            created_at: r.created_at,
                          })
                        }
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-sky-300/80 hover:text-sky-300 hover:bg-sky-500/10"
                        title="View analytics"
                      >
                        <BarChart3 className="h-3.5 w-3.5" />
                      </Button>
                      {r.slug && (
                        <Button
                          onClick={() => openHub(r)}
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-white/60 hover:text-white hover:bg-white/[0.05]"
                          title="Open live hub"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      )}

                      {r.kind === "lite" && r.card_print_pdf_path && (
                        <Button
                          onClick={() => downloadPdf(r)}
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-emerald-300/80 hover:text-emerald-300 hover:bg-emerald-500/10"
                          title="Download print PDF"
                        >
                          <FileText className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        onClick={() => openDashboard(r)}
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-[11px] text-white/70 hover:text-white hover:bg-white/[0.05]"
                      >
                        Dashboard
                      </Button>
                      <Button
                        onClick={() => remove(r)}
                        disabled={deleting === r.id}
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-red-400/70 hover:text-red-400 hover:bg-red-500/10"
                        title="Delete"
                      >
                        {deleting === r.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-xs text-white/40">
                    No accounts match filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <HubAnalyticsDialog target={analyticsTarget} onClose={() => setAnalyticsTarget(null)} />
    </div>
  );

};

export default AdminUnifiedAccountsTable;
