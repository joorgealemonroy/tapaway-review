import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface TrainerBundle {
  id: string;
  title: string;
  description: string;
  price_label: string;
  cta_label: string;
  cta_url: string;
  sort_order: number;
  is_active: boolean;
}

interface AvTrainerBundlesManagerProps {
  restaurantId: string;
}

export const AvTrainerBundlesManager = ({ restaurantId }: AvTrainerBundlesManagerProps) => {
  const [bundles, setBundles] = useState<TrainerBundle[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newCtaLabel, setNewCtaLabel] = useState("Connect with a trainer");
  const [newCtaUrl, setNewCtaUrl] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBundles();
  }, [restaurantId]);

  const fetchBundles = async () => {
    const { data } = await supabase
      .from("avm_trainer_bundles")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("sort_order");
    
    if (data) setBundles(data);
  };

  const handleAdd = async () => {
    if (!newTitle || !newDescription || !newCtaUrl) {
      toast.error("Please fill in title, description, and CTA URL");
      return;
    }

    try {
      setLoading(true);
      const maxOrder = Math.max(...bundles.map(b => b.sort_order), 0);
      
      const { error } = await supabase
        .from("avm_trainer_bundles")
        .insert({
          restaurant_id: restaurantId,
          title: newTitle,
          description: newDescription,
          price_label: newPrice,
          cta_label: newCtaLabel,
          cta_url: newCtaUrl,
          sort_order: maxOrder + 1,
          is_active: true
        });

      if (error) throw error;

      toast.success("Trainer bundle added");
      setNewTitle("");
      setNewDescription("");
      setNewPrice("");
      setNewCtaLabel("Connect with a trainer");
      setNewCtaUrl("");
      fetchBundles();
    } catch (error: any) {
      toast.error(`Failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    const { error } = await supabase
      .from("avm_trainer_bundles")
      .update({ is_active: !currentActive })
      .eq("id", id);

    if (error) {
      toast.error(`Failed: ${error.message}`);
    } else {
      toast.success(currentActive ? "Bundle hidden" : "Bundle shown");
      fetchBundles();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this bundle?")) return;

    const { error } = await supabase
      .from("avm_trainer_bundles")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error(`Failed: ${error.message}`);
    } else {
      toast.success("Bundle deleted");
      fetchBundles();
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Add Trainer Bundle</h3>
        <div>
          <Label htmlFor="bundle-title">Title</Label>
          <Input
            id="bundle-title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="4 Weeks of Meals + Trainer"
          />
        </div>
        <div>
          <Label htmlFor="bundle-description">Description</Label>
          <Textarea
            id="bundle-description"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Get personalized training paired with nutrition..."
            rows={3}
          />
        </div>
        <div>
          <Label htmlFor="bundle-price">Price Label (optional)</Label>
          <Input
            id="bundle-price"
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
            placeholder="From $299"
          />
        </div>
        <div>
          <Label htmlFor="bundle-cta-label">Button Text</Label>
          <Input
            id="bundle-cta-label"
            value={newCtaLabel}
            onChange={(e) => setNewCtaLabel(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="bundle-cta-url">Link URL</Label>
          <Input
            id="bundle-cta-url"
            value={newCtaUrl}
            onChange={(e) => setNewCtaUrl(e.target.value)}
            placeholder="https://your-booking-link.com or tel:+1234567890"
          />
        </div>
        <Button onClick={handleAdd} disabled={loading} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Add Trainer Bundle
        </Button>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Existing Bundles ({bundles.length})</h3>
        {bundles.length === 0 ? (
          <p className="text-sm text-muted-foreground">No bundles yet. Add one above!</p>
        ) : (
          bundles.map((bundle) => (
            <Card key={bundle.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">{bundle.title}</h4>
                  <p className="text-sm text-muted-foreground mb-2">{bundle.description}</p>
                  {bundle.price_label && (
                    <p className="text-sm text-primary font-medium mb-2">{bundle.price_label}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Button: "{bundle.cta_label}" → {bundle.cta_url}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={bundle.is_active}
                    onCheckedChange={() => handleToggleActive(bundle.id, bundle.is_active)}
                  />
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={() => handleDelete(bundle.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};