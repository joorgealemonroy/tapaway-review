// VanSuccess — public thank-you page the business owner lands on after
// paying through a van-visit checkout link (successPath from
// create-checkout-session noTrial mode).
//
// This page is intentionally dumb: Jorge's /admin/van page does the
// provisioning (verify-personal-checkout) and the close. This just
// confirms the payment went through.
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function VanSuccess() {
  const [params] = useSearchParams();
  const name = params.get("name") || "your business";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="max-w-sm w-full text-center space-y-5">
        <div className="mx-auto w-24 h-24 rounded-full bg-green-500/10 flex items-center justify-center">
          <CheckCircle2 className="h-12 w-12 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold">You’re all set!</h1>
        <p className="text-muted-foreground">
          Payment received for <span className="font-semibold text-foreground">{name}</span>.
          Your TapAway subscription is active — Jorge will finish setting up your hub with you right now.
        </p>
        <p className="text-sm text-muted-foreground">
          We’ll text you a link to create your password (by email if we don’t have your mobile),
          so you can take over your dashboard whenever you’re ready.
        </p>
        <p className="text-sm text-muted-foreground">
          A receipt was emailed to you. Your subscription renews monthly and can be
          managed anytime from your TapAway dashboard.
        </p>
        <Button asChild className="w-full h-14 text-base">
          <Link to="/">Back to TapAway</Link>
        </Button>
      </div>
    </div>
  );
}
