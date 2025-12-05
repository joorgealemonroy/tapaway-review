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

export const RequestMoreCards = ({ restaurantId }: RequestMoreCardsProps) => {
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(15);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (quantity < 1 || quantity > 500) {
      toast.error("Please enter a quantity between 1 and 500");
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
        setQuantity(15);
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
            Need more NFC cards for your business? Submit a request and we'll get in touch about your order.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="quantity">How many cards do you need?</Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              max={500}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 15)}
              placeholder="15"
            />
            <p className="text-xs text-muted-foreground">
              Standard orders are 15 cards. Enter any quantity between 1-500.
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
