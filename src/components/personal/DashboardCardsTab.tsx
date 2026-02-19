import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CreditCard, ExternalLink, Loader2, Link2 } from "lucide-react";

interface UserCard {
  id: string;
  public_code: string;
  status: string;
  destination_type: string;
  destination_value: string | null;
  claimed_at: string | null;
}

interface DashboardCardsTabProps {
  userId: string;
  username: string;
}

export const DashboardCardsTab = ({ userId, username }: DashboardCardsTabProps) => {
  const [cards, setCards] = useState<UserCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [editCard, setEditCard] = useState<UserCard | null>(null);
  const [destType, setDestType] = useState("profile");
  const [destValue, setDestValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCards();
  }, [userId]);

  const loadCards = async () => {
    const { data, error } = await supabase
      .from("nfc_cards")
      .select("id, public_code, status, destination_type, destination_value, claimed_at")
      .eq("owner_user_id", userId)
      .order("claimed_at", { ascending: false });

    if (!error && data) {
      setCards(data as unknown as UserCard[]);
    }
    setLoading(false);
  };

  const openEditModal = (card: UserCard) => {
    setEditCard(card);
    setDestType(card.destination_type || "profile");
    setDestValue(card.destination_type === "profile" ? username : card.destination_value || "");
  };

  const handleSaveDestination = async () => {
    if (!editCard) return;
    if (destType === "external_url" && !destValue.trim()) {
      toast.error("Please enter a URL");
      return;
    }

    setSaving(true);
    try {
      const value = destType === "profile" ? username : destValue.trim();
      const { error } = await supabase
        .from("nfc_cards")
        .update({
          destination_type: destType,
          destination_value: value,
        })
        .eq("id", editCard.id)
        .eq("owner_user_id", userId);

      if (error) throw error;

      toast.success("Card updated");
      setEditCard(null);
      await loadCards();
    } catch (err: any) {
      toast.error(err.message || "Failed to update card");
    } finally {
      setSaving(false);
    }
  };

  const handleDisable = async (card: UserCard) => {
    const { error } = await supabase
      .from("nfc_cards")
      .update({ status: "disabled" })
      .eq("id", card.id)
      .eq("owner_user_id", userId);

    if (error) {
      toast.error("Failed to disable card");
    } else {
      toast.success("Card disabled");
      await loadCards();
    }
  };

  const handleEnable = async (card: UserCard) => {
    const { error } = await supabase
      .from("nfc_cards")
      .update({ status: "claimed" })
      .eq("id", card.id)
      .eq("owner_user_id", userId);

    if (error) {
      toast.error("Failed to enable card");
    } else {
      toast.success("Card re-enabled");
      await loadCards();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="text-center py-12 space-y-3">
        <CreditCard className="h-12 w-12 text-muted-foreground mx-auto" />
        <h3 className="font-semibold text-foreground">No cards yet</h3>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          When you activate a TapAway NFC card, it will appear here so you can manage where it links to.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-foreground">My Cards</h3>

      {cards.map((card) => (
        <div
          key={card.id}
          className="bg-card rounded-xl border border-border p-4 flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-mono font-medium text-sm text-foreground">{card.public_code}</p>
              <p className="text-xs text-muted-foreground truncate">
                {card.destination_type === "profile" ? (
                  <span className="flex items-center gap-1">
                    <Link2 className="h-3 w-3" />
                    tapaway.co/{card.destination_value}
                  </span>
                ) : card.destination_type === "external_url" ? (
                  <span className="flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" />
                    {card.destination_value}
                  </span>
                ) : (
                  "No destination"
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge
              variant={card.status === "claimed" ? "default" : "destructive"}
              className={card.status === "claimed" ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}
            >
              {card.status === "claimed" ? "Active" : "Disabled"}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => openEditModal(card)}>
              Edit
            </Button>
            {card.status === "claimed" ? (
              <Button variant="ghost" size="sm" onClick={() => handleDisable(card)} className="text-destructive">
                Disable
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => handleEnable(card)}>
                Enable
              </Button>
            )}
          </div>
        </div>
      ))}

      {/* Edit Destination Modal */}
      <Dialog open={!!editCard} onOpenChange={(open) => !open && setEditCard(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Card Destination</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Destination Type</Label>
              <Select value={destType} onValueChange={(v) => { setDestType(v); setDestValue(v === "profile" ? username : ""); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="profile">My Profile</SelectItem>
                  <SelectItem value="external_url">External URL</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {destType === "profile" ? (
              <p className="text-sm text-muted-foreground">
                Card will link to: <strong>tapaway.co/{username}</strong>
              </p>
            ) : (
              <div className="space-y-2">
                <Label>URL</Label>
                <Input
                  type="url"
                  placeholder="https://example.com"
                  value={destValue}
                  onChange={(e) => setDestValue(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCard(null)}>Cancel</Button>
            <Button onClick={handleSaveDestination} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
