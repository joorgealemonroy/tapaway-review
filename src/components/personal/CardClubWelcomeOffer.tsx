import { useState } from "react";
import { Crown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PENDING_KEY = "tapaway_pending_card_club";

interface CardClubWelcomeOfferProps {
  profileId: string;
  onDone: () => void;
}

/**
 * One-time Card Club offer shown on first dashboard login when the user
 * selected Card Club during signup. This is the ONLY way to join Card Club —
 * there is no self-serve subscribe in the dashboard — so the scarcity is real.
 */
export const CardClubWelcomeOffer = ({ profileId, onDone }: CardClubWelcomeOfferProps) => {
  const [submitting, setSubmitting] = useState(false);

  const finish = () => {
    localStorage.removeItem(PENDING_KEY);
    onDone();
  };

  const handleSubscribe = async () => {
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-card-order", {
        body: { flow: "subscribe_addon", profile_id: profileId, quantity: 3, shipping: {} },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url as string;
        return;
      }
      throw new Error("No checkout URL returned");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Couldn't start Card Club checkout.");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60">
      <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Crown className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Your Card Club invite</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          You picked <span className="font-semibold text-foreground">Card Club</span> during signup —
          3 fresh NFC cards every month for <span className="font-semibold text-foreground">$5/mo</span>,
          free shipping included.
        </p>
        <p className="text-xs font-medium text-amber-600 dark:text-amber-500">
          This was your only chance to add it — you won't be able to join Card Club later.
        </p>
        <Button onClick={handleSubscribe} disabled={submitting} className="w-full min-h-[48px]">
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Crown className="h-4 w-4 mr-2" />
          )}
          Add Card Club — $5/mo
        </Button>
        <button
          onClick={finish}
          className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
        >
          No thanks, I'll order cards one at a time
        </button>
      </div>
    </div>
  );
};

export const PENDING_CARD_CLUB_KEY = PENDING_KEY;
