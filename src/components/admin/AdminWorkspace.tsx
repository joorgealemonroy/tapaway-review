import { useEffect, useLayoutEffect, useState, Suspense } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Package,
  MessageSquare,
  BarChart3,
  Grid2X2,
  Search,
  ArrowUpRight,
  LogOut,
  Menu,
  Sparkles,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { adminDestinations } from "@/lib/admin/workspace";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import AdminFinder from "./AdminFinder";
import "./workspace.css";
const icons = [
  LayoutDashboard,
  Building2,
  Package,
  MessageSquare,
  BarChart3,
  Grid2X2,
];
export default function AdminWorkspace({
  children,
}: {
  children: React.ReactNode;
}) {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const active =
    location.pathname.startsWith("/admin") ||
    (location.pathname === "/dashboard" &&
      (params.has("admin_view") || params.has("admin_view_personal")));
  return active ? <Workspace>{children}</Workspace> : <>{children}</>;
}
function Workspace({ children }: { children: React.ReactNode }) {
  const location = useLocation(),
    navigate = useNavigate();
  const { user, signOut } = useAuth();
  const access = useAdminAccess();
  const [mobile, setMobile] = useState(false),
    [finder, setFinder] = useState(false);
  useLayoutEffect(() => {
    document.documentElement.dataset.adminSurface = "true";
    return () => {
      delete document.documentElement.dataset.adminSurface;
    };
  }, []);
  useEffect(() => {
    setMobile(false);
  }, [location.pathname, location.search]);
  useEffect(() => {
    const shortcut = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setFinder((v) => !v);
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  useEffect(() => {
    if (!access.loading && !user)
      navigate(
        "/auth?redirect=" +
          encodeURIComponent(location.pathname + location.search),
        { replace: true },
      );
  }, [access.loading, user, navigate, location.pathname, location.search]);
  if (access.loading)
    return (
      <div className="aw-gate">
        <Loader2 className="animate-spin" />
        <p>Opening your workspace…</p>
      </div>
    );
  if (access.error)
    return (
      <div className="aw-gate">
        <h1>Let’s reconnect</h1>
        <p>Your session is safe. We couldn’t verify access just now.</p>
        <button className="aw-primary" onClick={() => access.retry()}>
          Try again
        </button>
        <Link to="/">Back to TapAway</Link>
      </div>
    );
  if (!access.isAdmin)
    return (
      <div className="aw-gate">
        <h1>Admin access required</h1>
        <Link to="/">Back to TapAway</Link>
      </div>
    );
  const section =
    new URLSearchParams(location.search).get("section") || "overview";
  const current =
    location.pathname === "/admin"
      ? section === "accounts"
        ? "hubs"
        : section
      : location.pathname === "/admin/analytics"
        ? "insights"
        : location.pathname.includes("order") ||
            location.pathname.includes("fulfillment")
          ? "orders"
          : location.pathname.includes("email")
            ? "messages"
            : location.pathname === "/dashboard"
              ? "hubs"
              : "tools";
  const nav = (
    <>
      <Link to="/admin" className="aw-brand">
        <span className="aw-mark">
          t<span>↗</span>
        </span>
        <span>
          TapAway<span className="aw-brand-sub">YOUR WORKSPACE</span>
        </span>
      </Link>
      <nav aria-label="Admin navigation">
        {adminDestinations.slice(0, 6).map((item, i) => {
          const Icon = icons[i];
          return (
            <Link
              key={item.id}
              to={item.path}
              aria-current={current === item.id ? "page" : undefined}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="aw-sidebar-bottom">
        <div className="aw-owner">
          <span>J</span>
          <div>
            <strong>Your workspace</strong>
            <small>{user?.email}</small>
          </div>
        </div>
        <Link to="/" target="_blank">
          View website <ArrowUpRight size={15} />
        </Link>
        <button
          onClick={async () => {
            await signOut();
            navigate("/auth");
          }}
        >
          <LogOut size={15} />
          Log out
        </button>
      </div>
    </>
  );
  return (
    <div className="aw-shell">
      <aside className="aw-sidebar">{nav}</aside>
      <Sheet open={mobile} onOpenChange={setMobile}>
        <SheetContent side="left" className="aw-mobile-nav">
          <SheetHeader className="sr-only">
            <SheetTitle>Admin navigation</SheetTitle>
            <SheetDescription>Navigate your workspace</SheetDescription>
          </SheetHeader>
          {nav}
        </SheetContent>
      </Sheet>
      <div className="aw-body">
        <header className="aw-topbar">
          <button
            className="aw-menu"
            aria-label="Open admin menu"
            onClick={() => setMobile(true)}
          >
            <Menu />
          </button>
          <span className="aw-breadcrumb">
            Workspace <span>/</span>{" "}
            {adminDestinations.find((x) => x.id === current)?.label}
          </span>
          <button className="aw-search-trigger" onClick={() => setFinder(true)}>
            <Search size={17} />
            <span>Find a hub or ask for anything</span>
            <kbd>⌘ K</kbd>
          </button>
          <span className="aw-owner-dot" title="Your private admin workspace">
            J
          </span>
        </header>
        <main className="aw-main">
          <Suspense
            fallback={
              <div className="aw-loading">
                <Loader2 className="animate-spin" />
                Opening…
              </div>
            }
          >
            {children}
          </Suspense>
        </main>
        <button
          className="aw-assistant-trigger"
          onClick={() => setFinder(true)}
        >
          <Sparkles size={17} /> Quick find
        </button>
      </div>
      <AdminFinder open={finder} onClose={() => setFinder(false)} />
    </div>
  );
}
