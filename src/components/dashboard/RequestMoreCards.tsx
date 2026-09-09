import { useCallback, useEffect, useState, type ReactNode } from "react";
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
import { CreditCard, Package, Loader2 } from "lucide-react";
import {
  cardAllowanceForPlan,
  cardPlanLabel,
  canRequestCards,
} from "@/lib/cardAllowance";

interface RequestMoreCardsProps {
  restaurantId?: string;
  personalProfileId?: string;
  variant?: "restaurant" | "personal";
  trigger?: ReactNode;
}

interface AllowanceState {
  loading: boolean;
  planType: string | null;
  status: string | null;
  allowance: number;
  used: number;
}

interface ShippingState {
  name: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
}

const emptyShipping: ShippingState = {
  name: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
};

function monthStartIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

export const RequestMoreCards = ({
  restaurantId,
  personalProfileId,
  variant = "restaurant",
  trigger,
}: RequestMoreCardsProps) => {
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [shipping, setShipping] = useState<ShippingState>(emptyShipping);
  const [info, setInfo] = useState<AllowanceState>({
    loading: true,
    planType: null,
    status: null,
    allowance: 0,
    used: 0,
  });

  const isPersonal = variant === "personal" || (!restaurantId && !!personalProfileId);

  const loadAllowance = useCallback(async () => {
    setInfo((prev) => ({ ...prev, loading: true }));
    try {
      if (personalProfileId) {
        const { data: profile } = await supabase
          .from("personal_profiles")
          .select("plan_type, subscription_status")
          .eq("id", personalProfileId)
          .maybeSingle();
        const { data: reqs } = await supabase
          .from("personal_card_requests")
          .select("quantity, shipping_name, shipping_address_line1, shipping_address_line2, shipping_city, shipping_state, shipping_postal_code, created_at")
          .eq("profile_id", personalProfileId)
          .order("created_at", { ascending: false });
        const used = (reqs || [])
          .filter((r) => r.created_at >= monthStartIso())
          .reduce((sum, r) => sum + (r.quantity || 0), 0);
        const latest = (reqs || [])[0];
        if (latest) {
          setShipping({
            name: latest.shipping_name || "",
            line1: latest.shipping_address_line1 || "",
            line2: latest.shipping_address_line2 || "",
            city: latest.shipping_city || "",
            state: latest.shipping_state || "",
            postalCode: latest.shipping_postal_code || "",
          });
        }
        setInfo({
          loading: false,
          planType: profile?.plan_type ?? null,
          status: profile?.subscription_status ?? null,
          allowance: cardAllowanceForPlan(profile?.plan_type ?? null),
          used,
        });
        return;
      }

      if (restaurantId) {
        const { data: restaurant } = await supabase
          .from("restaurants")
          .select("plan_type, subscription_status")
          .eq("id", restaurantId)
          .maybeSingle();
        const { data: orders } = await supabase
          .from("fulfillment_orders")
          .select("quantity, plan, shipping_name, shipping_address_line1, shipping_address_line2, shipping_city, shipping_state, shipping_postal_code, created_at")
          .eq("restaurant_id", restaurantId)
          .order("created_at", { ascending: false });
        const used = (orders || [])
          .filter((o) => o.plan === "addon" && o.created_at >= monthStartIso())
          .reduce((sum, o) => sum + (o.quantity || 0), 0);
        const latest = (orders || [])[0];
        if (latest) {
          setShipping({
            name: latest.shipping_name || "",
            line1: latest.shipping_address_line1 || "",
            line2: latest.shipping_address_line2 || "",
            city: latest.shipping_city || "",
            state: latest.shipping_state || "",
            postalCode: latest.shipping_postal_code || "",
          });
        }
        setInfo({
          loading: false,
          planType: restaurant?.plan_type ?? null,
          status: restaurant?.subscription_status ?? null,
          allowance: cardAllowanceForPlan(restaurant?.plan_type ?? null),
          used,
        });
        return;
      }

      setInfo((prev) => ({ ...prev, loading: false }));
    } catch (err) {
      console.error("[RequestMoreCards] allowance load failed:", err);
      setInfo((prev) => ({ ...prev, loading: false }));
    }
  }, [personalProfileId, restaurantId]);

  useEffect(() => {
    if (open) loadAllowance();
  }, [open, loadAllowance]);

  const remaining = Math.max(info.allowance - info.used, 0);
  const subscriptionOk = canRequestCards(info.status);

  useEffect(() => {
    if (remaining > 0) setQuantity((q) => Math.min(Math.max(q, 1), remaining));
  }, [remaining]);

  const handleSubmit = async () => {
    if (quantity < 1 || quantity > remaining) {
      toast.error(`Please enter a quantity between 1 and ${remaining}`);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("request-more-cards", {
        body: {
          quantity,
          ...(restaurantId ? { restaurantId } : {}),
          ...(personalProfileId ? { personalProfileId } : {}),
          shipping: {
            name: shipping.name,
            line1: shipping.line1,
            line2: shipping.line2,
            city: shipping.city,
            state: shipping.state,
            postalCode: shipping.postalCode,
            country: "US",
          },
        },
      });

      if (error) {
        console.error("[RequestMoreCards] Error:", error);
        toast.error("Failed to submit request. Please try again.");
        return;
      }

      if (data?.success) {
        toast.success(`Request for ${quantity} card${quantity === 1 ? "" : "s"} submitted! We'll be in touch soon.`);
        setOpen(false);
        setQuantity(1);
      } else {
        toast.error(data?.error || "Failed to submit request");
      }
    } catch (err) {
      console.error("[RequestMoreCards] Exception:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-2">
            <Package className="h-4 w-4" />
            {isPersonal ? "Request a Card" : "Request More Cards"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[440px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-left">
            <CreditCard className="h-5 w-5 text-primary" />
            Get more cards
          </DialogTitle>
          <DialogDescription className="text-left">
            {info.loading
              ? "Checking your plan…"
              : subscriptionOk
                ? `${cardPlanLabel(info.planType)} plan — ${info.allowance} cards per month. You've used ${info.used} this month.`
                : "Card requests need an active plan."}
          </DialogDescription>
        </DialogHeader>

        {info.loading ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !subscriptionOk ? (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Your plan isn't active right now, so we can't ship new cards. Get your plan going and
              you'll be able to order cards again straight away.
            </p>
            <Button className="w-full" onClick={() => { window.location.href = "/dashboard?tab=plan"; }}>
              Go to my plan
            </Button>
          </div>
        ) : remaining <= 0 ? (
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              You've used all {info.allowance} cards for this month. Your allowance resets on the 1st.
            </p>
            <p className="text-sm text-muted-foreground">
              Need more sooner? Email{" "}
              <a href="mailto:tap@tapaway.co" className="text-primary underline">tap@tapaway.co</a>.
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="quantity">How many cards do you need?</Label>
              <Input
                id="quantity"
                type="number"
                inputMode="numeric"
                min={1}
                max={remaining}
                value={quantity}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 1;
                  setQuantity(Math.min(Math.max(val, 1), remaining));
                }}
              />
              <p className="text-xs text-muted-foreground">
                {remaining} of {info.allowance} left this month.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Where should we ship them?</Label>
              <Input
                placeholder="Full name"
                value={shipping.name}
                onChange={(e) => setShipping((s) => ({ ...s, name: e.target.value }))}
              />
              <Input
                placeholder="Street address"
                value={shipping.line1}
                onChange={(e) => setShipping((s) => ({ ...s, line1: e.target.value }))}
              />
              <Input
                placeholder="Apt, suite (optional)"
                value={shipping.line2}
                onChange={(e) => setShipping((s) => ({ ...s, line2: e.target.value }))}
              />
              <div className="grid grid-cols-3 gap-2">
                <Input
                  placeholder="City"
                  value={shipping.city}
                  onChange={(e) => setShipping((s) => ({ ...s, city: e.target.value }))}
                />
                <Input
                  placeholder="State"
                  value={shipping.state}
                  onChange={(e) => setShipping((s) => ({ ...s, state: e.target.value }))}
                />
                <Input
                  placeholder="ZIP"
                  value={shipping.postalCode}
                  onChange={(e) => setShipping((s) => ({ ...s, postalCode: e.target.value }))}
                />
              </div>
            </div>
          </div>
        )}

        {!info.loading && subscriptionOk && remaining > 0 && (
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading} className="w-full sm:w-auto">
              {isLoading ? "Submitting..." : "Submit request"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
