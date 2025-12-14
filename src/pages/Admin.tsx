import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { getAppSettings, setPaywallEnabled } from "@/lib/appSettings";
import { toast } from "sonner";

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

const Admin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
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

  // Paywall control state
  const [paywallEnabled, setPaywallEnabledState] = useState(true);
  const [loadingPaywallSetting, setLoadingPaywallSetting] = useState(true);
  const [updatingPaywall, setUpdatingPaywall] = useState(false);

  // Legacy client creation state
  const [legacyClientEmail, setLegacyClientEmail] = useState("");
  const [legacyClientPassword, setLegacyClientPassword] = useState("");
  const [legacyClientName, setLegacyClientName] = useState("");
  const [legacyRestaurantName, setLegacyRestaurantName] = useState("");
  const [legacyStripeCustomerId, setLegacyStripeCustomerId] = useState("");
  const [legacyStripePriceId, setLegacyStripePriceId] = useState("");
  const [creatingLegacyClient, setCreatingLegacyClient] = useState(false);

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
        // Get all restaurants
        const { data: allRestaurants, error: restaurantsError } = await supabase
          .from("restaurants")
          .select(
            "id, restaurant_name, header_title, custom_slug, plan_type, subscription_status, created_at, google_place_id, google_review_url, yelp_business_id, yelp_review_url, directions_url, instagram_url, logo_url, greeting_name"
          )
          .order("created_at", { ascending: false });

        if (restaurantsError) throw restaurantsError;

        // Get tap counts for each restaurant
        const restaurantIds = (allRestaurants ?? []).map(r => r.id);
        const { data: tapCounts, error: tapsError } = await supabase
          .from("analytics_events")
          .select("restaurant_id")
          .eq("event_type", "tap")
          .in("restaurant_id", restaurantIds);

        if (tapsError) throw tapsError;

        // Count taps per restaurant
        const tapsMap: Record<string, number> = {};
        (tapCounts ?? []).forEach(event => {
          tapsMap[event.restaurant_id] = (tapsMap[event.restaurant_id] ?? 0) + 1;
        });

        // Add tap counts to ALL restaurants (no filtering)
        const restaurantsWithTaps = (allRestaurants ?? []).map(r => ({
          ...r,
          total_taps: tapsMap[r.id] ?? 0
        }));

        // Get locations
        const { data: locationsData, error: locationsError } = await supabase
          .from("locations")
          .select("id, restaurant_id");

        if (locationsError) throw locationsError;

        setRestaurants(restaurantsWithTaps);
        setLocations(locationsData ?? []);
      } catch (e: any) {
        setError(e.message);
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

      if (planFilter !== "all") {
        ok = ok && r.plan_type === planFilter;
      }

      if (statusFilter !== "all") {
        ok = ok && r.subscription_status === statusFilter;
      }

      return ok;
    });
  }, [restaurants, search, planFilter, statusFilter]);

  const openEdit = (r: Restaurant) => setEditingRestaurant(r);

  const changeEdit = (field: keyof Restaurant, value: any) => {
    if (!editingRestaurant) return;
    setEditingRestaurant({ ...editingRestaurant, [field]: value });
  };

  const saveEdit = async () => {
    if (!editingRestaurant) return;

    setSavingEdit(true);
    try {
      const { id, ...updates } = editingRestaurant;

      const validUpdates: any = {};
      const fields = [
        "google_review_url",
        "yelp_review_url",
        "directions_url",
        "instagram_url",
        "logo_url",
        "custom_slug",
        "greeting_name",
      ];

      fields.forEach((f) => {
        if (f in updates) validUpdates[f] = (updates as any)[f];
      });

      const { data, error } = await supabase
        .from("restaurants")
        .update(validUpdates)
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;

      setRestaurants((prev) => prev.map((r) => (r.id === id ? data : r)));
      setEditingRestaurant(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const toggleSub = async (r: Restaurant) => {
    const next = r.subscription_status === "active" ? "paused" : "active";

    const { data, error } = await supabase
      .from("restaurants")
      .update({ subscription_status: next })
      .eq("id", r.id)
      .select("*")
      .single();

    if (!error) {
      setRestaurants((prev) => prev.map((x) => (x.id === r.id ? data : x)));
    }
  };

  const repairGoogleReviewLink = async (r: Restaurant) => {
    if (!r.google_place_id || !r.google_place_id.trim()) {
      setError("No Google Place ID is set for this restaurant.");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("restaurants")
        .update({
          google_place_id: r.google_place_id,
        })
        .eq("id", r.id)
        .select("id, google_place_id, google_review_url")
        .single();

      if (error) throw error;

      setRestaurants((prev) =>
        prev.map((x) => (x.id === r.id ? { ...x, ...data } : x))
      );

      setError(null);
    } catch (e: any) {
      setError("Failed to repair link: " + (e.message ?? "Unknown error"));
    }
  };

  const startDelete = (r: Restaurant) => {
    setDeletingRestaurant(r);
    setDeleteConfirmText("");
  };

  const confirmDelete = async () => {
    if (!deletingRestaurant) return;
    if (deleteConfirmText !== "DELETE ACCOUNT") return;

    setDeleting(true);

    try {
      // Call edge function to fully delete user and all related data
      const { data, error } = await supabase.functions.invoke("delete-user-complete", {
        body: { restaurantId: deletingRestaurant.id }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.warning) {
        toast.warning(data.warning);
      } else {
        toast.success("Account completely deleted");
      }

      setRestaurants((prev) => prev.filter((x) => x.id !== deletingRestaurant.id));
      setDeletingRestaurant(null);
      setDeleteConfirmText("");
    } catch (e: any) {
      setError("Delete failed: " + e.message);
    } finally {
      setDeleting(false);
    }
  };

  const openHub = (r: Restaurant) => {
    if (!r.custom_slug) return;
    window.open(`/${r.custom_slug}`, "_blank");
  };

  // Load paywall settings
  useEffect(() => {
    if (!isAdmin || adminLoading) return;
    
    const loadPaywallSetting = async () => {
      setLoadingPaywallSetting(true);
      const settings = await getAppSettings(supabase);
      setPaywallEnabledState(settings.paywallEnabled);
      setLoadingPaywallSetting(false);
    };
    
    loadPaywallSetting();
  }, [isAdmin, adminLoading]);

  const handlePaywallToggle = async (enabled: boolean) => {
    const previousValue = paywallEnabled;
    setPaywallEnabledState(enabled);
    setUpdatingPaywall(true);
    
    const result = await setPaywallEnabled(supabase, enabled);
    
    if (result.success) {
      toast.success(enabled ? "Paywall enabled for new users." : "Paywall disabled for new/test users.");
    } else {
      // Revert on error
      setPaywallEnabledState(previousValue);
      toast.error("Failed to update paywall setting: " + result.error);
    }
    
    setUpdatingPaywall(false);
  };

  const handleCreateLegacyClient = async () => {
    if (!legacyClientEmail || !legacyClientPassword || !legacyRestaurantName) {
      toast.error("Email, password, and restaurant name are required");
      return;
    }

    setCreatingLegacyClient(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-legacy-client-account", {
        body: {
          email: legacyClientEmail,
          password: legacyClientPassword,
          restaurantName: legacyRestaurantName,
          ownerName: legacyClientName,
          stripeCustomerId: legacyStripeCustomerId || null,
          stripePriceId: legacyStripePriceId || null,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Account created for ${legacyClientEmail}`);
      
      // Reset form
      setLegacyClientEmail("");
      setLegacyClientPassword("");
      setLegacyClientName("");
      setLegacyRestaurantName("");
      setLegacyStripeCustomerId("");
      setLegacyStripePriceId("");

      // Reload restaurants list
      window.location.reload();
    } catch (e: any) {
      toast.error("Failed to create account: " + e.message);
    } finally {
      setCreatingLegacyClient(false);
    }
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
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">TapAway Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Logged in as {user?.email}
        </p>
      </div>

      {/* Sales Rep Portal Admin Links */}
      <section className="bg-card border rounded-xl p-4 space-y-3">
        <h2 className="font-semibold">Sales Rep Portal</h2>
        <p className="text-sm text-muted-foreground">
          Manage 1099 sales reps, applications, commissions, and tax documents.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => navigate('/admin/reps')} variant="outline">
            Manage Reps & Applications
          </Button>
          <Button onClick={() => navigate('/admin/commissions')} variant="outline">
            Commission Management
          </Button>
          <Button onClick={() => navigate('/admin/payouts')} variant="outline">
            ACH Payouts
          </Button>
          <Button onClick={() => navigate('/admin/tax-review')} variant="outline">
            W-9 Tax Review
          </Button>
          <Button onClick={() => navigate('/admin/settings/comp')} variant="outline">
            Compensation Settings
          </Button>
          <Button onClick={() => navigate('/admin/demo-requests')} variant="outline">
            Demo Kit Requests
          </Button>
        </div>
      </section>

      <section className="bg-card border rounded-xl p-4 space-y-3">
        <h2 className="font-semibold">Paywall Control</h2>
        <p className="text-sm text-muted-foreground">
          Toggle the global paywall for new/test users. When OFF, new signups can use TapAway without paying. Existing restaurants are not affected.
        </p>
        <div className="flex items-center gap-3">
          <Switch
            checked={paywallEnabled}
            onCheckedChange={handlePaywallToggle}
            disabled={loadingPaywallSetting || updatingPaywall}
          />
          <span className="text-sm font-medium">
            {loadingPaywallSetting ? "Loading..." : paywallEnabled ? "Paywall ON" : "Paywall OFF"}
          </span>
          {updatingPaywall && <span className="text-xs text-muted-foreground">Updating...</span>}
        </div>
        <p className="text-xs text-muted-foreground">
          Note: AI Coach remains locked until 1,000 taps regardless of this setting.
        </p>
      </section>

      {/* Create Legacy Client Account */}
      <section className="bg-card border rounded-xl p-4 space-y-3">
        <h2 className="font-semibold">Create Legacy Client Account</h2>
        <p className="text-sm text-muted-foreground">
          Create a portal account for an existing Stripe customer who doesn't have a login yet.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>Email *</Label>
            <Input
              placeholder="client@example.com"
              value={legacyClientEmail}
              onChange={(e) => setLegacyClientEmail(e.target.value)}
            />
          </div>
          <div>
            <Label>Password *</Label>
            <Input
              type="text"
              placeholder="Permanent password"
              value={legacyClientPassword}
              onChange={(e) => setLegacyClientPassword(e.target.value)}
            />
          </div>
          <div>
            <Label>Owner Name</Label>
            <Input
              placeholder="John Doe"
              value={legacyClientName}
              onChange={(e) => setLegacyClientName(e.target.value)}
            />
          </div>
          <div>
            <Label>Restaurant Name *</Label>
            <Input
              placeholder="Joe's Pizza"
              value={legacyRestaurantName}
              onChange={(e) => setLegacyRestaurantName(e.target.value)}
            />
          </div>
          <div>
            <Label>Stripe Customer ID</Label>
            <Input
              placeholder="cus_XXXXXX"
              value={legacyStripeCustomerId}
              onChange={(e) => setLegacyStripeCustomerId(e.target.value)}
            />
          </div>
          <div>
            <Label>Stripe Price ID</Label>
            <Input
              placeholder="price_XXXXXX"
              value={legacyStripePriceId}
              onChange={(e) => setLegacyStripePriceId(e.target.value)}
            />
          </div>
        </div>
        <Button
          onClick={handleCreateLegacyClient}
          disabled={creatingLegacyClient || !legacyClientEmail || !legacyClientPassword || !legacyRestaurantName}
        >
          {creatingLegacyClient ? "Creating..." : "Create Account"}
        </Button>
      </section>

      <section className="bg-card border rounded-xl p-4 space-y-3">
        <h2 className="font-semibold">Filters</h2>
        <div className="flex flex-col md:flex-row gap-3">
          <Input
            placeholder="Search name or slug"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger>
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
            <SelectTrigger>
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
      </section>

      <section className="bg-card border rounded-xl p-4">
        <h2 className="font-semibold mb-3">Restaurants</h2>
        {error && <div className="text-destructive text-sm mb-3">{error}</div>}

        <div className="overflow-auto">
          <table className="min-w-full text-sm">
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
                    <div className="font-medium">
                      {r.restaurant_name ?? "(no name)"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {r.header_title}
                    </div>
                  </td>
                  <td className="p-2 text-xs font-mono">
                    {r.custom_slug ?? "—"}
                  </td>
                  <td className="p-2 font-medium">
                    {r.total_taps?.toLocaleString() ?? 0}
                  </td>
                  <td className="p-2">{r.plan_type ?? "—"}</td>
                  <td className="p-2">{r.subscription_status ?? "—"}</td>
                  <td className="p-2 text-center">
                    {locationsCount[r.id] ?? 0}
                  </td>
                  <td className="p-2">
                    {r.created_at
                      ? new Date(r.created_at).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Button
                        onClick={() => openEdit(r)}
                        variant="outline"
                        size="sm"
                      >
                        Edit
                      </Button>
                      <Button
                        onClick={() => openHub(r)}
                        variant="outline"
                        size="sm"
                      >
                        Hub
                      </Button>
                      <Button
                        onClick={() => toggleSub(r)}
                        variant="outline"
                        size="sm"
                      >
                        Toggle Sub
                      </Button>
                      <Button
                        onClick={() => repairGoogleReviewLink(r)}
                        variant="outline"
                        size="sm"
                      >
                        Repair Google Link
                      </Button>
                      <Button
                        onClick={() =>
                          setYelpDebugTarget({
                            id: r.id,
                            restaurant_name: r.restaurant_name,
                            google_place_id: r.google_place_id ?? null,
                            google_review_url: r.google_review_url ?? null,
                            yelp_business_id: (r as any).yelp_business_id ?? null,
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
                  <td
                    colSpan={8}
                    className="p-4 text-center text-xs text-muted-foreground"
                  >
                    No restaurants match filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog open={!!editingRestaurant} onOpenChange={() => setEditingRestaurant(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Edit – {editingRestaurant?.restaurant_name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Greeting Name</Label>
              <Input
                value={editingRestaurant?.greeting_name ?? ""}
                onChange={(e) =>
                  changeEdit("greeting_name", e.target.value)
                }
              />
            </div>

            <div>
              <Label>Slug</Label>
              <Input
                value={editingRestaurant?.custom_slug ?? ""}
                onChange={(e) => changeEdit("custom_slug", e.target.value)}
              />
            </div>

            <div>
              <Label>Google Reviews</Label>
              <Input
                value={editingRestaurant?.google_review_url ?? ""}
                onChange={(e) =>
                  changeEdit("google_review_url", e.target.value)
                }
              />
            </div>

            <div>
              <Label>Yelp Reviews</Label>
              <Input
                value={editingRestaurant?.yelp_review_url ?? ""}
                onChange={(e) =>
                  changeEdit("yelp_review_url", e.target.value)
                }
              />
            </div>

            <div>
              <Label>Directions</Label>
              <Input
                value={editingRestaurant?.directions_url ?? ""}
                onChange={(e) =>
                  changeEdit("directions_url", e.target.value)
                }
              />
            </div>

            <div>
              <Label>Instagram</Label>
              <Input
                value={editingRestaurant?.instagram_url ?? ""}
                onChange={(e) =>
                  changeEdit("instagram_url", e.target.value)
                }
              />
            </div>

            <div>
              <Label>Logo URL</Label>
              <Input
                value={editingRestaurant?.logo_url ?? ""}
                onChange={(e) =>
                  changeEdit("logo_url", e.target.value)
                }
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setEditingRestaurant(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={saveEdit}
                disabled={savingEdit}
              >
                {savingEdit ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingRestaurant} onOpenChange={() => setDeletingRestaurant(null)}>
        <DialogContent className="max-w-md border-destructive">
          <DialogHeader>
            <DialogTitle className="text-destructive">
              Delete Account – {deletingRestaurant?.restaurant_name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This action is <strong>permanent</strong> and cannot be undone.
              To confirm, type <span className="font-mono font-bold">DELETE ACCOUNT</span>.
            </p>

            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
              placeholder="DELETE ACCOUNT"
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setDeletingRestaurant(null)}
                disabled={deleting}
              >
                Cancel
              </Button>

              <Button
                onClick={confirmDelete}
                disabled={deleteConfirmText !== "DELETE ACCOUNT" || deleting}
                variant="destructive"
              >
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
            setRestaurants((prev) =>
              prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r))
            );
            setYelpDebugTarget(updated);
          }}
        />
      )}
    </div>
  );
};

export default Admin;
