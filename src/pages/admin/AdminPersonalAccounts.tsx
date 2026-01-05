import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Search, 
  Trash2, 
  Loader2, 
  User,
  ExternalLink
} from "lucide-react";

interface PersonalAccount {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
  email: string;
  profile_photo_url: string | null;
  subscription_status: string | null;
  created_at: string;
}

const AdminPersonalAccounts = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminAccess();

  const [accounts, setAccounts] = useState<PersonalAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deletingAccount, setDeletingAccount] = useState<PersonalAccount | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!isAdmin || adminLoading) return;
    loadAccounts();
  }, [isAdmin, adminLoading]);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("personal_profiles")
        .select("*")
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

  const handleDelete = async () => {
    if (!deletingAccount || deleteConfirmText !== "DELETE") return;

    setDeleting(true);
    try {
      // Get current admin user
      const { data: { user: adminUser } } = await supabase.auth.getUser();
      if (!adminUser) throw new Error("Not authenticated");

      // Delete all related data

      // 1. Delete blocks
      await supabase
        .from("personal_blocks")
        .delete()
        .eq("profile_id", deletingAccount.id);

      // 2. Delete links
      await supabase
        .from("personal_links")
        .delete()
        .eq("profile_id", deletingAccount.id);

      // 3. Delete analytics
      await supabase
        .from("personal_analytics")
        .delete()
        .eq("profile_id", deletingAccount.id);

      // 4. Delete storage assets
      try {
        await supabase.storage
          .from("personal-photos")
          .remove([
            `${deletingAccount.user_id}/profile.jpg`,
            `${deletingAccount.user_id}/header.jpg`,
          ]);

        // Try to delete any block images
        const { data: files } = await supabase.storage
          .from("personal-photos")
          .list(`${deletingAccount.user_id}/blocks`);

        if (files && files.length > 0) {
          await supabase.storage
            .from("personal-photos")
            .remove(files.map(f => `${deletingAccount.user_id}/blocks/${f.name}`));
        }
      } catch (storageErr) {
        console.warn("Storage cleanup error (non-fatal):", storageErr);
      }

      // 5. Delete the profile
      const { error: profileError } = await supabase
        .from("personal_profiles")
        .delete()
        .eq("id", deletingAccount.id);

      if (profileError) throw profileError;

      // 6. Try to delete auth user via edge function
      try {
        const { error: authError } = await supabase.functions.invoke("delete-user-complete", {
          body: { 
            userId: deletingAccount.user_id,
            isPersonalAccount: true
          }
        });
        if (authError) {
          console.warn("Auth user deletion may have failed:", authError);
        }
      } catch (authErr) {
        console.warn("Auth deletion error (non-fatal):", authErr);
      }

      // 7. Log the deletion
      await supabase
        .from("admin_audit_log")
        .insert({
          admin_user_id: adminUser.id,
          action: "delete_personal_account",
          target_type: "personal_profile",
          target_id: deletingAccount.id,
          details: {
            username: deletingAccount.username,
            email: deletingAccount.email,
            user_id: deletingAccount.user_id,
          }
        });

      toast.success(`Account @${deletingAccount.username} deleted permanently`);
      setAccounts(accounts.filter(a => a.id !== deletingAccount.id));
      setDeletingAccount(null);
      setDeleteConfirmText("");
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Failed to delete account");
    } finally {
      setDeleting(false);
    }
  };

  const filteredAccounts = accounts.filter((account) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      account.username.toLowerCase().includes(s) ||
      account.email.toLowerCase().includes(s) ||
      account.full_name.toLowerCase().includes(s)
    );
  });

  if (authLoading || adminLoading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Access denied</h1>
        <p className="text-muted-foreground">Admin access required</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Personal Accounts</h1>
          <p className="text-sm text-muted-foreground">
            Manage personal TapAway accounts
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by username, email, or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Accounts list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {search ? "No accounts match your search" : "No personal accounts yet"}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredAccounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border"
            >
              {account.profile_photo_url ? (
                <img
                  src={account.profile_photo_url}
                  alt={account.full_name}
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground">{account.full_name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    account.subscription_status === "active" 
                      ? "bg-green-100 text-green-700" 
                      : "bg-yellow-100 text-yellow-700"
                  }`}>
                    {account.subscription_status || "pending"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">@{account.username}</p>
                <p className="text-xs text-muted-foreground">{account.email}</p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`/${account.username}`, "_blank")}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeletingAccount(account)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingAccount} onOpenChange={() => {
        setDeletingAccount(null);
        setDeleteConfirmText("");
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">
              Permanently Delete Account
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                You are about to permanently delete the account for{" "}
                <strong>@{deletingAccount?.username}</strong> ({deletingAccount?.email}).
              </p>
              <p className="font-semibold text-destructive">
                This will delete ALL data including:
              </p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Profile information</li>
                <li>All links and blocks</li>
                <li>Analytics data</li>
                <li>Profile and header images</li>
                <li>The auth user account</li>
              </ul>
              <p className="font-semibold">This action cannot be undone.</p>
              <div className="pt-2">
                <p className="text-sm mb-2">Type <strong>DELETE</strong> to confirm:</p>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="font-mono"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteConfirmText !== "DELETE" || deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete Permanently"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminPersonalAccounts;
