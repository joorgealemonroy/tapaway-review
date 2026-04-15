import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Package, Crown, Minus, Plus, Loader2, MapPin, Pencil, Check } from "lucide-react";
import { CARD_ADDON_PRICE_ID, CARD_ONETIME_PRICE_ID } from "@/lib/constants";

interface CardsTabProps {
  profileId: string;
  userId: string;
  hasCardAddon: boolean;
  planType: string | null;
  stripeCustomerId: string | null;
  fullName: string;
}

interface CardRequest {
  id: string;
  quantity: number;
  status: string;
  created_at: string;
  shipping_city: string | null;
  shipping_state: string | null;
}

interface ShippingAddress {
  name: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

const MONTHLY_LIMIT = 3;

const isAddressComplete = (addr: ShippingAddress) =>
  !!(addr.name.trim() && addr.line1.trim() && addr.city.trim() && addr.state.trim() && addr.postal_code.trim());

export const CardsTab = ({ profileId, userId, hasCardAddon, planType, stripeCustomerId, fullName }: CardsTabProps) => {
  const [requests, setRequests] = useState<CardRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [editingAddress, setEditingAddress] = useState(false);
  const [address, setAddress] = useState<ShippingAddress>({
    name: fullName || "", line1: "", line2: "", city: "", state: "", postal_code: "", country: "US",
  });

  useEffect(() => { loadRequests(); }, [profileId]);

  const loadRequests = async () => {
    const { data } = await supabase
      .from("personal_card_requests")
      .select("id, quantity, status, created_at, shipping_name, shipping_address_line1, shipping_address_line2, shipping_city, shipping_state, shipping_postal_code")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false });
    setRequests((data as CardRequest[]) || []);

