import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import CardActivation from "./CardActivation";

const CardResolver = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [card, setCard] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!code) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const resolveCard = async () => {
      try {
        // Look up the card
        const { data, error } = await supabase
          .from("nfc_cards")
          .select("*")
          .eq("public_code", code.toUpperCase())
          .maybeSingle();

        if (error || !data) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        // Record the tap (fire and forget)
        supabase.from("nfc_card_taps").insert({
          card_id: data.id,
          user_agent: navigator.userAgent,
        }).then(() => {});

        if (data.status === "claimed" && data.destination_value) {
          // Redirect to profile
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
        setLoading(false);
      } catch {
        setNotFound(true);
        setLoading(false);
      }
    };

    resolveCard();
  }, [code, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <span className="text-2xl">🔍</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Card not found</h1>
        <p className="text-muted-foreground max-w-sm">
          This card doesn't exist or has been disabled. If you think this is a mistake, contact support.
        </p>
      </div>
    );
  }

  return <CardActivation card={card} />;
};

export default CardResolver;
