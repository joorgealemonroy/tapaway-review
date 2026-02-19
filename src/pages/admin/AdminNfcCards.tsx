import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Download, Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

type NfcCard = {
  id: string;
  public_code: string;
  status: string;
  batch_id: string | null;
  owner_user_id: string | null;
  destination_type: string;
  destination_value: string | null;
  created_at: string;
  claimed_at: string | null;
};

const AdminNfcCards = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminAccess();

  const [cards, setCards] = useState<NfcCard[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [search, setSearch] = useState("");

  // Generate batch state
  const [batchSize, setBatchSize] = useState(10);
  const [batchId, setBatchId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [lastGeneratedCsv, setLastGeneratedCsv] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!isAdmin || adminLoading) return;
    loadCards();
  }, [isAdmin, adminLoading]);

  const loadCards = async () => {
    setLoadingCards(true);
    const { data, error } = await supabase
      .from("nfc_cards")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load cards: " + error.message);
    } else {
      setCards(data ?? []);
    }
    setLoadingCards(false);
  };

  const handleGenerate = async () => {
    if (batchSize < 1 || batchSize > 500) {
      toast.error("Batch size must be between 1 and 500");
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "admin-create-nfc-cards",
        { body: { count: batchSize, batchId: batchId.trim() || undefined } }
      );

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Generated ${data.count} NFC cards`);
      setLastGeneratedCsv(data.csv);

      // Auto-download CSV
      downloadCsv(data.csv, `nfc-batch-${batchId.trim() || "new"}-${Date.now()}.csv`);

      // Reload card list
      await loadCards();
      setBatchId("");
    } catch (e: any) {
      toast.error("Generation failed: " + e.message);
    } finally {
      setGenerating(false);
    }
  };

  const downloadCsv = (csvContent: string, filename: string) => {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportBatchCsv = (targetBatchId: string) => {
    const batchCards = cards.filter((c) => c.batch_id === targetBatchId);
    const header = "public_code,status,batch_id,created_at";
    const rows = batchCards.map(
      (c) => `${c.public_code},${c.status},${c.batch_id ?? ""},${c.created_at}`
    );
    const csv = [header, ...rows].join("\n");
    downloadCsv(csv, `nfc-batch-${targetBatchId}.csv`);
  };

  const filteredCards = cards.filter((c) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      c.public_code.toLowerCase().includes(s) ||
      (c.batch_id ?? "").toLowerCase().includes(s) ||
      c.status.toLowerCase().includes(s)
    );
  });

  // Get unique batch IDs for quick export
  const uniqueBatches = [...new Set(cards.map((c) => c.batch_id).filter(Boolean))] as string[];

  const statusBadge = (status: string) => {
    switch (status) {
      case "claimed":
        return <Badge className="bg-green-600 text-white">Claimed</Badge>;
      case "disabled":
        return <Badge variant="destructive">Disabled</Badge>;
      default:
        return <Badge variant="secondary">Unclaimed</Badge>;
    }
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
      <div className="p-6">
        <h1 className="text-xl font-semibold">Access denied</h1>
        <p className="text-muted-foreground">Admin access required.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">NFC Card Manager</h1>
          <p className="text-sm text-muted-foreground">
            Generate batches, view cards, and export CSVs for trifold printing.
          </p>
        </div>
      </div>

      {/* Generate Batch Section */}
      <section className="bg-card border rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-lg">Generate New Batch</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <Label>Batch Size</Label>
            <Input
              type="number"
              min={1}
              max={500}
              value={batchSize}
              onChange={(e) => setBatchSize(Number(e.target.value))}
            />
          </div>
          <div>
            <Label>Batch ID (optional)</Label>
            <Input
              placeholder="e.g. FEB-2026"
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
            />
          </div>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Generate Cards
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          A CSV with plaintext claim codes will auto-download. Claim codes are
          hashed in the database and cannot be retrieved later.
        </p>
      </section>

      {/* Batch Export Shortcuts */}
      {uniqueBatches.length > 0 && (
        <section className="bg-card border rounded-xl p-4 space-y-3">
          <h2 className="font-semibold">Export by Batch</h2>
          <p className="text-xs text-muted-foreground">
            These exports contain public codes &amp; status only (no claim codes).
          </p>
          <div className="flex flex-wrap gap-2">
            {uniqueBatches.map((b) => (
              <Button
                key={b}
                variant="outline"
                size="sm"
                onClick={() => exportBatchCsv(b)}
              >
                <Download className="h-3 w-3 mr-1" />
                {b}
              </Button>
            ))}
          </div>
        </section>
      )}

      {/* Cards Table */}
      <section className="bg-card border rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="font-semibold text-lg">
            All Cards ({cards.length})
          </h2>
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search code, batch, or status…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loadingCards ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredCards.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4 text-center">
            {cards.length === 0
              ? "No cards yet. Generate your first batch above."
              : "No cards match your search."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Public Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Claimed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCards.map((card) => (
                  <TableRow key={card.id}>
                    <TableCell className="font-mono font-semibold">
                      {card.public_code}
                    </TableCell>
                    <TableCell>{statusBadge(card.status)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {card.batch_id ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {card.destination_value
                        ? `${card.destination_type}: ${card.destination_value}`
                        : card.destination_type}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(card.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {card.claimed_at
                        ? format(new Date(card.claimed_at), "MMM d, yyyy")
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminNfcCards;
