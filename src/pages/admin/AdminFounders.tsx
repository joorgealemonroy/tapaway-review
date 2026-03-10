import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Star, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Founder {
  id: string;
  founding_number: number;
  username: string;
  full_name: string;
  email: string;
  created_at: string;
}

const AdminFounders = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminAccess();
  const [founders, setFounders] = useState<Founder[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!isAdmin || adminLoading) return;
    loadFounders();
  }, [isAdmin, adminLoading]);

  const loadFounders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("personal_profiles")
      .select("id, founding_number, username, full_name, email, created_at")
      .eq("is_founding_user", true)
      .order("founding_number", { ascending: true });

    if (!error) setFounders((data as Founder[]) || []);
    setLoading(false);
  };

  const handleRevoke = async (founder: Founder) => {
    if (!confirm(`Revoke founding status for @${founder.username}?`)) return;
    setRevoking(founder.id);
    const { error } = await supabase
      .from("personal_profiles")
      .update({ is_founding_user: false, plan_type: "free", founding_number: null })
      .eq("id", founder.id);

    if (error) {
      toast.error("Failed to revoke");
    } else {
      toast.success(`Revoked founding status for @${founder.username}`);
      setFounders(prev => prev.filter(f => f.id !== founder.id));
    }
    setRevoking(null);
  };

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-destructive">Access denied</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Founding Creators</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
            Total Founding Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold">{founders.length} <span className="text-lg text-muted-foreground font-normal">/ 1,000</span></p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {founders.map(f => (
                  <TableRow key={f.id}>
                    <TableCell>
                      <Badge variant="secondary" className="bg-amber-100 text-amber-800">#{f.founding_number}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">@{f.username}</TableCell>
                    <TableCell>{f.full_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{f.email}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(f.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={revoking === f.id}
                        onClick={() => handleRevoke(f)}
                      >
                        {revoking === f.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Revoke"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {founders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No founding users yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminFounders;