    // Pre-fill address from last request
    if (data && data.length > 0) {
      const last = data[0] as any;
      const prefilled: ShippingAddress = {
        name: last.shipping_name || fullName || "",
        line1: last.shipping_address_line1 || "",
        line2: last.shipping_address_line2 || "",
        city: last.shipping_city || "",
        state: last.shipping_state || "",
        postal_code: last.shipping_postal_code || "",
        country: "US",
      };
      setAddress(prefilled);
      // Only show form expanded if address is incomplete
      setEditingAddress(!isAddressComplete(prefilled));
    } else {
      // No prior requests — try fetching address from Stripe
      if (stripeCustomerId) {
        try {
          const { data: addrData } = await supabase.functions.invoke("create-card-order", {
            body: { flow: "fetch_address", profile_id: profileId },
          });
          if (addrData?.address) {
            const stripeAddr: ShippingAddress = {
              name: addrData.address.name || fullName || "",
              line1: addrData.address.line1 || "",
              line2: addrData.address.line2 || "",
              city: addrData.address.city || "",
              state: addrData.address.state || "",
              postal_code: addrData.address.postal_code || "",
              country: addrData.address.country || "US",
            };
            setAddress(stripeAddr);
            setEditingAddress(!isAddressComplete(stripeAddr));
            setLoading(false);
            return;
          }
        } catch (_) { /* fallback to empty form */ }
      }
      setEditingAddress(true);
    }
    setLoading(false);
  };

  // Count cards used this month (pending + shipped)
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const usedThisMonth = requests
    .filter(r => ["pending", "shipped"].includes(r.status) && new Date(r.created_at) >= monthStart)
    .reduce((sum, r) => sum + r.quantity, 0);
  const remaining = Math.max(0, MONTHLY_LIMIT - usedThisMonth);

  const validateAddress = () => {
    if (!isAddressComplete(address)) {
      toast.error("Please fill in all shipping address fields");
      setEditingAddress(true);
      return false;
    }
    return true;
  };

  const handleFreeRequest = async () => {
    if (!validateAddress()) return;
    if (quantity > remaining) {
      toast.error(`You can only request ${remaining} more cards this month`);
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("create-card-order", {
        body: { flow: "free_request", profile_id: profileId, quantity, shipping: address },
      });
      if (error) throw error;
      toast.success("Card request submitted!");
      setQuantity(1);
      loadRequests();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckout = async (flow: "subscribe_addon" | "onetime") => {
    if (!validateAddress()) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-card-order", {
        body: { flow, profile_id: profileId, quantity: 3, shipping: address },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast.error(err.message || "Failed to start checkout");
    } finally {
      setSubmitting(false);
    }
  };

  const AddressSummary = () => (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
      <div className="flex items-center gap-2 min-w-0">
        <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
        <p className="text-sm truncate">
          {address.name} · {address.line1}, {address.city} {address.state} {address.postal_code}
        </p>
      </div>
      <Button variant="ghost" size="sm" className="shrink-0 text-xs" onClick={() => setEditingAddress(true)}>
        <Pencil className="h-3 w-3 mr-1" /> Edit
      </Button>
    </div>
  );

  const AddressForm = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-medium">Shipping Address</Label>
        </div>
        {isAddressComplete(address) && (
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => setEditingAddress(false)}>
            <Check className="h-3 w-3 mr-1" /> Done
          </Button>
        )}
      </div>
      <Input placeholder="Full name" value={address.name} onChange={e => setAddress(a => ({ ...a, name: e.target.value }))} />
      <Input placeholder="Address line 1" value={address.line1} onChange={e => setAddress(a => ({ ...a, line1: e.target.value }))} />
      <Input placeholder="Address line 2 (optional)" value={address.line2} onChange={e => setAddress(a => ({ ...a, line2: e.target.value }))} />
      <div className="grid grid-cols-3 gap-2">
        <Input placeholder="City" value={address.city} onChange={e => setAddress(a => ({ ...a, city: e.target.value }))} />
        <Input placeholder="State" value={address.state} onChange={e => setAddress(a => ({ ...a, state: e.target.value }))} />
        <Input placeholder="ZIP" value={address.postal_code} onChange={e => setAddress(a => ({ ...a, postal_code: e.target.value }))} />
      </div>
    </div>
  );

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6 pb-24">
      {hasCardAddon ? (
        /* ─── Card Club Member ─── */
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">Request NFC Cards</CardTitle>
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                <Crown className="h-3 w-3 mr-1" /> Card Club
              </Badge>
            </div>
            <CardDescription>
              {remaining > 0
                ? `You can request ${remaining} more card${remaining !== 1 ? "s" : ""} this month`
                : "You've used all 3 cards this month. Resets next month!"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {remaining > 0 ? (
              <>
                {/* Quantity */}
                <div className="flex items-center gap-3">
                  <Label className="text-sm">Quantity</Label>
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setQuantity(q => Math.max(1, q - 1))} disabled={quantity <= 1}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center font-medium">{quantity}</span>
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setQuantity(q => Math.min(remaining, q + 1))} disabled={quantity >= remaining}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                {editingAddress ? <AddressForm /> : <AddressSummary />}
                <Button onClick={handleFreeRequest} disabled={submitting} className="w-full">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Package className="h-4 w-4 mr-2" />}
                  Confirm Request
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Your monthly quota resets on the 1st.</p>
            )}
          </CardContent>
        </Card>
      ) : (
        /* ─── Non-Member ─── */
        <>
          {/* Card Club Promo */}
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Card Club</CardTitle>
              </div>
              <CardDescription>
                Request up to 3 NFC cards per month for just $5/mo. Free shipping included!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {editingAddress ? <AddressForm /> : <AddressSummary />}
              <Button onClick={() => handleCheckout("subscribe_addon")} disabled={submitting} className="w-full">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Crown className="h-4 w-4 mr-2" />}
                Subscribe — $5/mo
              </Button>
            </CardContent>
          </Card>

          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* One-Time Purchase */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">One-Time Order</CardTitle>
              </div>
              <CardDescription>
                Get 3 NFC cards shipped to you. No subscription required.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {editingAddress ? <AddressForm /> : <AddressSummary />}
              <Button variant="outline" onClick={() => handleCheckout("onetime")} disabled={submitting} className="w-full">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Package className="h-4 w-4 mr-2" />}
                Buy 3 Cards — $10
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      {/* Request History */}
      {requests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Order History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {requests.map(r => (
                <div key={r.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">{r.quantity} card{r.quantity !== 1 ? "s" : ""}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                      {r.shipping_city && ` · ${r.shipping_city}, ${r.shipping_state}`}
                    </p>
                  </div>
                  <Badge variant={r.status === "shipped" ? "default" : "secondary"} className="capitalize text-xs">
                    {r.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
