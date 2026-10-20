import { useState } from "react";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  cards: number;
  interval?: "month" | "year";
  priceLabel: string;
  busy: boolean;
  error: string | null;
  onChoose: (cardClub: boolean) => void;
  onBack: () => void;
  onDeclineViewed: () => void;
}

export function CardClubStep({ cards, interval = "month", priceLabel, busy, error, onChoose, onBack, onDeclineViewed }: Props) {
  const clubPrice = interval === "year" ? "$60/year" : "$5/month";
  const [confirmSkip, setConfirmSkip] = useState(false);
  return (
    <div className="space-y-6">
      <button type="button" onClick={onBack} className="inline-flex min-h-11 items-center gap-2 text-sm text-hero-foreground/70 hover:text-hero-foreground">
        <ArrowLeft className="h-4 w-4" /> Change cards or billing
      </button>
      <p className="text-sm text-hero-foreground/65">Your order: {cards} cards · {priceLabel} after your 14-day trial</p>

      <section className="rounded-2xl border border-hero-foreground/15 bg-hero-foreground/[0.04] p-5 sm:p-6" aria-labelledby="card-club-title">
        <div className="flex items-baseline justify-between gap-3">
          <h1 id="card-club-title" className="text-2xl font-bold text-hero-foreground">Join Card Club</h1>
          <p className="text-lg font-bold text-hero-foreground">{clubPrice}</p>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-hero-foreground/80">Never worry about worn, lost, damaged, or outdated cards. Request a fresh batch of your TapAway cards every 30 days when you need them.</p>
        <p className="mt-4 text-base font-semibold text-hero-foreground">Up to {cards} fresh cards every 30 days</p>
        <ul className="mt-3 space-y-2 text-sm text-hero-foreground/80">
          {["Request only when you need them", "Standard shipping included", "No unused replacements roll over", "Available only with your first TapAway order"].map((t) => (
            <li key={t} className="flex items-center gap-2"><Check className="h-4 w-4 shrink-0 text-primary" />{t}</li>
          ))}
        </ul>
        <p className="mt-4 text-xs leading-relaxed text-hero-foreground/60">Card Club is only available with your first TapAway order. If you skip it now, you can't add it later. New business orders include it in the same subscription and renewal: +$5/month or +$60/year, starting after your trial.</p>
      </section>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      <div className="space-y-3">
        <Button className="h-14 w-full text-base font-bold" disabled={busy} onClick={() => onChoose(true)}>
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : `Add Card Club · ${clubPrice}`}
        </Button>
        <Button variant="ghost" className="min-h-12 w-full whitespace-normal text-hero-foreground/80 hover:bg-hero-foreground/10 hover:text-hero-foreground" disabled={busy}
          onClick={() => { setConfirmSkip(true); onDeclineViewed(); }}>
          No thanks, I'll pay for reprints when I need them
        </Button>
      </div>
      <p className="text-center text-xs text-hero-foreground/55">Next: secure checkout with Stripe. No account or password needed.</p>

      <AlertDialog open={confirmSkip} onOpenChange={setConfirmSkip}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Skip Card Club?</AlertDialogTitle>
            <AlertDialogDescription>
              Card Club can only be added with your first TapAway order. If you need replacement cards later, you'll pay the normal reprint price plus shipping.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => onChoose(true)}>Join Card Club for {clubPrice}</AlertDialogCancel>
            <AlertDialogAction onClick={() => onChoose(false)}>Skip and Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
