import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

type ClientError = {
  id: string;
  error_message: string;
  stack_trace: string | null;
  component_stack: string | null;
  route: string | null;
  user_id: string | null;
  user_agent: string | null;
  created_at: string;
};

const AdminErrors = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: guardLoading } = useAdminGuard();
  const [rows, setRows] = useState<ClientError[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("client_errors")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) toast.error(error.message);
    setRows((data ?? []) as ClientError[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  const remove = async (id: string) => {
    const { error } = await supabase.from("client_errors").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((r) => r.filter((x) => x.id !== id));
  };

  if (guardLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0e1a]">
        <Loader2 className="h-6 w-6 animate-spin text-white/60" />
      </div>
    );
  }
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="sm" className="text-white/70" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Admin
          </Button>
          <Button variant="outline" size="sm" className="border-white/10 bg-white/5" onClick={load}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>

        <h1 className="text-2xl font-bold mb-1">Recent App Errors</h1>
        <p className="text-sm text-white/50 mb-6">
          Crashes captured by the app's error boundary, newest first.
        </p>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-white/50" />
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-white/5 bg-white/[0.03] p-10 text-center text-sm text-white/50">
            No errors captured yet.
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.id} className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
                <div className="flex items-start justify-between gap-4">
                  <button
                    className="text-left flex-1 min-w-0"
                    onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                  >
                    <p className="text-sm font-medium break-words">{r.error_message}</p>
                    <p className="text-xs text-white/40 mt-1 font-mono break-all">
                      {new Date(r.created_at).toLocaleString()} · {r.route || "—"} ·{" "}
                      {r.user_id ? r.user_id.slice(0, 8) : "anonymous"}
                    </p>
                  </button>
                  <Button variant="ghost" size="icon" onClick={() => remove(r.id)}>
                    <Trash2 className="h-4 w-4 text-white/40" />
                  </Button>
                </div>
                {expanded === r.id && (
                  <pre className="mt-3 text-[11px] font-mono text-white/60 bg-black/40 rounded-lg p-3 max-h-80 overflow-auto whitespace-pre-wrap break-words">
                    {[
                      `User agent: ${r.user_agent ?? "—"}`,
                      "",
                      "Stack:",
                      r.stack_trace ?? "(none)",
                      "",
                      "Component stack:",
                      r.component_stack ?? "(none)",
                    ].join("\n")}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminErrors;
