import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import JSZip from "jszip";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useAdminGuard } from "@/hooks/useAdminGuard";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ExtendTrialDialog, { ExtendTrialTarget } from "@/components/admin/ExtendTrialDialog";
import EditHubDrawer, { EditHubTarget } from "@/components/admin/EditHubDrawer";
import { resolveDisplayName } from "@/lib/displayName";
import { resolveLocation } from "@/lib/resolveLocation";
import { buildRoutePlan } from "@/lib/routeOptimizer";
import {
  ArrowLeft,
  Loader2,
  Search,
  FileText,
  Printer,
  PackageCheck,
  CalendarClock,
  Download,
  MoreVertical,
  RefreshCw,
  StickyNote,
  ExternalLink,
  Pencil,
  Map as MapIcon,
  ClipboardList,
  MapPin,
  AlertTriangle,
} from "lucide-react";

type PrintStatus = "not_downloaded" | "downloaded" | "printed" | "delivered";
type TabId = "new" | "downloaded" | "printed" | "delivered" | "all";

interface Row {
  id: string;
  full_name: string | null;
  username: string | null;
  profile_photo_url: string | null;
  submitted_for_review_at: string | null;
  created_at: string | null;
  trial_ends_at: string | null;
  trial_extension_days: number;
  card_print_pdf_path: string | null;
  print_status: PrintStatus;
  print_notes: string | null;
  sales_rep_id: string | null;
  is_approved: boolean | null;
  google_place_id: string | null;
  formatted_address: string | null;
  contact_address: string | null;
  place_city: string | null;
  place_state: string | null;
  place_zip: string | null;
  rep_name?: string | null;
}

const STATUS_META: Record<PrintStatus, { label: string; dot: string; chip: string }> = {
  not_downloaded: {
    label: "New",
    dot: "bg-amber-400",
    chip: "bg-amber-500/10 text-amber-200 border-amber-500/30",
  },
  downloaded: {
    label: "Downloaded",
    dot: "bg-sky-400",
    chip: "bg-sky-500/10 text-sky-200 border-sky-500/30",
  },
  printed: {
    label: "Printed",
    dot: "bg-violet-400",
    chip: "bg-violet-500/10 text-violet-200 border-violet-500/30",
  },
  delivered: {
    label: "Delivered",
    dot: "bg-emerald-400",
    chip: "bg-emerald-500/10 text-emerald-200 border-emerald-500/30",
  },
};

const TABS: { id: TabId; label: string; match: (s: PrintStatus) => boolean }[] = [
  { id: "new", label: "New", match: (s) => s === "not_downloaded" },
  { id: "downloaded", label: "Downloaded", match: (s) => s === "downloaded" },
  { id: "printed", label: "Printed", match: (s) => s === "printed" },
  { id: "delivered", label: "Delivered", match: (s) => s === "delivered" },
  { id: "all", label: "All", match: () => true },
];

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—";

