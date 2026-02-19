import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import CardActivation from "./CardActivation";

const CardResolver = () => {
  const navigate = useNavigate();
  const [cardCode, setCardCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [card, setCard] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);

  const handleLookup = async () => {
    const code = cardCode.trim().toUpperCase();
    if (code.length !== 6) return;

    setLoading(true);
    setNotFound(false);

    try {
      const { data, error } = await supabase.
      from("nfc_cards").
      select("*").
      eq("public_code", code).
      maybeSingle();

      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      // Record the tap (fire and forget)
      supabase.from("nfc_card_taps").insert({
        card_id: data.id,
        user_agent: navigator.userAgent
      }).then(() => {});

      if (data.status === "claimed" && data.destination_value) {
        navigate(`/${data.destination_value}`, { replace: true });
        return;
      }

      if (data.status === "disabled") {
        setNotFound(true);
        setLoading(false);
        return;
      }

      // Card is unclaimed — show activation
      setCard(data);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  // If card has been resolved, show activation flow
  if (card) {
    return <CardActivation card={card} />;
  }

  // Card code entry form
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          
        </div>

        <div className="bg-card rounded-2xl border p-6 shadow-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <CreditCard className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Set up your TapAway card</h1>
            <p className="text-muted-foreground text-sm">
              Enter the 6-character code printed on your card to get started.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="card-code">Card Code</Label>
            <Input
              id="card-code"
              placeholder="AB12CD"
              value={cardCode}
              onChange={(e) => {
                setCardCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6));
                setNotFound(false);
              }}
              maxLength={6}
              disabled={loading}
              className="text-center text-lg tracking-widest font-mono uppercase" />

          </div>

          {notFound &&
          <p className="text-sm text-destructive text-center">
              Card not found. Please check the code and try again.
            </p>
          }

          <Button
            onClick={handleLookup}
            disabled={cardCode.length !== 6 || loading}
            className="w-full"
            size="lg">

            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Continue
          </Button>
        </div>
      </div>
    </div>);

};

export default CardResolver;