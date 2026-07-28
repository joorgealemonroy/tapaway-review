import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ExternalLink, FileText, Loader2, CheckCircle2 } from "lucide-react";

type PendingHub = {
  id: string;
  full_name: string;
  username: string;
  created_at: string | null;
  sales_rep_id: string | null;
  card_print_pdf_path: string | null;
  rep_name?: string | null;
};

const AdminPendingHubApprovals = () => {
  const [rows, setRows] = useState<PendingHub[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("personal_profiles")
        .select("id, full_name, username, created_at, sales_rep_id, card_print_pdf_path")
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

  const openPdf = async (path: string | null) => {
    if (!path) {
      toast.error("No print file uploaded");
      return;
    }
    const { data, error } = await supabase.storage
      .from("card-print-files")
      .createSignedUrl(path, 900);
    if (error || !data?.signedUrl) {
      toast.error("Could not open print file");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const approve = async (row: PendingHub) => {
    setApprovingId(row.id);
    const { error } = await supabase
      .from("personal_profiles")
      .update({ is_approved: true, plan_type: "solo_pro" })
      .eq("id", row.id);
    if (error) {
      setApprovingId(null);
      toast.error("Approval failed: " + error.message);
      return;
    }

    // Award rep commission (demo bonus + shift base + closer pool refresh).
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

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-white">
            Pending Hub Approvals — Sales Partner Demos
          </h3>
          <p className="text-xs text-white/40">
            Review layouts and print files before unlocking Solo Pro.
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-widest text-white/40">
                <th className="p-2">Business</th>
                <th className="p-2">Sales Rep</th>
                <th className="p-2">Submitted</th>
                <th className="p-2">Layout</th>
                <th className="p-2">Print File</th>
                <th className="p-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                  <td className="p-2">
                    <div className="font-medium text-white/90">{r.full_name}</div>
                    <div className="text-xs font-mono text-white/40">@{r.username}</div>
                  </td>
                  <td className="p-2 text-white/70">{r.rep_name ?? "—"}</td>
                  <td className="p-2 text-white/50 text-xs">
                    {r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="p-2">
                    <button
                      onClick={() => window.open(`/${r.username}?admin_preview=1`, "_blank", "noopener,noreferrer")}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] border border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06]"
                    >
                      <ExternalLink className="h-3 w-3" /> Review
                    </button>
                  </td>
                  <td className="p-2">
                    {r.card_print_pdf_path ? (
                      <button
                        onClick={() => openPdf(r.card_print_pdf_path)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] border border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06]"
                      >
                        <FileText className="h-3 w-3" /> View PDF
                      </button>
                    ) : (
                      <span className="text-xs text-white/30">None</span>
                    )}
                  </td>
                  <td className="p-2 text-right">
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
                      Approve Hub
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminPendingHubApprovals;
