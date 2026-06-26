import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Download, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

type Restaurant = { id: string; restaurant_name: string | null; custom_slug: string | null };
type Subscriber = {
  id: string;
  restaurant_id: string;
  name: string | null;
  phone: string;
  sms_opt_in: boolean;
  sms_opt_in_at: string | null;
  created_at: string;
};

const AdminSmsSubscribers = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminAccess();

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [restaurantId, setRestaurantId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "opted_in" | "opted_out">("all");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
    if (!adminLoading && user && !isAdmin) navigate("/dashboard");
  }, [user, isAdmin, authLoading, adminLoading, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const { data } = await supabase
        .from("restaurants")
        .select("id, restaurant_name, custom_slug")
        .order("restaurant_name", { ascending: true });
      setRestaurants(data ?? []);
    })();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      setLoading(true);
      let q = supabase
        .from("restaurant_sms_subscribers")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (restaurantId !== "all") q = q.eq("restaurant_id", restaurantId);
      if (statusFilter === "opted_in") q = q.eq("sms_opt_in", true);
      if (statusFilter === "opted_out") q = q.eq("sms_opt_in", false);
      const { data, error } = await q;
      if (error) toast.error(error.message);
      setRows((data ?? []) as Subscriber[]);
      setLoading(false);
    })();
  }, [isAdmin, restaurantId, statusFilter]);

  const restaurantMap = useMemo(() => {
    const m = new Map<string, Restaurant>();
    restaurants.forEach((r) => m.set(r.id, r));
    return m;
  }, [restaurants]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      const rest = restaurantMap.get(r.restaurant_id);
      return (
        r.phone.toLowerCase().includes(s) ||
        (r.name ?? "").toLowerCase().includes(s) ||
        (rest?.restaurant_name ?? "").toLowerCase().includes(s) ||
        (rest?.custom_slug ?? "").toLowerCase().includes(s)
      );
    });
  }, [rows, search, restaurantMap]);

  const exportCsv = () => {
    if (filtered.length === 0) {
      toast.error("No subscribers to export");
      return;
    }
    const headers = [
      "restaurant_name",
      "restaurant_slug",
      "restaurant_id",
      "name",
      "phone",
      "sms_opt_in",
      "sms_opt_in_at",
      "created_at",
    ];
    const esc = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [headers.join(",")];
    for (const r of filtered) {
      const rest = restaurantMap.get(r.restaurant_id);
      lines.push(
        [
          esc(rest?.restaurant_name ?? ""),
          esc(rest?.custom_slug ?? ""),
          esc(r.restaurant_id),
          esc(r.name ?? ""),
          esc(r.phone),
          esc(r.sms_opt_in ? "true" : "false"),
          esc(r.sms_opt_in_at ?? ""),
          esc(r.created_at),
        ].join(","),
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const restLabel =
      restaurantId === "all"
        ? "all-restaurants"
        : restaurantMap.get(restaurantId)?.custom_slug ?? restaurantId;
    a.href = url;
    a.download = `vip-subscribers-${restLabel}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} subscribers`);
  };

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!isAdmin) return null;

  const optedInCount = filtered.filter((r) => r.sms_opt_in).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Admin
          </Button>
          <Button onClick={exportCsv} disabled={filtered.length === 0}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </div>

        <h1 className="text-2xl font-bold mb-1">VIP SMS Subscribers</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Search and export restaurant VIP text list subscribers across all accounts.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <Select value={restaurantId} onValueChange={setRestaurantId}>
            <SelectTrigger>
              <SelectValue placeholder="Restaurant" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All restaurants</SelectItem>
              {restaurants.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.restaurant_name || r.custom_slug || r.id.slice(0, 8)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="opted_in">Opted in</SelectItem>
              <SelectItem value="opted_out">Opted out</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name, phone, restaurant…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="text-sm text-muted-foreground mb-3">
          {loading ? "Loading…" : `${filtered.length} result${filtered.length === 1 ? "" : "s"} • ${optedInCount} opted in`}
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Restaurant</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Opted in at</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => {
                const rest = restaurantMap.get(r.restaurant_id);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {rest?.restaurant_name || rest?.custom_slug || r.restaurant_id.slice(0, 8)}
                    </TableCell>
                    <TableCell>{r.name || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{r.phone}</TableCell>
                    <TableCell>
                      <span
                        className={
                          r.sms_opt_in
                            ? "inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800"
                            : "inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground"
                        }
                      >
                        {r.sms_opt_in ? "Opted in" : "Opted out"}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.sms_opt_in_at ? new Date(r.sms_opt_in_at).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                );
              })}
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                    No subscribers found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default AdminSmsSubscribers;
