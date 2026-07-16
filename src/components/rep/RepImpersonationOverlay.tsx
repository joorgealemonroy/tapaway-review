import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { Eye, ArrowLeft } from "lucide-react";

/**
 * Global overlay for admin impersonation of the Sales Partner portal.
 */
export const RepImpersonationOverlay = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAdmin, loading: adminLoading } = useAdminAccess();

  const isRepRoute = location.pathname.startsWith("/rep");
  const paramRepId = searchParams.get("admin_view_rep");

  const [stickyRepId, setStickyRepId] = useState<string | null>(paramRepId);
  const [repName, setRepName] = useState<string>("");

  useEffect(() => {
    if (paramRepId) setStickyRepId(paramRepId);
  }, [paramRepId]);

  const active = isRepRoute && !!stickyRepId && isAdmin;

  useEffect(() => {
    if (!active) return;
    if (paramRepId) return;
    const next = new URLSearchParams(searchParams);
    next.set("admin_view_rep", stickyRepId!);
    navigate(`${location.pathname}?${next.toString()}`, { replace: true });
  }, [active, paramRepId, stickyRepId, searchParams, location.pathname, navigate]);

  useEffect(() => {
    if (!active || !stickyRepId) {
      setRepName("");
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("sales_reps")
        .select("name, email")
        .eq("id", stickyRepId)
        .maybeSingle();
      if (!cancelled && data) {
        setRepName(data.name || data.email || "Sales Partner");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active, stickyRepId]);

  if (adminLoading) return null;
  if (!active) return null;

  return (
    <div className="sticky top-0 z-[60] bg-amber-500/10 border-b border-amber-400/20 backdrop-blur-md text-amber-100 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm font-medium">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-400/20">
          <Eye className="h-3.5 w-3.5" />
        </span>
        <span>
          Impersonating <span className="font-semibold">{repName || "…"}</span>
        </span>
      </div>
      <button
        onClick={() => navigate("/admin/reps")}
        className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-lg bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/30 transition-colors"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to Admin
      </button>
    </div>
  );
};

export default RepImpersonationOverlay;
