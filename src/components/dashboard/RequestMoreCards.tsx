import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { CreditCard, Package } from "lucide-react";

interface RequestMoreCardsProps {
  restaurantId: string;
}

const MAX_CARDS_PER_MONTH = 10;

export const RequestMoreCards = ({ restaurantId }: RequestMoreCardsProps) => {
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(5);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (quantity < 1 || quantity > MAX_CARDS_PER_MONTH) {
      toast.error(`Please enter a quantity between 1 and ${MAX_CARDS_PER_MONTH}`);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('request-more-cards', {
        body: { quantity, restaurantId }
      });

      if (error) {
        console.error('[RequestMoreCards] Error:', error);
        toast.error("Failed to submit request. Please try again.");
        return;
      }

      if (data?.success) {
        toast.success(`Request for ${quantity} cards submitted! We'll be in touch soon.`);
        setOpen(false);
        setQuantity(5);
      } else {
        toast.error(data?.error || "Failed to submit request");
      }
    } catch (err) {
      console.error('[RequestMoreCards] Exception:', err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Package className="h-4 w-4" />
          Request More Cards
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Request More TapAway Cards
          </DialogTitle>
          <DialogDescription>
            Need more NFC cards for your business? You can request up to {MAX_CARDS_PER_MONTH} cards per month.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="quantity">How many cards do you need?</Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              max={MAX_CARDS_PER_MONTH}
              value={quantity}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 1;
                setQuantity(Math.min(Math.max(val, 1), MAX_CARDS_PER_MONTH));
              }}
              placeholder="5"
            />
            <p className="text-xs text-muted-foreground">
              Enter a quantity between 1-{MAX_CARDS_PER_MONTH}. Limit resets monthly.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Submitting..." : "Submit Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
