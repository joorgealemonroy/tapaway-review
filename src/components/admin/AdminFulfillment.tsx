// AdminFulfillment — the demo/card fulfillment pipeline board.
//
// Single source of truth: personal_profiles.pipeline_status.
// Stage order: created (draft / ready_for_review / changes_requested)
// → approved → printed (card_ready) → activated → delivered
// → closed (converted / inactive).
//
// Approve actions reuse the shared approveDemo() helper (which also fires
// award-demo-commission, the $5/demo payout hook) — logic is NOT duplicated
// here. Card↔hub activation linking is the sibling's activate RPC; the
// "Mark activated" button below only advances the pipeline stage.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft, Printer, PackageCheck, CheckCircle2, XCircle } from "lucide-react";
import { approveDemo, approveToastText } from "@/lib/approveDemo";
import RepTally from "@/components/admin/RepTally";

type Row = {
  id: string;
  full_name: string | null;
  username: string | null;
  created_at: string | null;
  updated_at: string | null;
  pipeline_status: string | null;
  is_approved: boolean | null;
  sales_rep_id: string | null;
  created_by_rep_id: string | null;
  approved_at: string | null;
  printed_at: string | null;
  activated_at: string | null;
  delivered_at: string | null;
  converted_at: string | null;
  card_print_pdf_path: string | null;
  rep_name: string | null;
};

const LANE_LABELS: Record<string, string> = {
  draft: "Created",
  ready_for_review: "Created",
  changes_requested: "Created",
  approved: "Approved",
  card_ready: "Printed",
  activated: "Activated",
  delivered: "Delivered",
  converted: "Converted",
  inactive: "Closed",
};

const LANE_ORDER = ["created", "approved", "printed", "activated", "delivered", "closed"] as const;
type Lane = (typeof LANE_ORDER)[number];

const laneOf = (status: string | null): Lane => {
  switch (status) {
    case "approved":
      return "approved";
    case "card_ready":
      return "printed";
    case "activated":
      return "activated";
    case "delivered":
      return "delivered";
    case "converted":
    case "inactive":
      return "closed";
    default:
      return "created";
  }
};

const laneTitle = (lane: Lane): string =>
  lane === "created"
    ? "Created"
    : lane === "approved"
      ? "Approved"
      : lane === "printed"
        ? "Printed"
        : lane === "activated"
          ? "Activated"
          : lane === "delivered"
            ? "Delivered"
            : "Closed";

// Which stage timestamp marks entry into the current lane (for "days in stage").
const stageStamp = (row: Row): string | null => {
  switch (laneOf(row.pipeline_status)) {
    case "created":
      return row.created_at;
    case "approved":
      return row.approved_at ?? row.updated_at ?? row.created_at;
    case "printed":
      return row.printed_at ?? row.approved_at ?? row.created_at;
    case "activated":
      return row.activated_at ?? row.printed_at ?? row.created_at;
    case "delivered":
      return row.delivered_at ?? row.activated_at ?? row.created_at;
    case "closed":
      return row.converted_at ?? row.delivered_at ?? row.created_at;
  }
};

const daysInStage = (row: Row): number => {
  const stamp = stageStamp(row);
  if (!stamp) return 0;
  const ms = Date.now() - new Date(stamp).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
};

type QueueTab = "review" | "print" | "deliver" | "all";

const TABS: { key: QueueTab; label: string }[] = [
  { key: "review", label: "Needs my review" },
  { key: "print", label: "To print" },
  { key: "deliver", label: "Activate & deliver" },
  { key: "all", label: "All" },
];

const inTab = (row: Row, tab: QueueTab): boolean => {
  if (tab === "all") return true;
  if (tab === "review")
    return (
      !row.is_approved &&
      (row.pipeline_status === "draft" ||
        row.pipeline_status === "ready_for_review" ||
        row.pipeline_status === "changes_requested" ||
        !row.pipeline_status)
    );
  if (tab === "print") return row.pipeline_status === "approved";
  // "Activate & deliver": printed cards waiting for their chip to be linked,
  // plus activated cards waiting to be handed over in person.
  if (tab === "deliver")
    return row.pipeline_status === "activated" || row.pipeline_status === "card_ready";
  return false;
};

