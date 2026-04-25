import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
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
import YelpDebugModal, { YelpDebugRestaurant } from "@/components/admin/YelpDebugModal";
import AdminBusinessLiteTable from "@/components/admin/AdminBusinessLiteTable";
import { toast } from "sonner";
import {
  Users,
  DollarSign,
  Wallet,
  FileText,
  Settings,
  ClipboardList,
  Copy,
  Loader2,
  Link as LinkIcon,
  Timer,
  ChevronDown,
  LogOut,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
};

type Location = {
  id: string;
  restaurant_id: string;
};

const NAV_CARDS = [
  { label: "Manage Reps", desc: "Applications & active reps", icon: Users, path: "/admin/reps" },
  { label: "Commissions", desc: "View & manage commissions", icon: DollarSign, path: "/admin/commissions" },
  { label: "ACH Payouts", desc: "Process payout batches", icon: Wallet, path: "/admin/payouts" },
  { label: "W-9 Tax Review", desc: "Review tax documents", icon: FileText, path: "/admin/tax-review" },
  { label: "Comp Settings", desc: "Rates & bonus thresholds", icon: Settings, path: "/admin/settings/comp" },
  { label: "Demo Requests", desc: "Demo kit requests", icon: ClipboardList, path: "/admin/demo-requests" },
];

