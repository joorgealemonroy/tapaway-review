import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { Button } from "@/components/ui/button";
import { Eye, ArrowLeft } from "lucide-react";

/**
 * Global overlay for admin impersonation of the Sales Partner portal.
 *
 * Renders on any /rep/* route when ?admin_view_rep=<id> is present and the
 * caller is a super admin. Also re-appends the query param whenever a rep
 * page navigates and drops it, so impersonation stays sticky without having
 * to edit every rep page's navigation logic.
 */
export const RepImpersonationOverlay = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAdmin, loading: adminLoading } = useAdminAccess();

  const isRepRoute = location.pathname.startsWith("/rep");
  const paramRepId = searchParams.get("admin_view_rep");

  // Remember the impersonated id even after navigations that drop the param,
  // so we can re-append it before the next render commits.
  const [stickyRepId, setStickyRepId] = useState<string | null>(paramRepId);
  const [repName, setRepName] = useState<string>("");

  useEffect(() => {
    if (paramRepId) setStickyRepId(paramRepId);
  }, [paramRepId]);

  const active = isRepRoute && !!stickyRepId && isAdmin;

  // If we're on a rep route with a sticky impersonation id but the URL has
  // lost the query param (e.g. after `navigate('/rep/restaurants')`), silently
  // put it back.
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
    <div className="sticky top-0 z-[60] bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Eye className="h-4 w-4" />
        <span>Viewing as {repName || "…"}</span>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="bg-amber-600/20 border-amber-700 text-amber-950 hover:bg-amber-600/40 h-7 text-xs"
        onClick={() => navigate("/admin/reps")}
      >
        <ArrowLeft className="h-3 w-3 mr-1" />
        Back to Admin
      </Button>
    </div>
  );
};

export default RepImpersonationOverlay;
