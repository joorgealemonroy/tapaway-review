import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Download, ArrowLeft, Plus, Search } from "lucide-react";

interface NfcCard {
  id: string;
  public_code: string;
  status: string;
  owner_user_id: string | null;
  destination_type: string | null;
  destination_value: string | null;
  claimed_at: string | null;
  created_at: string;
  batch_id: string | null;
  card_type: string;
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I/O/0/1 for clarity
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

const AdminCards = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminAccess();
  const [quantity, setQuantity] = useState(100);
  const [cardType, setCardType] = useState<"standard" | "vip">("standard");
  const [generating, setGenerating] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [cards, setCards] = useState<NfcCard[]>([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) loadCards();
  }, [isAdmin]);

  const loadCards = async () => {
    setLoadingCards(true);
    const { data, error } = await supabase
      .from("nfc_cards")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (!error && data) {
      setCards(data as unknown as NfcCard[]);
    }
    setLoadingCards(false);
  };

  const handleGenerate = async () => {
    if (quantity < 1 || quantity > 1000) {
      toast.error("Quantity must be between 1 and 1000");
      return;
    }

    setGenerating(true);
    try {
      const batchId = `batch_${Date.now()}`;
      const codes: string[] = [];
      const existingCodes = new Set(cards.map((c) => c.public_code));

      // Generate unique codes
      while (codes.length < quantity) {
        const code = generateCode();
        if (!existingCodes.has(code) && !codes.includes(code)) {
          codes.push(code);
        }
      }

      // Insert in batches of 100
      for (let i = 0; i < codes.length; i += 100) {
        const batch = codes.slice(i, i + 100).map((code) => ({
          public_code: code,
          status: "unclaimed",
          claim_code_hash: "",
          batch_id: batchId,
          card_type: cardType,
        }));

        const { error } = await supabase.from("nfc_cards").insert(batch);
        if (error) throw error;
      }

      setGeneratedCodes(codes);
      toast.success(`Generated ${codes.length} cards`);
      await loadCards();
    } catch (err: any) {
      console.error("Error generating cards:", err);
      toast.error(err.message || "Failed to generate cards");
    } finally {
      setGenerating(false);
    }
  };

  const handleExportCSV = () => {
    const codesToExport = generatedCodes.length > 0 ? generatedCodes : cards.map((c) => c.public_code);
    const csvContent = "public_code,url\n" + codesToExport.map((code) => `${code},tapaway.co/c/${code}`).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tapaway-cards-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredCards = searchQuery
    ? cards.filter(
        (c) =>
          c.public_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.destination_value?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.status.includes(searchQuery.toLowerCase())
      )
    : cards;

  const statusBadge = (status: string) => {
    switch (status) {
      case "unclaimed":
        return <Badge variant="secondary">Unclaimed</Badge>;
      case "claimed":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Claimed</Badge>;
      case "disabled":
        return <Badge variant="destructive">Disabled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-bold text-lg text-foreground">NFC Card Manager</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-8">
        {/* Generator Section */}
        <section className="bg-card rounded-xl border border-border p-6 space-y-4">
          <h2 className="font-semibold text-foreground">Generate Cards</h2>
          <div className="flex gap-3 items-end flex-wrap">
            <div className="flex-1 max-w-[200px]">
              <label className="text-sm text-muted-foreground mb-1 block">Quantity</label>
              <Input
                type="number"
                min={1}
                max={1000}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Type</label>
              <div className="flex rounded-lg border border-border overflow-hidden">
                <button
                  onClick={() => setCardType("standard")}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${cardType === "standard" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                >
                  Standard
                </button>
                <button
                  onClick={() => setCardType("vip")}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${cardType === "vip" ? "bg-amber-500 text-white" : "bg-background text-muted-foreground hover:bg-muted"}`}
                >
                  ⭐ VIP
                </button>
              </div>
            </div>
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Generate
            </Button>
            <Button variant="outline" onClick={handleExportCSV} disabled={cards.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>

          {/* Generated codes preview */}
          {generatedCodes.length > 0 && (
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm font-medium text-foreground mb-2">
                Just generated: {generatedCodes.length} codes
              </p>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {generatedCodes.slice(0, 50).map((code) => (
                  <span key={code} className="text-xs font-mono bg-background px-2 py-1 rounded border border-border">
                    {code}
                  </span>
                ))}
                {generatedCodes.length > 50 && (
                  <span className="text-xs text-muted-foreground self-center">
                    +{generatedCodes.length - 50} more
                  </span>
                )}
              </div>
            </div>
          )}
        </section>

        {/* All Cards Table */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">All Cards ({cards.length})</h2>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search codes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {loadingCards ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCards.map((card) => (
                    <TableRow key={card.id}>
                      <TableCell className="font-mono font-medium">{card.public_code}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        tapaway.co/c/{card.public_code}
                      </TableCell>
                      <TableCell className="space-x-1">
                        {statusBadge(card.status)}
                        {card.card_type === "vip" && (
                          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">⭐ VIP</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {card.destination_value ? (
                          <span>
                            {card.destination_type === "profile" ? "@" : ""}
                            {card.destination_value}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(card.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredCards.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No cards found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default AdminCards;