const Admin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminAccess();

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

  // Promo Link Generator state
  const [promoDiscountType, setPromoDiscountType] = useState<string>("50_off");
  const [generatingPromo, setGeneratingPromo] = useState(false);
  const [promoUrl, setPromoUrl] = useState<string | null>(null);
  const [promoExpiresAt, setPromoExpiresAt] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
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
            "id, restaurant_name, header_title, custom_slug, plan_type, subscription_status, created_at, google_place_id, google_review_url, yelp_business_id, yelp_review_url, directions_url, instagram_url, logo_url, greeting_name"
          )
          .order("created_at", { ascending: false });

        if (restaurantsError) throw restaurantsError;

        const restaurantIds = (allRestaurants ?? []).map(r => r.id);
        const { data: tapCounts, error: tapsError } = await supabase
          .from("analytics_events")
          .select("restaurant_id")
          .eq("event_type", "tap")
          .in("restaurant_id", restaurantIds);

        if (tapsError) throw tapsError;

        const tapsMap: Record<string, number> = {};
        (tapCounts ?? []).forEach(event => {
          tapsMap[event.restaurant_id] = (tapsMap[event.restaurant_id] ?? 0) + 1;
        });

        const restaurantsWithTaps = (allRestaurants ?? []).map(r => ({
          ...r,
          total_taps: tapsMap[r.id] ?? 0
        }));

        const { data: locationsData, error: locationsError } = await supabase
          .from("locations")
          .select("id, restaurant_id");

        if (locationsError) throw locationsError;

        setRestaurants(restaurantsWithTaps);
        setLocations(locationsData ?? []);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Unknown error";
        setError(message);
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
      const message = e instanceof Error ? e.message : "Unknown error";
      setError(message);
    } finally {
      setSavingEdit(false);
    }
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
      const message = e instanceof Error ? e.message : "Unknown error";
      setError("Failed to repair link: " + message);
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
        body: { restaurantId: deletingRestaurant.id }
      });
      if (deleteError) throw deleteError;
      if (data?.error) throw new Error(data.error as string);
      if (data?.warning) toast.warning(data.warning as string);
      else toast.success("Account completely deleted");
      setRestaurants((prev) => prev.filter((x) => x.id !== deletingRestaurant.id));
      setDeletingRestaurant(null);
      setDeleteConfirmText("");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      setError("Delete failed: " + message);
    } finally {
      setDeleting(false);
    }
  };

  const openHub = (r: Restaurant) => {
    if (!r.custom_slug) return;
    window.open(`/${r.custom_slug}`, "_blank");
  };

  // Promo link generator
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
      const message = e instanceof Error ? e.message : "Failed to generate promo link";
      toast.error(message);
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
    return <div className="p-6">Loading...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Access denied</h1>
        <p className="text-muted-foreground">
          This page is only for {SUPER_ADMIN_EMAIL}
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">TapAway Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">Logged in as {user?.email}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => { await signOut(); navigate("/auth"); }}
          className="shrink-0"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Log out
        </Button>
      </div>

      {/* Sales Rep Portal — Collapsible on mobile */}
      <Collapsible defaultOpen={false} className="space-y-3">
        <CollapsibleTrigger className="flex items-center justify-between w-full group">
          <div>
            <h2 className="font-semibold text-lg text-left">Sales Rep Portal</h2>
            <p className="text-sm text-muted-foreground text-left">
              Manage 1099 sales reps, applications, commissions, and tax documents.
            </p>
          </div>
          <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-1">
            {NAV_CARDS.map((card) => (
              <Card
                key={card.path}
                className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
                onClick={() => navigate(card.path)}
              >
                <CardContent className="p-4 flex flex-col gap-2">
                  <card.icon className="h-5 w-5 text-primary" />
                  <span className="font-medium text-sm">{card.label}</span>
                  <span className="text-xs text-muted-foreground leading-tight">{card.desc}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Promo Link Generator */}
      <section className="bg-card border rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <LinkIcon className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Promo Link Generator</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Generate a one-time onboarding link with a discount. Links expire after 30 minutes.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          <div className="space-y-1.5 w-full sm:w-auto">
            <Label className="text-xs">Discount Type</Label>
            <Select value={promoDiscountType} onValueChange={setPromoDiscountType}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50_off">50% Off</SelectItem>
                <SelectItem value="free">100% Free</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleGeneratePromo} disabled={generatingPromo}>
            {generatingPromo ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
            ) : (
              <><Timer className="h-4 w-4 mr-2" />Generate 30-Min Link</>
            )}
          </Button>
        </div>
        {promoUrl && (
          <div className="bg-muted/50 border rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Input value={promoUrl} readOnly className="text-xs font-mono flex-1" />
              <Button variant="outline" size="sm" onClick={copyPromoUrl}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            {promoExpiresAt && (
              <p className="text-xs text-muted-foreground">
                Expires: {new Date(promoExpiresAt).toLocaleTimeString()}
              </p>
            )}
          </div>
        )}
      </section>

      {/* Client Management Tabs */}
      <Tabs defaultValue="restaurants" className="space-y-4">
        <TabsList>
          <TabsTrigger value="business-lite">Business Lite</TabsTrigger>
          <TabsTrigger value="restaurants">Restaurants</TabsTrigger>
        </TabsList>

        <TabsContent value="business-lite">
          <AdminBusinessLiteTable />
        </TabsContent>

        <TabsContent value="restaurants">
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <Input
                placeholder="Search name or slug"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All plans" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All plans</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="bundle">Bundle</SelectItem>
                  <SelectItem value="lite">Lite</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error && <div className="text-destructive text-sm">{error}</div>}

            <div className="overflow-x-auto border rounded-lg">
              <table className="min-w-[800px] w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="p-2 text-left">Name</th>
                    <th className="p-2">Slug</th>
                    <th className="p-2">Taps</th>
                    <th className="p-2">Plan</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Locations</th>
                    <th className="p-2">Created</th>
                    <th className="p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRestaurants.map((r) => (
                    <tr key={r.id} className="border-b hover:bg-muted/50">
                      <td className="p-2">
                        <div className="font-medium">{r.restaurant_name ?? "(no name)"}</div>
                        <div className="text-xs text-muted-foreground">{r.header_title}</div>
                      </td>
                      <td className="p-2 text-xs font-mono">{r.custom_slug ?? "—"}</td>
                      <td className="p-2 font-medium">{r.total_taps?.toLocaleString() ?? 0}</td>
                      <td className="p-2">{r.plan_type ?? "—"}</td>
                      <td className="p-2">{r.subscription_status ?? "—"}</td>
                      <td className="p-2 text-center">{locationsCount[r.id] ?? 0}</td>
                      <td className="p-2">{r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}</td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-2 text-xs">
                          <Button onClick={() => openEdit(r)} variant="outline" size="sm">Edit</Button>
                          <Button onClick={() => openHub(r)} variant="outline" size="sm">Hub</Button>
                          <Button onClick={() => navigate(`/dashboard?admin_view=${r.id}`)} variant="outline" size="sm">View Dashboard</Button>
                          <Button onClick={() => toggleSub(r)} variant="outline" size="sm">Toggle Sub</Button>
                          <Button onClick={() => repairGoogleReviewLink(r)} variant="outline" size="sm">Repair Google Link</Button>
                          <Button
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
                            variant="outline"
                            size="sm"
                          >
                            Yelp debug
                          </Button>
                          <Button
                            onClick={() => startDelete(r)}
                            variant="outline"
                            size="sm"
                            className="text-destructive border-destructive hover:bg-destructive/10"
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!loadingData && filteredRestaurants.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-4 text-center text-xs text-muted-foreground">
                        No restaurants match filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

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
