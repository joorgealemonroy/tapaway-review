import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
import { toast } from "sonner";
import {
  ArrowUpDown,
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
  // For actions
  user_id?: string | null;
  sales_rep_id?: string | null;
  created_by_rep_id?: string | null;
  card_print_pdf_path?: string | null;
  broken_links?: number;
};

type SortKey = "taps" | "created_at" | "name";
type SortDir = "asc" | "desc";

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
  const [sortKey, setSortKey] = useState<SortKey>("taps");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [deleting, setDeleting] = useState<string | null>(null);

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

        const restaurantIds = (restaurants ?? []).map((r) => r.id);
        const profileIds = (profiles ?? []).map((p) => p.id);

        // Legacy taps (analytics_events by restaurant_id)
        const tapsMapR: Record<string, number> = {};
        if (restaurantIds.length > 0) {
          const { data: taps } = await supabase
            .from("analytics_events")
            .select("restaurant_id")
            .eq("event_type", "tap")
            .in("restaurant_id", restaurantIds);
          (taps ?? []).forEach((t) => {
            tapsMapR[t.restaurant_id] = (tapsMapR[t.restaurant_id] ?? 0) + 1;
          });
        }

        // Personal taps
        const tapsMapP: Record<string, number> = {};
        if (profileIds.length > 0) {
          const { data: taps } = await supabase
            .from("personal_analytics")
            .select("profile_id")
            .eq("event_type", "tap")
            .in("profile_id", profileIds);
          (taps ?? []).forEach((t) => {
            tapsMapP[t.profile_id] = (tapsMapP[t.profile_id] ?? 0) + 1;
          });
        }

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
          name: r.restaurant_name ?? "(unnamed)",
          slug: r.custom_slug ?? null,
          plan_type: r.plan_type ?? null,
          subscription_status: r.subscription_status ?? null,
          is_approved: r.is_approved ?? null,
          created_at: r.created_at ?? null,
          photo_url: r.logo_url ?? null,
          taps: tapsMapR[r.id] ?? 0,
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
            name: p.full_name ?? p.username ?? "(unnamed)",
            slug: p.username ?? null,
            plan_type: p.plan_type ?? null,
            subscription_status: p.subscription_status ?? null,
            is_approved: p.is_approved ?? null,
            created_at: p.created_at ?? null,
            photo_url: p.profile_photo_url ?? null,
            taps: tapsMapP[p.id] ?? 0,
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
  }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (kindFilter !== "all" && r.kind !== kindFilter) return false;
        if (statusFilter !== "all" && r.subscription_status !== statusFilter) return false;
        if (brokenOnly && !(r.broken_links && r.broken_links > 0)) return false;
        if (s) {
          const hay = `${r.name} ${r.slug ?? ""}`.toLowerCase();
          if (!hay.includes(s)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const dir = sortDir === "asc" ? 1 : -1;
        if (sortKey === "taps") return (a.taps - b.taps) * dir;
        if (sortKey === "name") return a.name.localeCompare(b.name) * dir;
        const at = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
        return (at - bt) * dir;
      });
  }, [rows, search, kindFilter, statusFilter, brokenOnly, sortKey, sortDir]);


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
  }) => (
    <th className={`p-2.5 text-left font-medium ${className}`}>
      {k ? (
        <button
          onClick={() => toggleSort(k)}
          className="inline-flex items-center gap-1 hover:text-white transition-colors"
        >
          {label}
          <ArrowUpDown className={`h-3 w-3 ${sortKey === k ? "text-white" : "text-white/30"}`} />
        </button>
      ) : (
        label
      )}
    </th>
  );

  return (
    <div className="space-y-3">
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
          <table className="min-w-[900px] w-full text-sm">
            <thead>
              <tr className="bg-white/[0.02] text-white/50 uppercase tracking-wide text-[11px]">
                <HeaderCell label="Account" k="name" />
                <HeaderCell label="Type" />
                <HeaderCell label="Slug" />
                <HeaderCell label="Taps" k="taps" className="text-right pr-4" />
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
                      <span className="font-medium text-white/90 truncate">{r.name}</span>
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
                  <td colSpan={8} className="p-8 text-center text-xs text-white/40">
                    No accounts match filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminUnifiedAccountsTable;
