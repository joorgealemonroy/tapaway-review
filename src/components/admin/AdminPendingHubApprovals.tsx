import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  ExternalLink,
  FileText,
  Loader2,
  CheckCircle2,
  MessageSquareWarning,
} from "lucide-react";

type PendingHub = {
  id: string;
  full_name: string;
  username: string;
  created_at: string | null;
  submitted_for_review_at: string | null;
  sales_rep_id: string | null;
  card_print_pdf_path: string | null;
  rep_name?: string | null;
};

const AdminPendingHubApprovals = () => {
  const [rows, setRows] = useState<PendingHub[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [noteTarget, setNoteTarget] = useState<PendingHub | null>(null);
  const [noteText, setNoteText] = useState("");
  const [sendingNote, setSendingNote] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("personal_profiles")
        .select(
          "id, full_name, username, created_at, submitted_for_review_at, sales_rep_id, card_print_pdf_path"
        )
        .not("sales_rep_id", "is", null)
        .eq("is_approved", false)
        .eq("pipeline_status", "ready_for_review")
        .order("submitted_for_review_at", { ascending: false });
      if (error) throw error;

      const repIds = Array.from(
        new Set((data ?? []).map((r) => r.sales_rep_id).filter(Boolean) as string[])
      );
      let repMap: Record<string, string> = {};
      if (repIds.length > 0) {
        const { data: reps } = await supabase
          .from("sales_reps")
          .select("id, name")
          .in("id", repIds);
        repMap = Object.fromEntries((reps ?? []).map((r) => [r.id, r.name ?? ""]));
      }

      setRows(
        (data ?? []).map((r) => ({
          ...r,
          rep_name: r.sales_rep_id ? repMap[r.sales_rep_id] ?? null : null,
        }))
      );
    } catch (e) {
      toast.error("Failed to load pending hubs");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openPdf = async (path: string | null, filenameHint?: string) => {
    if (!path) {
      toast.error("No print file uploaded");
      return;
    }
    try {
      const { data, error } = await supabase.storage
        .from("card-print-files")
        .download(path);
      if (error || !data) throw error ?? new Error("Empty download");
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      const base = filenameHint?.trim() || path.split("/").pop() || "print-file";
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

  const approve = async (row: PendingHub) => {
    setApprovingId(row.id);
    const { error } = await supabase
      .from("personal_profiles")
      .update({
        is_approved: true,
        plan_type: "solo_pro",
        review_note: null,
        review_note_at: null,
      } as never)
      .eq("id", row.id);
    if (error) {
      setApprovingId(null);
      toast.error("Approval failed: " + error.message);
      return;
    }

    try {
      const { data, error: awardErr } = await supabase.functions.invoke(
        "award-demo-commission",
        { body: { personal_profile_id: row.id } },
      );
      if (awardErr) throw awardErr;
      if (data?.awarded === "locked_quality_gate") {
        toast.success("Approved — bonus locked by Quality Gate (rep <5% conversion)");
      } else if (data?.awarded === "voided") {
        toast.success("Approved — daily cap reached, no bonus awarded");
      } else {
        toast.success("Demo approved — rep bonus awarded");
      }
    } catch (e) {
      console.error("award-demo-commission failed", e);
      toast.warning("Approved, but commission could not be awarded automatically");
    }

    setApprovingId(null);
    setRows((prev) => prev.filter((r) => r.id !== row.id));
  };

  const openNoteDialog = (row: PendingHub) => {
    setNoteTarget(row);
    setNoteText("");
  };

  const sendChangeRequest = async () => {
    if (!noteTarget) return;
    const trimmed = noteText.trim();
    if (trimmed.length < 3) {
      toast.error("Add a short note explaining what to fix");
      return;
    }
    setSendingNote(true);
    const { error } = await supabase
      .from("personal_profiles")
      .update({
        review_note: trimmed,
        review_note_at: new Date().toISOString(),
        pipeline_status: "changes_requested",
        submitted_for_review_at: null,
      } as never)
      .eq("id", noteTarget.id);
    setSendingNote(false);
    if (error) {
      toast.error("Failed to send note: " + error.message);
      return;
    }
    toast.success("Changes requested — rep notified on their dashboard");
    setRows((prev) => prev.filter((r) => r.id !== noteTarget.id));
    setNoteTarget(null);
    setNoteText("");
  };

  const submittedLabel = (row: PendingHub) => {
    const iso = row.submitted_for_review_at || row.created_at;
    return iso ? new Date(iso).toLocaleDateString() : "—";
  };

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-white">
            Pending Hub Approvals — Sales Partner Demos
          </h3>
          <p className="text-xs text-white/40">
            Approve, or send a quick note so the rep can fix it and resubmit.
          </p>
        </div>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-amber-500/10 text-amber-300">
          {rows.length} pending
        </span>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-white/50 text-sm py-6 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-8 text-white/40 text-sm">
          No pending demos from sales partners.
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center gap-3 justify-between rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-medium text-white/90 truncate">
                    {r.full_name}
                  </span>
                  <span className="text-[11px] font-mono text-white/40">
                    @{r.username}
                  </span>
                </div>
                <div className="text-[11px] text-white/50 mt-0.5 flex items-center gap-2 flex-wrap">
                  <span>{r.rep_name ?? "Unknown rep"}</span>
                  <span className="text-white/20">·</span>
                  <span>Submitted {submittedLabel(r)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() =>
                    window.open(
                      `/${r.username}?admin_preview=1`,
                      "_blank",
                      "noopener,noreferrer"
                    )
                  }
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] border border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06]"
                >
                  <ExternalLink className="h-3 w-3" /> Preview
                </button>
                {r.card_print_pdf_path && (
                  <button
                    onClick={() => openPdf(r.card_print_pdf_path, `${r.username || 'hub'}-print`)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] border border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06]"
                  >
                    <FileText className="h-3 w-3" /> Download PDF
                  </button>
                )}
                <button
                  onClick={() => openNoteDialog(r)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] border border-amber-500/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20"
                >
                  <MessageSquareWarning className="h-3 w-3" /> Request Changes
                </button>
                <button
                  onClick={() => approve(r)}
                  disabled={approvingId === r.id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-500 text-[#0a0e1a] hover:bg-emerald-400 disabled:opacity-50"
                >
                  {approvingId === r.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3 w-3" />
                  )}
                  Approve
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={!!noteTarget}
        onOpenChange={(open) => {
          if (!open && !sendingNote) {
            setNoteTarget(null);
            setNoteText("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request changes</DialogTitle>
            <DialogDescription>
              {noteTarget ? (
                <>
                  Send a quick note to the rep for{" "}
                  <span className="font-medium">{noteTarget.full_name}</span>. The
                  hub goes back to draft so they can fix it and resubmit.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="e.g. Swap the profile photo for a higher-res logo; the Instagram link is broken."
            rows={5}
            maxLength={600}
            disabled={sendingNote}
          />
          <div className="text-[11px] text-muted-foreground text-right">
            {noteText.length}/600
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNoteTarget(null);
                setNoteText("");
              }}
              disabled={sendingNote}
            >
              Cancel
            </Button>
            <Button
              onClick={sendChangeRequest}
              disabled={sendingNote || noteText.trim().length < 3}
              className="bg-amber-500 hover:bg-amber-400 text-[#0a0e1a]"
            >
              {sendingNote && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPendingHubApprovals;
