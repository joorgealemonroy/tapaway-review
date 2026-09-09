import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Smartphone, Sparkles, QrCode, X } from "lucide-react";

interface ActivationWelcomeCardProps {
  profileId: string;
  username: string | null;
  onOpenTab: (tab: string) => void;
}

/**
 * Shown once after a hub is activated via the /claim checkout.
 * Dismissal is remembered per profile in localStorage.
 */
export function ActivationWelcomeCard({ profileId, username, onOpenTab }: ActivationWelcomeCardProps) {
  const storageKey = `tapaway_welcome_dismissed_${profileId}`;
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(storageKey) === "1";
    } catch {
      return false;
    }
  });

  if (dismissed) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  const qrUrl = username
    ? `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(
        `https://tapaway.co/${username}`,
      )}`
    : null;

  return (
    <Card className="relative mb-6 overflow-hidden border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent p-5">
      <button
        onClick={dismiss}
        aria-label="Dismiss welcome message"
        className="absolute top-2 right-2 h-11 w-11 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
          <Check className="h-5 w-5 text-emerald-500" />
        </div>
        <div className="min-w-0">
          <h2 className="font-bold text-foreground">Welcome to TapAway! Your account is fully active.</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Your hub is live. Share your link or tap your NFC card to start collecting taps — your stats will fill in as visitors arrive.
          </p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3 mt-4">
        <Button variant="outline" className="justify-start min-h-[44px]" onClick={() => onOpenTab("sms")}>
          <Smartphone className="h-4 w-4 mr-2" /> View VIP Subscribers
        </Button>
        <Button variant="outline" className="justify-start min-h-[44px]" onClick={() => onOpenTab("content")}>
          <Sparkles className="h-4 w-4 mr-2" /> Customize Hub Links
        </Button>
        <Button
          variant="outline"
          className="justify-start min-h-[44px]"
          disabled={!qrUrl}
          onClick={() => qrUrl && window.open(qrUrl, "_blank", "noopener,noreferrer")}
        >
          <QrCode className="h-4 w-4 mr-2" /> Download QR Backup
        </Button>
      </div>
    </Card>
  );
}
