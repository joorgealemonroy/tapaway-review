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
  yelp_review_url?: string | null;
  directions_url?: string | null;
  instagram_url?: string | null;
  logo_url?: string | null;
  greeting_name?: string | null;
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
        const [restaurantsRes, locationsRes] = await Promise.all([
          supabase
            .from("restaurants")
            .select(
              "id, restaurant_name, header_title, custom_slug, plan_type, subscription_status, created_at, google_place_id, google_review_url, yelp_review_url, directions_url, instagram_url, logo_url, greeting_name"
            )
            .order("created_at", { ascending: false }),
          supabase.from("locations").select("id, restaurant_id"),
        ]);

        if (restaurantsRes.error) throw restaurantsRes.error;
        if (locationsRes.error) throw locationsRes.error;

        setRestaurants(restaurantsRes.data ?? []);
        setLocations(locationsRes.data ?? []);
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
      await supabase.from("locations").delete().eq("restaurant_id", deletingRestaurant.id);

      const { error } = await supabase
        .from("restaurants")
        .delete()
        .eq("id", deletingRestaurant.id);

      if (error) throw error;

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
                    colSpan={7}
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
    </div>
  );
};

export default Admin;
