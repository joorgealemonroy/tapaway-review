import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { track, setInternalActor } from "@/lib/analytics";

/**
 * Site-wide page-view, time-on-page and scroll-depth tracking.
 *
 * Mounted once inside the router. Private dashboard/admin/auth routes are not
 * tracked at all, so no private route ever enters analytics. Verified staff sessions are excluded; signed-in customers still count.
 */
const PRIVATE_PREFIXES = [
  "/dashboard",
  "/admin",
  "/rep",
  "/auth",
  "/affiliate",
  "/onboarding",
  "/reset-password",
  "/paywall",
];

function isPrivate(path: string): boolean {
  return PRIVATE_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

const SiteAnalytics = () => {
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useAdminAccess();
  const startedAt = useRef<number>(Date.now());
  const maxScroll = useRef(0);
  const lastPath = useRef<string | null>(null);


  useEffect(() => {
    setInternalActor(isAdmin || ["admin", "sales_rep"].includes(user?.app_metadata?.role || ""));
  }, [user, isAdmin]);

  useEffect(() => {
    const path = location.pathname;
    if (authLoading || roleLoading) return;
    // Dynamic hub routes emit their own hub_view; never count the same opening twice.
    const sitePaths = ["/", "/personal", "/personal/design", "/support", "/about", "/faq", "/restaurants", "/barbershops", "/salons", "/cafes", "/auto-shops", "/terms", "/privacy", "/refund"];
    if (isPrivate(path) || !sitePaths.includes(path)) return;

    // Route change = one page view. The client guard plus the server-side
    // dedupe window make remounts and refreshes non-duplicating.
    if (lastPath.current === path) return;
    lastPath.current = path;
    startedAt.current = Date.now();
    maxScroll.current = 0;

    track("page_view", { path, hubKind: "site" });

    const onScroll = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      const pct = Math.min(100, Math.round((window.scrollY / scrollable) * 100));
      if (pct > maxScroll.current) maxScroll.current = pct;
    };

    const flush = () => {
      const elapsed = Date.now() - startedAt.current;
      if (elapsed < 1000) return;
      track("page_exit", {
        path,
        hubKind: "site",
        timeOnPageMs: elapsed,
        scrollDepthPct: maxScroll.current,
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", flush);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [location.pathname, authLoading, roleLoading, isAdmin]);

  return null;
};

export default SiteAnalytics;