const daysBetween = (iso: string | null) => {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

const daysUntil = (iso: string | null) => {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const AdminPrintQueue = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminAccess();

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>("new");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [extendTarget, setExtendTarget] = useState<ExtendTrialTarget | ExtendTrialTarget[] | null>(null);
  const [editTarget, setEditTarget] = useState<EditHubTarget | null>(null);
  const [noteTarget, setNoteTarget] = useState<Row | null>(null);
  const [noteText, setNoteText] = useState("");

  useAdminGuard();


  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("personal_profiles")
        .select(
          "id, full_name, username, profile_photo_url, submitted_for_review_at, created_at, trial_ends_at, trial_extension_days, card_print_pdf_path, print_status, print_notes, sales_rep_id, is_approved, google_place_id, formatted_address, contact_address, place_city, place_state, place_zip"
        )
        .not("card_print_pdf_path", "is", null)
        .order("submitted_for_review_at", { ascending: true, nullsFirst: false });
      if (error) throw error;

      const repIds = Array.from(
        new Set((data ?? []).map((r) => r.sales_rep_id).filter(Boolean) as string[])
      );
      let repMap: Record<string, string> = {};
      if (repIds.length > 0) {
        const { data: reps } = await supabase.from("sales_reps").select("id, name").in("id", repIds);
        repMap = Object.fromEntries((reps ?? []).map((r) => [r.id, r.name ?? ""]));
      }

      setRows(
        (data ?? []).map((r) => ({
          ...(r as Row),
          rep_name: r.sales_rep_id ? repMap[r.sales_rep_id] ?? null : null,
        }))
      );
      setSelected(new Set());
    } catch (e) {
      console.error(e);
      toast.error("Failed to load print queue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  const counts = useMemo(() => {
    const c: Record<TabId, number> = { new: 0, downloaded: 0, printed: 0, delivered: 0, all: rows.length };
    rows.forEach((r) => {
      if (r.print_status === "not_downloaded") c.new++;
      else if (r.print_status === "downloaded") c.downloaded++;
      else if (r.print_status === "printed") c.printed++;
      else if (r.print_status === "delivered") c.delivered++;
    });
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    const tabFn = TABS.find((t) => t.id === tab)!.match;
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (!tabFn(r.print_status)) return false;
      if (!q) return true;
      return (
        (r.full_name || "").toLowerCase().includes(q) ||
        (r.username || "").toLowerCase().includes(q) ||
        (r.rep_name || "").toLowerCase().includes(q)
      );
    });
  }, [rows, tab, search]);

  const downloadBlob = async (path: string): Promise<Blob | null> => {
    const { data, error } = await supabase.storage.from("card-print-files").download(path);
    if (error || !data) {
      console.error("download failed", error);
      return null;
    }
    return data;
  };

  const triggerBrowserDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.toLowerCase().endsWith(".pdf") ? filename : `${filename}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const setStatus = async (id: string, status: PrintStatus, notes?: string | null) => {
    const prev = rows;
    setRows((rs) =>
      rs.map((r) => (r.id === id ? { ...r, print_status: status, print_notes: notes ?? r.print_notes } : r))
    );
    const { error } = await supabase.rpc("admin_set_print_status", {
      _profile_id: id,
      _status: status,
      _notes: notes ?? null,
    });
    if (error) {
      setRows(prev);
      toast.error("Update failed: " + error.message);
      return false;
    }
    return true;
  };

  const downloadOne = async (row: Row) => {
    if (!row.card_print_pdf_path) return;
    const blob = await downloadBlob(row.card_print_pdf_path);
    if (!blob) {
      toast.error("Download failed");
      return;
    }
    triggerBrowserDownload(blob, `${row.username || row.id}-print`);
    if (row.print_status === "not_downloaded") {
      await setStatus(row.id, "downloaded");
    }
  };

  const openInTab = async (row: Row) => {
    if (!row.card_print_pdf_path) return;
    const { data, error } = await supabase.storage
      .from("card-print-files")
      .createSignedUrl(row.card_print_pdf_path, 900);
    if (error || !data?.signedUrl) {
      toast.error("Could not open file");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    if (row.print_status === "not_downloaded") {
      await setStatus(row.id, "downloaded");
    }
  };

  const bulkZip = async () => {
    const targets = rows.filter((r) => selected.has(r.id) && r.card_print_pdf_path);
    if (targets.length === 0) {
      toast.error("Select at least one hub with a PDF");
      return;
    }
    setBusy(true);
    try {
      const zip = new JSZip();
      let added = 0;
      for (const t of targets) {
        const blob = await downloadBlob(t.card_print_pdf_path!);
        if (blob) {
          zip.file(`${t.username || t.id}.pdf`, blob);
          added++;
        }
      }
      if (added === 0) {
        toast.error("Nothing to download");
        return;
      }
      const content = await zip.generateAsync({ type: "blob" });
      triggerBrowserDownload(content, `tapaway-print-batch-${new Date().toISOString().slice(0, 10)}.zip`);
      // Mark not_downloaded ones as downloaded
      const toFlip = targets.filter((t) => t.print_status === "not_downloaded");
      await Promise.all(toFlip.map((t) => setStatus(t.id, "downloaded")));
      toast.success(`Zipped ${added} PDF${added === 1 ? "" : "s"}`);
    } catch (e) {
      toast.error("Zip failed: " + (e instanceof Error ? e.message : "unknown"));
    } finally {
      setBusy(false);
    }
  };

  const bulkMarkPrinted = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setBusy(true);
    await Promise.all(ids.map((id) => setStatus(id, "printed")));
    setBusy(false);
    toast.success(`Marked ${ids.length} as printed`);
  };

  const bulkExtend = () => {
    const targets = rows
      .filter((r) => selected.has(r.id))
      .map<ExtendTrialTarget>((r) => ({
        id: r.id,
        label: resolveDisplayName({ full_name: r.full_name, username: r.username }),
        trial_ends_at: r.trial_ends_at,
      }));
    if (targets.length === 0) return;
    setExtendTarget(targets);
  };

  // ---- Route / location tooling -------------------------------------------
  const selectedRows = useMemo(
    () => filtered.filter((r) => selected.has(r.id)),
    [filtered, selected]
  );

  const openDrivingRoute = () => {
    if (selectedRows.length === 0) return;
    const plan = buildRoutePlan(selectedRows);
    if (plan.legs.length === 0) {
      toast.error("No usable addresses in the selection");
      return;
    }
    if (!plan.chunked) {
      window.open(plan.legs[0].url, "_blank", "noopener,noreferrer");
      return;
    }
    setOpenedLegs(new Set());
    setRoutePlan(plan);
  };

  const openLeg = (leg: RouteLeg<Row>) => {
    window.open(leg.url, "_blank", "noopener,noreferrer");
    setOpenedLegs((prev) => new Set(prev).add(leg.legNumber));
  };

  const openAllLegs = () => {
    if (!routePlan) return;
    routePlan.legs.forEach((leg) => window.open(leg.url, "_blank", "noopener,noreferrer"));
    setOpenedLegs(new Set(routePlan.legs.map((l) => l.legNumber)));
  };

  const copyLegLink = async (leg: RouteLeg<Row>) => {
    try {
      await navigator.clipboard.writeText(leg.url);
      toast.success(`Leg ${leg.legNumber} link copied`);
    } catch {
      toast.error("Clipboard blocked by the browser");
    }
  };

  const downloadRouteCsv = () => {
    if (selectedRows.length === 0) return;
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const header = [
      "Leg #",
      "Stop #",
      "Business Name",
      "Display Handle",
      "Address / Location",
      "Google Place ID",
      "Rep Name",
      "Trial Ends",
      "Google Maps Link",
    ];
    const lines = [header.map(esc).join(",")];
    selectedRows.forEach((r, i) => {
      const loc = resolveLocation(r);
      lines.push(
        [
          String(Math.floor(i / MAX_STOPS_PER_LEG) + 1),
          String(i + 1),
          resolveDisplayName({ full_name: r.full_name, username: r.username }),
          r.username ? `@${r.username}` : "",
          loc.query,
          loc.placeId ?? "",
          r.rep_name ?? "",
          r.trial_ends_at ? new Date(r.trial_ends_at).toLocaleDateString() : "",
          loc.mapsUrl,
        ]
          .map(esc)
          .join(",")
      );
    });
    const blob = new Blob([`\uFEFF${lines.join("\n")}`], { type: "text/csv;charset=utf-8;" });
    triggerBrowserDownload(blob, `tapaway-dropoff-route-${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success(`Exported ${selectedRows.length} stop${selectedRows.length === 1 ? "" : "s"}`);
  };

  const copyAddresses = async () => {
    if (selectedRows.length === 0) return;
    const plan = buildRoutePlan(selectedRows);
    if (plan.legs.length === 0) {
      toast.error("No addresses to copy");
      return;
    }
    const text = plan.legs
      .map((leg) =>
        [
          `--- LEG ${leg.legNumber} (Stops ${leg.startIndex}-${leg.endIndex}) ---`,
          ...leg.stops.map((s) => resolveLocation(s).query).filter(Boolean),
        ].join("\n")
      )
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Addresses copied — paste into Circuit or Roadwarrior");
    } catch {
      toast.error("Clipboard blocked by the browser");
    }
  };




  const openNoteDialog = (row: Row) => {
    setNoteTarget(row);
    setNoteText(row.print_notes || "");
  };

  const saveNote = async () => {
    if (!noteTarget) return;
    const ok = await setStatus(noteTarget.id, noteTarget.print_status, noteText.trim() || null);
    if (ok) {
      toast.success("Note saved");
      setNoteTarget(null);
      setNoteText("");
    }
  };

  const toggleSel = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((r) => r.id)));
  };

  if (authLoading || adminLoading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0e1a] text-white/50">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Button
            onClick={() => navigate("/admin")}
            variant="ghost"
            size="sm"
            className="text-white/60 hover:text-white hover:bg-white/[0.05]"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Admin
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold">Print Queue</h1>
            <p className="text-sm text-white/50">
              Track physical card PDFs from download through delivery. Extend trials so print time doesn't cost the client days.
            </p>
          </div>
          <Button
            onClick={load}
            variant="ghost"
            size="icon"
            className="text-white/60 hover:text-white hover:bg-white/[0.05]"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                tab === t.id
                  ? "bg-white/[0.08] border-white/20 text-white"
                  : "bg-white/[0.02] border-white/5 text-white/60 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              {t.label}
              <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] tabular-nums">
                {counts[t.id]}
              </span>
            </button>
          ))}
          <div className="relative ml-auto min-w-[220px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, slug, or rep"
              className="h-9 pl-8 bg-white/[0.03] border-white/10 text-white placeholder:text-white/30"
            />
          </div>
        </div>

        {selected.size > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.04] px-3 py-2">
            <span className="text-xs text-emerald-200/90 mr-2">
              {selected.size} selected
            </span>
            <Button
              size="sm"
              onClick={bulkZip}
              disabled={busy}
              className="h-8 bg-emerald-500 hover:bg-emerald-400 text-[#0a0e1a]"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" /> Download as ZIP
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={bulkMarkPrinted}
              disabled={busy}
              className="h-8 border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.06]"
            >
              <Printer className="h-3.5 w-3.5 mr-1.5" /> Mark Printed
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={bulkExtend}
              className="h-8 border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.06]"
            >
              <CalendarClock className="h-3.5 w-3.5 mr-1.5" /> Extend Trials
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={openDrivingRoute}
              className="h-8 border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.06]"
            >
              <MapIcon className="h-3.5 w-3.5 mr-1.5" /> Open Driving Route
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={downloadRouteCsv}
              className="h-8 border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.06]"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" /> Route CSV
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={copyAddresses}
              className="h-8 border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.06]"
            >
              <ClipboardList className="h-3.5 w-3.5 mr-1.5" /> Copy Addresses
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelected(new Set())}
              className="h-8 text-white/50 hover:text-white ml-auto"
            >
              Clear
            </Button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 py-16 justify-center text-white/50 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading print queue…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-white/40 text-sm rounded-xl border border-white/5 bg-white/[0.02]">
            No hubs in this tab.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/5">
            <table className="min-w-[1100px] w-full text-sm">
              <thead>
                <tr className="bg-white/[0.02] text-white/50 uppercase tracking-wide text-[11px]">
                  <th className="p-2.5 w-8">
                    <input
                      type="checkbox"
                      checked={selected.size > 0 && selected.size === filtered.length}
                      onChange={toggleAll}
                      className="accent-emerald-500"
                    />
                  </th>
                  <th className="p-2.5 text-left font-medium">Business</th>
                  <th className="p-2.5 text-left font-medium">Rep</th>
                  <th className="p-2.5 text-left font-medium">Submitted</th>
                  <th className="p-2.5 text-left font-medium">Trial Ends</th>
                  <th className="p-2.5 text-left font-medium">Status</th>
                  <th className="p-2.5 text-left font-medium">Notes</th>
                  <th className="p-2.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const submittedAgo = daysBetween(r.submitted_for_review_at || r.created_at);
                  const trialLeft = daysUntil(r.trial_ends_at);
                  const meta = STATUS_META[r.print_status];
                  return (
                    <tr
                      key={r.id}
                      className="border-t border-white/5 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="p-2.5 align-middle">
                        <input
                          type="checkbox"
                          checked={selected.has(r.id)}
                          onChange={() => toggleSel(r.id)}
                          className="accent-emerald-500"
                        />
                      </td>
                      <td className="p-2.5 align-middle">
                        <div className="flex items-center gap-2 min-w-0">
                          {r.profile_photo_url ? (
                            <img
                              src={r.profile_photo_url}
                              alt=""
                              className="h-8 w-8 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-white/10 text-white/70 flex items-center justify-center text-xs shrink-0">
                              {resolveDisplayName({ full_name: r.full_name, username: r.username }).charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-medium text-white/90 truncate">
                              {resolveDisplayName({ full_name: r.full_name, username: r.username })}
                            </div>
                            <div className="text-[11px] font-mono text-white/40 truncate">
                              @{r.username || "—"}
                            </div>
                            {(() => {
                              const loc = resolveLocation(r);
                              return loc.quality === "exact" ? (
                                <span
                                  title={loc.query}
                                  className="mt-1 inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-200"
                                >
                                  <MapPin className="h-2.5 w-2.5" /> {loc.label}
                                </span>
                              ) : (
                                <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-200/80">
                                  <AlertTriangle className="h-2.5 w-2.5" /> Address needed
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                      </td>
                      <td className="p-2.5 text-xs text-white/70">{r.rep_name || "—"}</td>
                      <td className="p-2.5 text-xs text-white/60">
                        <div>{fmtDate(r.submitted_for_review_at || r.created_at)}</div>
                        {submittedAgo !== null && (
                          <div className="text-[10px] text-white/40">
                            {submittedAgo === 0 ? "today" : `${submittedAgo}d ago`}
                          </div>
                        )}
                      </td>
                      <td className="p-2.5 text-xs">
                        <div className="text-white/60">{fmtDate(r.trial_ends_at)}</div>
                        {trialLeft !== null && (
                          <div
                            className={`text-[10px] ${
                              trialLeft < 1
                                ? "text-red-400 font-semibold"
                                : trialLeft <= 2
                                ? "text-amber-300"
                                : "text-white/40"
                            }`}
                          >
                            {trialLeft < 0
                              ? `${Math.abs(trialLeft)}d overdue`
                              : trialLeft === 0
                              ? "ends today"
                              : `${trialLeft}d left`}
                          </div>
                        )}
                        {r.trial_extension_days > 0 && (
                          <div className="text-[10px] text-emerald-300/80 mt-0.5">
                            +{r.trial_extension_days}d extended
                          </div>
                        )}
                      </td>
                      <td className="p-2.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] border ${meta.chip}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                          {meta.label}
                        </span>
                      </td>
                      <td className="p-2.5 text-[11px] text-white/60 max-w-[180px] truncate">
                        {r.print_notes || <span className="text-white/25">—</span>}
                      </td>
                      <td className="p-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            onClick={() => downloadOne(r)}
                            size="sm"
                            className="h-7 px-2 text-[11px] bg-emerald-500 hover:bg-emerald-400 text-[#0a0e1a]"
                            title="Download PDF"
                          >
                            <FileText className="h-3.5 w-3.5 mr-1" /> PDF
                          </Button>
                          {r.print_status !== "printed" && r.print_status !== "delivered" && (
                            <Button
                              onClick={() => setStatus(r.id, "printed")}
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-violet-300/80 hover:text-violet-200 hover:bg-violet-500/10"
                              title="Mark printed"
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {r.print_status !== "delivered" && (
                            <Button
                              onClick={() => setStatus(r.id, "delivered")}
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-emerald-300/80 hover:text-emerald-300 hover:bg-emerald-500/10"
                              title="Mark delivered"
                            >
                              <PackageCheck className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            onClick={() =>
                              setEditTarget({
                                id: r.id,
                                full_name: r.full_name,
                                username: r.username,
                                profile_photo_url: r.profile_photo_url,
                                print_notes: r.print_notes,
                                is_approved: r.is_approved,
                              })
                            }
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-sky-300/80 hover:text-sky-200 hover:bg-sky-500/10"
                            title="Edit hub"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            onClick={() =>
                              setExtendTarget({
                                id: r.id,
                                label: resolveDisplayName({ full_name: r.full_name, username: r.username }),
                                trial_ends_at: r.trial_ends_at,
                              })
                            }
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-amber-300/80 hover:text-amber-200 hover:bg-amber-500/10"
                            title="Extend trial"
                          >
                            <CalendarClock className="h-3.5 w-3.5" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-white/50 hover:text-white hover:bg-white/[0.05]"
                              >
                                <MoreVertical className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openInTab(r)}>
                                <ExternalLink className="h-3.5 w-3.5 mr-2" /> Open in new tab
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openNoteDialog(r)}>
                                <StickyNote className="h-3.5 w-3.5 mr-2" /> Edit note
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setStatus(r.id, "not_downloaded")}>
                                <RefreshCw className="h-3.5 w-3.5 mr-2" /> Reset status
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  window.open(`/${r.username}?admin_preview=1`, "_blank", "noopener,noreferrer")
                                }
                              >
                                <ExternalLink className="h-3.5 w-3.5 mr-2" /> Preview hub
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <EditHubDrawer
        target={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={() => load()}
      />

      <ExtendTrialDialog
        target={extendTarget}
        onClose={() => setExtendTarget(null)}
        onSaved={() => load()}
      />

      <Dialog
        open={!!noteTarget}
        onOpenChange={(o) => {
          if (!o) {
            setNoteTarget(null);
            setNoteText("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Print note</DialogTitle>
          </DialogHeader>
          <Textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="e.g. Batch #4, ship Monday"
            rows={4}
            maxLength={400}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteTarget(null)}>
              Cancel
            </Button>
            <Button onClick={saveNote} className="bg-emerald-500 hover:bg-emerald-400 text-[#0a0e1a]">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPrintQueue;
