import { useEffect, useState, useMemo } from "react";
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
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ExternalLink, Trash2, Search, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PersonalAccount {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
  email: string;
  plan_type: string | null;
  subscription_status: string | null;
  created_at: string;
  profile_photo_url: string | null;
  sales_rep_id: string | null;
  created_by_rep_id: string | null;
}


const AdminBusinessLiteTable = () => {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<PersonalAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [deletingAccount, setDeletingAccount] = useState<PersonalAccount | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("personal_profiles")
        .select("id, user_id, username, full_name, email, plan_type, subscription_status, created_at, profile_photo_url, sales_rep_id, created_by_rep_id")
        .order("created_at", { ascending: false });


      if (error) throw error;
      setAccounts(data || []);
    } catch (err) {
      console.error("Error loading accounts:", err);
      toast.error("Failed to load accounts");
    } finally {
      setLoading(false);
    }
  };

  const filteredAccounts = useMemo(() => {
    return accounts.filter((a) => {
      let ok = true;
      if (search.trim()) {
        const s = search.toLowerCase();
        ok = a.full_name.toLowerCase().includes(s) ||
          a.username.toLowerCase().includes(s) ||
          a.email.toLowerCase().includes(s);
      }
      if (planFilter !== "all") {
        ok = ok && a.plan_type === planFilter;
      }
      return ok;
    });
  }, [accounts, search, planFilter]);

  const handleDelete = async () => {
    if (!deletingAccount || deleteConfirmText !== "DELETE") return;
    setDeleting(true);
    try {
      await supabase.from("personal_blocks").delete().eq("profile_id", deletingAccount.id);
      await supabase.from("personal_links").delete().eq("profile_id", deletingAccount.id);
      await supabase.from("personal_analytics").delete().eq("profile_id", deletingAccount.id);

      const { error: profileError } = await supabase
        .from("personal_profiles")
        .delete()
        .eq("id", deletingAccount.id);

      if (profileError) throw profileError;

      // Only delete the auth user for standalone personal accounts.
      // Rep-created demos share the rep's (or admin's) auth user — deleting that
      // auth user would cascade the sales_reps row and lock the rep out.
      const isRepDemo = Boolean(deletingAccount.sales_rep_id || deletingAccount.created_by_rep_id);
      if (!isRepDemo) {
        const { count: remaining } = await supabase
          .from("personal_profiles")
          .select("id", { count: "exact", head: true })
          .eq("user_id", deletingAccount.user_id);
        if (!remaining || remaining === 0) {
          try {
            await supabase.functions.invoke("delete-user-complete", {
              body: { userId: deletingAccount.user_id, isPersonalAccount: true },
            });
          } catch {}
        }
      }


      toast.success(`Account @${deletingAccount.username} deleted`);
      setAccounts((prev) => prev.filter((a) => a.id !== deletingAccount.id));
      setDeletingAccount(null);
      setDeleteConfirmText("");
    } catch (err) {
      toast.error("Failed to delete account");
    } finally {
      setDeleting(false);
    }
  };

  const getPlanBadge = (plan: string | null) => {
    switch (plan) {
      case "monthly":
      case "yearly":
        return <Badge className="bg-primary/20 text-primary">Pro</Badge>;
      case "vip":
        return <Badge className="bg-yellow-500/20 text-yellow-700">VIP</Badge>;
      default:
        return <Badge variant="secondary">Free</Badge>;
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/20 text-green-700">Active</Badge>;
      case "canceled":
        return <Badge variant="destructive">Canceled</Badge>;
      case "past_due":
        return <Badge className="bg-yellow-500/20 text-yellow-700">Past Due</Badge>;
      default:
        return <Badge variant="secondary">{status || "—"}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, username, or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All plans" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All plans</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
            <SelectItem value="vip">VIP</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => navigate("/admin/personal-accounts")}>
          Full Manager
        </Button>
      </div>

      <div className="overflow-x-auto border rounded-lg">
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAccounts.map((a) => (
              <TableRow key={a.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {a.profile_photo_url ? (
                      <img
                        src={a.profile_photo_url}
                        alt=""
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                        {a.full_name.charAt(0)}
                      </div>
                    )}
                    <span className="font-medium">{a.full_name}</span>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs">@{a.username}</TableCell>
                <TableCell className="text-sm">{a.email}</TableCell>
                <TableCell>{getPlanBadge(a.plan_type)}</TableCell>
                <TableCell>{getStatusBadge(a.subscription_status)}</TableCell>
                <TableCell className="text-sm">
                  {new Date(a.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(`/${a.username}`, "_blank")}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        setDeletingAccount(a);
                        setDeleteConfirmText("");
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredAccounts.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No accounts match filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        {filteredAccounts.length} of {accounts.length} accounts shown
      </p>

      <Dialog open={!!deletingAccount} onOpenChange={() => setDeletingAccount(null)}>
        <DialogContent className="max-w-md border-destructive">
          <DialogHeader>
            <DialogTitle className="text-destructive">
              Delete @{deletingAccount?.username}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This is <strong>permanent</strong>. Type{" "}
              <span className="font-mono font-bold">DELETE</span> to confirm.
            </p>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
              placeholder="DELETE"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeletingAccount(null)} disabled={deleting}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteConfirmText !== "DELETE" || deleting}
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

export default AdminBusinessLiteTable;