export default function AdminFulfillment() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<QueueTab>("review");
  const [search, setSearch] = useState("");
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("personal_profiles")
        .select(
          "id, full_name, username, created_at, updated_at, pipeline_status, is_approved, sales_rep_id, created_by_rep_id, approved_at, printed_at, activated_at, delivered_at, converted_at, card_print_pdf_path"
        )
        .or("sales_rep_id.not.is.null,created_by_rep_id.not.is.null")
        .order("updated_at", { ascending: false })
        .limit(500);
      if (error) throw error;

      const repIds = Array.from(
        new Set(
          (data ?? [])
            .flatMap((r) => [r.sales_rep_id, r.created_by_rep_id])
            .filter(Boolean) as string[]
        )
      );
      let repMap: Record<string, string> = {};
      if (repIds.length > 0) {
        const { data: reps } = await supabase.from("sales_reps").select("id, name").in("id", repIds);
        repMap = Object.fromEntries((reps ?? []).map((r) => [r.id, r.name ?? ""]));
      }

      setRows(
        ((data ?? []) as Row[]).map((r) => {
          const repId = r.sales_rep_id ?? r.created_by_rep_id;
          return { ...r, rep_name: repId ? repMap[repId] ?? null : null };
        })
      );
    } catch (e) {
      console.error(e);
      toast.error("Failed to load fulfillment queue: " + (e instanceof Error ? e.message : "unknown"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const laneCounts = useMemo(() => {
    const counts: Record<Lane, number> = {
      created: 0,
      approved: 0,
      printed: 0,
      activated: 0,
      delivered: 0,
      closed: 0,
    };
    for (const r of rows) counts[laneOf(r.pipeline_status)] += 1;
    return counts;
  }, [rows]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((r) => inTab(r, tab))
      .filter((r) => {
        if (!q) return true;
        return (
          (r.full_name ?? "").toLowerCase().includes(q) ||
          (r.username ?? "").toLowerCase().includes(q) ||
          (r.rep_name ?? "").toLowerCase().includes(q)
        );
      });
  }, [rows, tab, search]);

  const updateRow = async (id: string, patch: Record<string, unknown>) => {
    const { error } = await supabase
      .from("personal_profiles")
      .update(patch as never)
      .eq("id", id);
    if (error) throw error;
  };

  const handleApprove = async (row: Row) => {
    setActingId(row.id);
    try {
      const result = await approveDemo(row.id);
      const t = approveToastText(result.award, "awardError" in result);
      if (t.kind === "success") toast.success(t.text);
      else toast.warning(t.text);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Approval failed");
    } finally {
      setActingId(null);
    }
  };

  const handleAdvance = async (
    row: Row,
    next: string,
    stampField?: string,
    printSync?: "printed" | "delivered"
  ) => {
    setActingId(row.id);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const adminId = userRes?.user?.id ?? null;

      if (printSync) {
        const { error: rpcErr } = await supabase.rpc("admin_set_print_status", {
          _profile_id: row.id,
          _status: printSync,
          _notes: null,
        });
        if (rpcErr) throw new Error("Print-status sync failed: " + rpcErr.message);
      }

      const patch: Record<string, unknown> = { pipeline_status: next };
      if (stampField) {
        patch[stampField] = new Date().toISOString();
        patch[stampField.replace("_at", "_by")] = adminId;
      }
      await updateRow(row.id, patch);
      toast.success(`Moved to ${LANE_LABELS[next] ?? next}.`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setActingId(null);
    }
  };

  const handleClose = async (row: Row, status: "converted" | "inactive") => {
    const label = status === "converted" ? "converted (paying)" : "closed — no interest";
    if (
      !window.confirm(
        `Mark "${row.full_name || row.username || "this hub"}" as ${label}?\n\nYou can reopen it from this board later.`
      )
    )
      return;
    setActingId(row.id);
    try {
      await updateRow(row.id, {
        pipeline_status: status,
        // converted_at marks a real sale; a "no interest" close leaves it null.
        ...(status === "converted" ? { converted_at: new Date().toISOString() } : {}),
      });
      toast.success(status === "converted" ? "Marked as converted." : "Closed — no interest.");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setActingId(null);
    }
  };

  const handleReopen = async (row: Row) => {
    setActingId(row.id);
    try {
      await updateRow(row.id, { pipeline_status: "delivered" });
      toast.success("Reopened — back to the Delivered lane.");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setActingId(null);
    }
  };

  const renderAction = (row: Row) => {
    const busy = actingId === row.id;
    const status = row.pipeline_status;
    const btn =
      "w-full min-h-[44px] mt-3 flex items-center justify-center gap-2 text-sm font-medium rounded-lg";

    if (!row.is_approved || status === "draft" || status === "ready_for_review" || status === "changes_requested" || !status) {
      return (
        <Button className={btn} onClick={() => void handleApprove(row)} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Approve demo
        </Button>
      );
    }
    if (status === "approved") {
      return (
        <Button className={btn} onClick={() => void handleAdvance(row, "card_ready", "printed_at", "printed")} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
          Mark printed
        </Button>
      );
    }
    if (status === "card_ready") {
      return (
        <Button className={btn} onClick={() => void handleAdvance(row, "activated", "activated_at")} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}
          Mark activated (card linked)
        </Button>
      );
    }
    if (status === "activated") {
      return (
        <Button className={btn} onClick={() => void handleAdvance(row, "delivered", "delivered_at", "delivered")} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}
          Mark delivered
        </Button>
      );
    }
    if (status === "delivered") {
      return (
        <div className="grid grid-cols-2 gap-2 mt-3">
          <Button className="min-h-[44px]" onClick={() => void handleClose(row, "converted")} disabled={busy}>
            <CheckCircle2 className="h-4 w-4 mr-1" /> Converted
          </Button>
          <Button
            variant="outline"
            className="min-h-[44px]"
            onClick={() => void handleClose(row, "inactive")}
            disabled={busy}
          >
            <XCircle className="h-4 w-4 mr-1" /> No interest
          </Button>
        </div>
      );
    }
    if (status === "converted" || status === "inactive") {
      return (
        <Button
          variant="outline"
          className={btn}
          onClick={() => void handleReopen(row)}
          disabled={busy}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowLeft className="h-4 w-4" />}
          Reopen — back to Delivered
        </Button>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-white">Fulfillment pipeline</h1>
            <p className="text-sm text-white/40">
              Every rep-created demo, from creation to closed. Advance each card one stage at a time.
            </p>
          </div>
        </div>

        {/* Stage pipeline: counts per stage */}
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {LANE_ORDER.map((lane, i) => (
              <div key={lane} className="relative">
                <button
                  onClick={() => {
                    if (lane === "created") setTab("review");
                    else if (lane === "approved") setTab("print");
                    else if (lane === "printed" || lane === "activated") setTab("deliver");
                    else setTab("all");
                  }}
                  className="w-full rounded-lg border border-white/5 bg-white/[0.015] px-2 py-3 text-center hover:bg-white/[0.05] transition-colors min-h-[72px]"
                >
                  <div className="text-[11px] text-white/40">
                    {i + 1}. {laneTitle(lane)}
                  </div>
                  <div className="text-2xl font-semibold text-white tabular-nums">
                    {laneCounts[lane]}
                  </div>
                </button>
                {i < LANE_ORDER.length - 1 && (
                  <div className="hidden sm:block absolute top-1/2 -right-[7px] -translate-y-1/2 text-white/20 text-lg z-10">
                    ›
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Queue tabs + search */}
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium min-h-[44px] transition-colors ${
                tab === t.key
                  ? "bg-primary text-white"
                  : "bg-white/[0.03] text-white/60 hover:bg-white/[0.06] border border-white/5"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Input
          placeholder="Search business or rep…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />

        {/* Rows: single column, big tap targets */}
        {loading ? (
          <div className="flex items-center gap-2 py-12 justify-center text-white/40 text-sm">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading pipeline…
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-12 text-white/40 text-sm">
            Nothing here. {tab !== "all" ? "This queue is clear — nice." : "No rep-created demos yet."}
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map((row) => {
              const d = daysInStage(row);
              return (
                <div
                  key={row.id}
                  className="rounded-xl border border-white/5 bg-white/[0.02] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-white font-medium truncate">
                        {row.full_name || row.username || "Unnamed hub"}
                      </div>
                      <div className="text-xs text-white/40 mt-0.5">
                        {row.rep_name ? `Made by ${row.rep_name}` : "No rep on file"}
                        {row.username ? ` · /${row.username}` : ""}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-block text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                        {LANE_LABELS[row.pipeline_status ?? "draft"] ?? row.pipeline_status}
                      </span>
                      <div className="text-[11px] text-white/40 mt-1 tabular-nums">
                        {d === 0 ? "today" : `${d}d`} in stage
                      </div>
                    </div>
                  </div>
                  {renderAction(row)}
                </div>
              );
            })}
          </div>
        )}

        {/* Rep $5 tally */}
        <RepTally />
      </div>
    </div>
  );
}
