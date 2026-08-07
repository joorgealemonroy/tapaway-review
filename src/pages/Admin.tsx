import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import YelpDebugModal, { YelpDebugRestaurant } from "@/components/admin/YelpDebugModal";
import AdminBusinessLiteTable from "@/components/admin/AdminBusinessLiteTable";
import AdminPendingHubApprovals from "@/components/admin/AdminPendingHubApprovals";
import AdminUnifiedAccountsTable from "@/components/admin/AdminUnifiedAccountsTable";
import { toast } from "sonner";
import {
  Users,
  Settings,
  Copy,
  Loader2,
  Link as LinkIcon,
  Timer,
  LogOut,
  MessageSquare,
  LayoutDashboard,
  Building2,
  Pencil,
  ExternalLink,
  MoreVertical,
  Plus,
  Menu,
  DollarSign,
  Wallet,
  FileText,
  ClipboardList,
  ChevronRight,
  Activity,
  AlertTriangle,
  Printer,
} from "lucide-react";

const SUPER_ADMIN_EMAIL = "tap@tapaway.co";

type Restaurant = {
  id: string;
  restaurant_name: string | null;
  header_title?: string | null;
  custom_slug?: string | null;
  plan_type?: string | null;
  subscription_status?: string | null;
  created_at?: string | null;
  google_place_id?: string | null;
  google_review_url?: string | null;
  yelp_business_id?: string | null;
  yelp_review_url?: string | null;
  directions_url?: string | null;
  instagram_url?: string | null;
  logo_url?: string | null;
  greeting_name?: string | null;
  total_taps?: number;
  card_print_pdf_path?: string | null;
  is_approved?: boolean;
};

type Location = {
  id: string;
  restaurant_id: string;
};

type Section = "overview" | "accounts" | "reps" | "promo" | "system";

const NAV = [
  { id: "overview" as const, label: "Overview", icon: LayoutDashboard },
  { id: "accounts" as const, label: "Accounts & Hubs", icon: Building2 },
  { id: "print" as const, label: "Print & Ship Queue", icon: Printer, path: "/admin/print-queue" },
  { id: "reps" as const, label: "Sales Reps", icon: Users },
  { id: "promo" as const, label: "Promo Links", icon: LinkIcon },
  { id: "system" as const, label: "System & SMS", icon: Settings },
];

const REP_CARDS = [
  { label: "Manage Reps", desc: "Applications & active reps", icon: Users, path: "/admin/reps" },
  { label: "Commissions", desc: "View & manage commissions", icon: DollarSign, path: "/admin/commissions" },
  { label: "ACH Payouts", desc: "Process payout batches", icon: Wallet, path: "/admin/payouts" },
  { label: "W-9 Tax Review", desc: "Review tax documents", icon: FileText, path: "/admin/tax-review" },
  { label: "Demo Requests", desc: "Demo kit requests", icon: ClipboardList, path: "/admin/demo-requests" },
];

const SYSTEM_LINKS = [
  { label: "Print Queue", desc: "Track & bulk download card PDFs", icon: Printer, path: "/admin/print-queue" },
  { label: "Hub Health", desc: "Verify every live hub is publicly reachable", icon: Activity, path: "/admin/hub-health" },
  { label: "App Errors", desc: "Recent crashes captured from the app", icon: AlertTriangle, path: "/admin/errors" },
  { label: "VIP SMS Subscribers", desc: "Search & export VIP text lists", icon: MessageSquare, path: "/admin/sms-subscribers" },
  { label: "Comp Settings", desc: "Rates & bonus thresholds", icon: Settings, path: "/admin/settings/comp" },
];

const Admin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminAccess();

  const [section, setSection] = useState<Section>("overview");
  const [segment, setSegment] = useState<"all" | "legacy" | "lite">("all");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [deletingRestaurant, setDeletingRestaurant] = useState<Restaurant | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [yelpDebugTarget, setYelpDebugTarget] = useState<YelpDebugRestaurant | null>(null);

  const [promoDiscountType, setPromoDiscountType] = useState<string>("50_off");
  const [generatingPromo, setGeneratingPromo] = useState(false);
  const [promoUrl, setPromoUrl] = useState<string | null>(null);
  const [promoExpiresAt, setPromoExpiresAt] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!isAdmin || adminLoading) return;

    const loadData = async () => {
      setLoadingData(true);
      setError(null);
      try {
        const { data: allRestaurants, error: restaurantsError } = await supabase
          .from("restaurants")
          .select(
            "id, restaurant_name, header_title, custom_slug, plan_type, subscription_status, created_at, google_place_id, google_review_url, yelp_business_id, yelp_review_url, directions_url, instagram_url, logo_url, greeting_name, is_approved, card_print_pdf_path"
          )
          .order("created_at", { ascending: false });
        if (restaurantsError) throw restaurantsError;

        const restaurantIds = (allRestaurants ?? []).map((r) => r.id);
        const { data: tapCounts, error: tapsError } = await supabase
          .from("analytics_events")
          .select("restaurant_id")
          .eq("event_type", "tap")
          .in("restaurant_id", restaurantIds);
        if (tapsError) throw tapsError;

        const tapsMap: Record<string, number> = {};
        (tapCounts ?? []).forEach((event) => {
          tapsMap[event.restaurant_id] = (tapsMap[event.restaurant_id] ?? 0) + 1;
        });
        const restaurantsWithTaps = (allRestaurants ?? []).map((r) => ({
          ...r,
          total_taps: tapsMap[r.id] ?? 0,
        }));

        const { data: locationsData, error: locationsError } = await supabase
          .from("locations")
          .select("id, restaurant_id");
        if (locationsError) throw locationsError;

        setRestaurants(restaurantsWithTaps);
        setLocations(locationsData ?? []);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setLoadingData(false);
      }
    };
    loadData();
  }, [isAdmin, adminLoading]);

  const locationsCount = useMemo(() => {
    const map: Record<string, number> = {};
    locations.forEach((l) => {
      map[l.restaurant_id] = (map[l.restaurant_id] ?? 0) + 1;
    });
    return map;
  }, [locations]);

  const filteredRestaurants = useMemo(() => {
    return restaurants.filter((r) => {
      let ok = true;
      if (search.trim()) {
        const s = search.toLowerCase();
        const name = (r.restaurant_name ?? "").toLowerCase();
        const slug = (r.custom_slug ?? "").toLowerCase();
        ok = name.includes(s) || slug.includes(s);
      }
      if (planFilter !== "all") ok = ok && r.plan_type === planFilter;
      if (statusFilter !== "all") ok = ok && r.subscription_status === statusFilter;
      return ok;
    });
  }, [restaurants, search, planFilter, statusFilter]);

  const totalTaps = useMemo(
    () => restaurants.reduce((s, r) => s + (r.total_taps ?? 0), 0),
    [restaurants]
  );
  const activeSubs = useMemo(
    () => restaurants.filter((r) => r.subscription_status === "active").length,
    [restaurants]
  );

  const openEdit = (r: Restaurant) => setEditingRestaurant(r);

  const changeEdit = (field: keyof Restaurant, value: string) => {
    if (!editingRestaurant) return;
    setEditingRestaurant({ ...editingRestaurant, [field]: value });
  };

  const saveEdit = async () => {
    if (!editingRestaurant) return;
    setSavingEdit(true);
    try {
      const { id, ...updates } = editingRestaurant;
      const validUpdates: Record<string, unknown> = {};
      const fields = ["google_review_url", "yelp_review_url", "directions_url", "instagram_url", "logo_url", "custom_slug", "greeting_name"];
      fields.forEach((f) => {
        if (f in updates) validUpdates[f] = (updates as Record<string, unknown>)[f];
      });
      const { data, error: updateError } = await supabase
        .from("restaurants")
        .update(validUpdates)
        .eq("id", id)
        .select("*")
        .single();
      if (updateError) throw updateError;
      setRestaurants((prev) => prev.map((r) => (r.id === id ? data : r)));
      setEditingRestaurant(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSavingEdit(false);
    }
  };

  const downloadPrintPdf = async (r: Restaurant) => {
    if (!r.card_print_pdf_path) {
      toast.error("No print PDF on file");
      return;
    }
    const { data, error: signErr } = await supabase.storage
      .from("card-print-files")
      .createSignedUrl(r.card_print_pdf_path, 900, { download: `${r.custom_slug || r.id}-print.pdf` });
    if (signErr || !data?.signedUrl) {
      toast.error("Could not generate download link");
      return;
    }
    window.location.href = data.signedUrl;
  };

  const toggleSub = async (r: Restaurant) => {
    const next = r.subscription_status === "active" ? "paused" : "active";
    const { data, error: updateError } = await supabase
      .from("restaurants")
      .update({ subscription_status: next })
      .eq("id", r.id)
      .select("*")
      .single();
    if (!updateError && data) setRestaurants((prev) => prev.map((x) => (x.id === r.id ? data : x)));
  };

  const approveHub = async (r: Restaurant) => {
    // On approval, default the hub to Solo Pro so the premium layout
    // is unlocked from approval through owner-claim.
    const { data, error: approveError } = await supabase
      .from("restaurants")
      .update({ is_approved: true, plan_type: "solo_pro" })
      .eq("id", r.id)
      .select("*")
      .single();
    if (approveError) {
      toast.error("Approval failed: " + approveError.message);
      return;
    }
    if (data) {
      setRestaurants((prev) =>
        prev.map((x) => (x.id === r.id ? { ...x, is_approved: true, plan_type: "solo_pro" } : x))
      );
      toast.success(`Hub approved — Solo Pro dashboard unlocked for the rep.`);
    }
  };

  const repairGoogleReviewLink = async (r: Restaurant) => {
    if (!r.google_place_id || !r.google_place_id.trim()) {
      setError("No Google Place ID is set for this restaurant.");
      return;
    }
    try {
      const { data, error: repairError } = await supabase
        .from("restaurants")
        .update({ google_place_id: r.google_place_id })
        .eq("id", r.id)
        .select("id, google_place_id, google_review_url")
        .single();
      if (repairError) throw repairError;
      setRestaurants((prev) => prev.map((x) => (x.id === r.id ? { ...x, ...data } : x)));
      setError(null);
    } catch (e: unknown) {
      setError("Failed to repair link: " + (e instanceof Error ? e.message : "Unknown error"));
    }
  };

  const startDelete = (r: Restaurant) => {
    setDeletingRestaurant(r);
    setDeleteConfirmText("");
  };

  const confirmDelete = async () => {
    if (!deletingRestaurant || deleteConfirmText !== "DELETE ACCOUNT") return;
    setDeleting(true);
    try {
      const { data, error: deleteError } = await supabase.functions.invoke("delete-user-complete", {
        body: { restaurantId: deletingRestaurant.id },
      });
      if (deleteError) throw deleteError;
      if (data?.error) throw new Error(data.error as string);
      if (data?.warning) toast.warning(data.warning as string);
      else toast.success("Account completely deleted");
      setRestaurants((prev) => prev.filter((x) => x.id !== deletingRestaurant.id));
      setDeletingRestaurant(null);
      setDeleteConfirmText("");
    } catch (e: unknown) {
      setError("Delete failed: " + (e instanceof Error ? e.message : "Unknown error"));
    } finally {
      setDeleting(false);
    }
  };

  const openHub = (r: Restaurant) => {
    if (!r.custom_slug) return;
    window.open(`/${r.custom_slug}`, "_blank");
  };

  const handleGeneratePromo = async () => {
    setGeneratingPromo(true);
    setPromoUrl(null);
    try {
      const { data, error: promoError } = await supabase.functions.invoke("generate-promo-token", {
        body: { discount_type: promoDiscountType },
      });
      if (promoError) throw promoError;
      if (data?.error) throw new Error(data.error as string);
      setPromoUrl(data.url as string);
      setPromoExpiresAt(data.expires_at as string);
      toast.success("Promo link generated!");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to generate promo link");
    } finally {
      setGeneratingPromo(false);
    }
  };

  const copyPromoUrl = () => {
    if (!promoUrl) return;
    navigator.clipboard.writeText(promoUrl);
    toast.success("Link copied to clipboard");
  };

  if (authLoading || adminLoading) {
    return <div className="min-h-screen bg-[#0a0e1a] p-6 text-white/60">Loading...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] p-6 text-white">
        <h1 className="text-xl font-semibold">Access denied</h1>
        <p className="text-white/60">This page is only for {SUPER_ADMIN_EMAIL}</p>
      </div>
    );
  }

  const sectionTitle = NAV.find((n) => n.id === section)?.label ?? "";

  const NavList = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="flex flex-col gap-0.5">
      {NAV.map((item) => {
        const active = section === item.id;
        return (
          <button
            key={item.id}
            onClick={() => {
              if ("path" in item && item.path) {
                navigate(item.path);
              } else {
                setSection(item.id as Section);
              }
              onNavigate?.();
            }}
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm text-left transition-colors ${
              active
                ? "bg-white/5 text-white"
                : "text-white/60 hover:text-white hover:bg-white/[0.03]"
            }`}
          >
            <item.icon className="h-4 w-4" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );

  const Sidebar = ({ onNavigate }: { onNavigate?: () => void }) => (
    <div className="flex flex-col h-full w-60 bg-[#0a0e1a] border-r border-white/5 px-4 py-6">
      <div className="px-3 mb-6">
        <div className="text-white font-semibold tracking-tight">TapAway</div>
        <div className="text-[11px] uppercase tracking-widest text-white/40 mt-0.5">Admin</div>
      </div>
      <NavList onNavigate={onNavigate} />
      <div className="mt-auto pt-4 border-t border-white/5">
        <div className="px-3 pb-3 text-[11px] text-white/40 truncate">{user?.email}</div>
        <button
          onClick={async () => {
            await signOut();
            navigate("/auth");
          }}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm text-white/60 hover:text-white hover:bg-white/[0.03] transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      </div>
    </div>
  );

  const Panel = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`rounded-xl border border-white/5 bg-white/[0.02] ${className}`}>{children}</div>
  );

  const renderLegacyTable = () => (
    <div className="overflow-x-auto rounded-xl border border-white/5">
      <table className="min-w-[900px] w-full text-sm">
        <thead>
          <tr className="bg-white/[0.02] text-white/50 uppercase tracking-wide text-[11px]">
            <th className="p-3 text-left font-medium">Name</th>
            <th className="p-3 text-left font-medium">Slug</th>
            <th className="p-3 text-left font-medium">Taps</th>
            <th className="p-3 text-left font-medium">Plan</th>
            <th className="p-3 text-left font-medium">Status</th>
            <th className="p-3 text-left font-medium">Locations</th>
            <th className="p-3 text-left font-medium">Approval</th>
            <th className="p-3 text-left font-medium">Created</th>
            <th className="p-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredRestaurants.map((r) => (
            <tr key={r.id} className="border-t border-white/5 hover:bg-white/[0.02] transition-colors">
              <td className="p-3">
                <div className="font-medium text-white/90">{r.restaurant_name ?? "(no name)"}</div>
                {r.header_title && <div className="text-xs text-white/40">{r.header_title}</div>}
              </td>
              <td className="p-3 text-xs font-mono text-white/60">{r.custom_slug ?? "—"}</td>
              <td className="p-3 text-white/80">{r.total_taps?.toLocaleString() ?? 0}</td>
              <td className="p-3 text-white/70">{r.plan_type ?? "—"}</td>
              <td className="p-3">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] ${
                    r.subscription_status === "active"
                      ? "bg-emerald-500/10 text-emerald-300"
                      : r.subscription_status === "paused"
                      ? "bg-amber-500/10 text-amber-300"
                      : r.subscription_status === "canceled"
                      ? "bg-red-500/10 text-red-300"
                      : "bg-white/[0.04] text-white/50"
                  }`}
                >
                  {r.subscription_status ?? "—"}
                </span>
              </td>
              <td className="p-3 text-white/60">{locationsCount[r.id] ?? 0}</td>
              <td className="p-3">
                {r.is_approved ? (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] bg-emerald-500/10 text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Approved
                  </span>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => approveHub(r)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500 text-[#0a0e1a] hover:bg-emerald-400"
                    >
                      Approve Hub
                    </button>
                    {r.custom_slug && (
                      <button
                        onClick={() => window.open(`/${r.custom_slug}`, "_blank")}
                        className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] border border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06]"
                      >
                        Review Layout
                      </button>
                    )}
                  </div>
                )}
              </td>
              <td className="p-3 text-white/50 text-xs">
                {r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}
              </td>
              <td className="p-3">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    onClick={() => openEdit(r)}
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/[0.05]"
                    aria-label="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => navigate(`/dashboard?admin_view=${r.id}`)}
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/[0.05]"
                    aria-label="View Dashboard"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/[0.05]"
                        aria-label="More actions"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuItem onClick={() => openHub(r)}>
                        <ExternalLink className="h-4 w-4 mr-2" /> Open Hub
                      </DropdownMenuItem>
                      {r.card_print_pdf_path && (
                        <DropdownMenuItem onClick={() => downloadPrintPdf(r)}>
                          <FileText className="h-4 w-4 mr-2" /> Print PDF
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => toggleSub(r)}>
                        Toggle Subscription
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => repairGoogleReviewLink(r)}>
                        Repair Google Link
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          setYelpDebugTarget({
                            id: r.id,
                            restaurant_name: r.restaurant_name,
                            google_place_id: r.google_place_id ?? null,
                            google_review_url: r.google_review_url ?? null,
                            yelp_business_id: (r as Record<string, unknown>).yelp_business_id as string ?? null,
                            yelp_review_url: r.yelp_review_url ?? null,
                          })
                        }
                      >
                        Yelp Debug
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => startDelete(r)}
                        className="text-red-400/80 focus:text-red-400 focus:bg-red-500/10"
                      >
                        Delete Account
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </td>
            </tr>
          ))}
          {!loadingData && filteredRestaurants.length === 0 && (
            <tr>
              <td colSpan={9} className="p-6 text-center text-xs text-white/40">
                No restaurants match filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const renderAccounts = () => (
    <div className="space-y-4">
      <AdminPendingHubApprovals />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">All Accounts</h3>
          <p className="text-xs text-white/40">
            Unified view — legacy businesses and Solo hubs together, sorted by engagement.
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="h-9 bg-white text-[#0a0e1a] hover:bg-white/90">
              <Plus className="h-4 w-4 mr-1" /> Add Account
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate("/onboarding")}>
              New Business (Legacy)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/personal/signup")}>
              New Solo Hub
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {error && <div className="text-red-400 text-sm">{error}</div>}

      <AdminUnifiedAccountsTable />
    </div>
  );

  const renderOverview = () => <AdminOverview onOpenAccounts={() => setSection("accounts")} />;


  const renderReps = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {REP_CARDS.map((c) => (
        <button
          key={c.path}
          onClick={() => navigate(c.path)}
          className="group flex flex-col gap-3 p-5 min-h-[128px] rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10 transition-all text-left"
        >
          <c.icon className="h-5 w-5 text-white/50 group-hover:text-primary transition-colors" />
          <div>
            <div className="text-sm font-medium text-white/90 group-hover:text-white">{c.label}</div>
            <div className="text-xs text-white/40 mt-0.5">{c.desc}</div>
          </div>
        </button>
      ))}
    </div>
  );

  const renderPromo = () => (
    <Panel className="p-6 max-w-2xl">
      <div className="flex items-center gap-2 mb-1">
        <LinkIcon className="h-4 w-4 text-white/60" />
        <h3 className="font-medium text-white">Promo Link Generator</h3>
      </div>
      <p className="text-sm text-white/40 mb-5">
        Generate a one-time onboarding link with a discount. Links expire after 30 minutes.
      </p>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
        <div className="space-y-1.5 sm:w-[200px]">
          <Label className="text-xs text-white/60">Discount Type</Label>
          <Select value={promoDiscountType} onValueChange={setPromoDiscountType}>
            <SelectTrigger className="bg-white/[0.03] border-white/5 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="50_off">50% Off</SelectItem>
              <SelectItem value="free">100% Free</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={handleGeneratePromo}
          disabled={generatingPromo}
          className="bg-white text-[#0a0e1a] hover:bg-white/90"
        >
          {generatingPromo ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
          ) : (
            <><Timer className="h-4 w-4 mr-2" />Generate 30-Min Link</>
          )}
        </Button>
      </div>
      {promoUrl && (
        <div className="mt-4 rounded-lg border border-white/5 bg-white/[0.03] p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Input value={promoUrl} readOnly className="text-xs font-mono flex-1 bg-transparent border-white/5 text-white/80" />
            <Button variant="outline" size="sm" onClick={copyPromoUrl} className="border-white/10 bg-transparent text-white/70 hover:bg-white/[0.05] hover:text-white">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          {promoExpiresAt && (
            <p className="text-xs text-white/40">
              Expires: {new Date(promoExpiresAt).toLocaleTimeString()}
            </p>
          )}
        </div>
      )}
    </Panel>
  );

  const renderSystem = () => (
    <Panel className="divide-y divide-white/5">
      {SYSTEM_LINKS.map((l) => (
        <button
          key={l.path}
          onClick={() => navigate(l.path)}
          className="group flex items-center gap-4 w-full p-4 hover:bg-white/[0.02] transition-colors text-left"
        >
          <l.icon className="h-4 w-4 text-white/50 group-hover:text-primary transition-colors" />
          <div className="flex-1">
            <div className="text-sm font-medium text-white/90">{l.label}</div>
            <div className="text-xs text-white/40">{l.desc}</div>
          </div>
          <ChevronRight className="h-4 w-4 text-white/30 group-hover:text-white/60" />
        </button>
      ))}
    </Panel>
  );

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex sticky top-0 h-screen">
        <Sidebar />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="p-0 w-60 bg-[#0a0e1a] border-white/5">
          <Sidebar onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-10 flex items-center gap-3 px-6 md:px-8 h-14 border-b border-white/5 bg-[#0a0e1a]/80 backdrop-blur">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-white/70 hover:text-white hover:bg-white/[0.05]"
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-sm font-medium text-white/90">{sectionTitle}</h1>
          <div className="ml-auto text-xs text-white/40 hidden sm:block">{user?.email}</div>
        </header>

        <main className="flex-1 px-6 md:px-8 py-6 overflow-x-hidden">
          {section === "overview" && renderOverview()}
          {section === "accounts" && renderAccounts()}
          {section === "reps" && renderReps()}
          {section === "promo" && renderPromo()}
          {section === "system" && renderSystem()}
        </main>
      </div>

      {/* Edit Restaurant Dialog */}
      <Dialog open={!!editingRestaurant} onOpenChange={() => setEditingRestaurant(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit – {editingRestaurant?.restaurant_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Greeting Name</Label><Input value={editingRestaurant?.greeting_name ?? ""} onChange={(e) => changeEdit("greeting_name", e.target.value)} /></div>
            <div><Label>Slug</Label><Input value={editingRestaurant?.custom_slug ?? ""} onChange={(e) => changeEdit("custom_slug", e.target.value)} /></div>
            <div><Label>Google Reviews</Label><Input value={editingRestaurant?.google_review_url ?? ""} onChange={(e) => changeEdit("google_review_url", e.target.value)} /></div>
            <div><Label>Yelp Reviews</Label><Input value={editingRestaurant?.yelp_review_url ?? ""} onChange={(e) => changeEdit("yelp_review_url", e.target.value)} /></div>
            <div><Label>Directions</Label><Input value={editingRestaurant?.directions_url ?? ""} onChange={(e) => changeEdit("directions_url", e.target.value)} /></div>
            <div><Label>Instagram</Label><Input value={editingRestaurant?.instagram_url ?? ""} onChange={(e) => changeEdit("instagram_url", e.target.value)} /></div>
            <div><Label>Logo URL</Label><Input value={editingRestaurant?.logo_url ?? ""} onChange={(e) => changeEdit("logo_url", e.target.value)} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditingRestaurant(null)}>Cancel</Button>
              <Button onClick={saveEdit} disabled={savingEdit}>{savingEdit ? "Saving..." : "Save"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Restaurant Dialog */}
      <Dialog open={!!deletingRestaurant} onOpenChange={() => setDeletingRestaurant(null)}>
        <DialogContent className="max-w-md border-destructive">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Account – {deletingRestaurant?.restaurant_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This action is <strong>permanent</strong>. Type <span className="font-mono font-bold">DELETE ACCOUNT</span> to confirm.
            </p>
            <Input value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())} placeholder="DELETE ACCOUNT" />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDeletingRestaurant(null)} disabled={deleting}>Cancel</Button>
              <Button onClick={confirmDelete} disabled={deleteConfirmText !== "DELETE ACCOUNT" || deleting} variant="destructive">
                {deleting ? "Deleting..." : "Delete Permanently"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {yelpDebugTarget && (
        <YelpDebugModal
          restaurant={yelpDebugTarget}
          onClose={() => setYelpDebugTarget(null)}
          onUpdated={(updated) => {
            setRestaurants((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
            setYelpDebugTarget(updated);
          }}
        />
      )}
    </div>
  );
};

export default Admin;
