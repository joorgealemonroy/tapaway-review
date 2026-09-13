import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, PauseCircle, Sparkles, AlertTriangle } from "lucide-react";
import { isSubscriptionAllowed } from "@/lib/subscriptionStatus";
import { cn } from "@/lib/utils";

/**
 * AccountStatusStrip — the "here's where things stand" header for client
 * dashboards. Shows the plan name, hub Live/Paused state, and trial countdown
 * (or "Complimentary" for comped accounts, which are never gated or nagged).
 *
 * When the hub is paused (lapsed trial), it explains it in plain language
 * and renders `pausedAction` — e.g. a Reactivate button linking to
 * `/paywall?restaurant=<id>`. Complimentary accounts never see the paused
 * state.
 */

export interface AccountStatusStripProps {
  planType: string | null;
  subscriptionStatus: string | null;
  trialEndsAt: string | null;
  /** 'complimentary' = free on purpose (family, comped). Never gated. */
  paymentState?: string | null;
  /** ISO date of next billing, shown for paying accounts. Optional. */
  nextBillingDate?: string | null;
  /** Rendered in the paused banner, e.g. a Reactivate button. */
  pausedAction?: ReactNode;
  className?: string;
}

/** Turn a plan_type slug into something a human would say. */
export function humanizePlanName(plan: string | null | undefined): string {
  if (!plan) return "Free";
  const map: Record<string, string> = {
    venue: "Venue",
    venue_pack: "TapAway Pro",
    venue_yearly: "Venue (Yearly)",
    solo: "Solo",
    solo_yearly: "Solo (Yearly)",
    solo_pro: "TapAway Solo",
    multi: "Multi-location",
    free: "Free",
    monthly: "Monthly",
    yearly: "Yearly",
    pro: "Pro",
    premium: "Premium",
    business_lite: "Business Lite",
    founding: "Founding",
    founding_pro: "Founding Pro",
    paid: "Paid",
  };
  const key = plan.toLowerCase();
  if (map[key]) return map[key];
  return plan
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Whole days left until trial_ends_at. Null when there is no trial end. */
export function trialDaysLeft(trialEndsAt: string | null | undefined): number | null {
  if (!trialEndsAt) return null;
  const diff = new Date(trialEndsAt).getTime() - Date.now();
  if (Number.isNaN(diff)) return null;
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export const AccountStatusStrip = ({
  planType,
  subscriptionStatus,
  trialEndsAt,
  paymentState = null,
  nextBillingDate = null,
  pausedAction,
  className,
}: AccountStatusStripProps) => {
  const complimentary = paymentState === "complimentary";
  const trialing = subscriptionStatus === "trialing";
  const allowed = isSubscriptionAllowed(subscriptionStatus);
  const live = complimentary || allowed;
  const daysLeft = trialing && !complimentary ? trialDaysLeft(trialEndsAt) : null;

  return (
    <Card className={cn("p-4 sm:p-5 border", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        {/* Plan + state */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            className={cn(
              "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
              live ? "bg-emerald-500/15" : "bg-amber-500/15",
            )}
            aria-hidden
          >
            {live ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <PauseCircle className="w-5 h-5 text-amber-600" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-base sm:text-lg truncate">
                {humanizePlanName(planType)} plan
              </span>
              {complimentary ? (
                <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 border-0">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Complimentary
                </Badge>
              ) : live ? (
                <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 border-0">
                  Hub Live
                </Badge>
              ) : (
                <Badge className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/20 border-0">
                  Hub Paused
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {complimentary ? (
                "Free forever — on the house."
              ) : daysLeft !== null ? (
                <>
                  {daysLeft === 0 ? (
                    <>Trial ends <span className="font-semibold text-foreground">today</span>.</>
                  ) : (
                    <>
                      <span className="font-semibold text-foreground">{daysLeft} {daysLeft === 1 ? "day" : "days"}</span> left in your trial.
                    </>
                  )}
                </>
              ) : live && nextBillingDate ? (
                <>Renews {new Date(nextBillingDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.</>
              ) : live ? (
                "Your hub is live and taking taps."
              ) : (
                "Your hub isn't live right now."
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Paused banner — plain language, always with a way forward. */}
      {!live && (
        <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-semibold text-sm sm:text-base">
                  Your hub is paused.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Taps and scans aren&rsquo;t reaching your page right now — but
                  your setup is saved, nothing is lost. Reactivate and you&rsquo;re
                  back live in a minute.
                </p>
              </div>
            </div>
            {pausedAction && <div className="shrink-0 w-full sm:w-auto">{pausedAction}</div>}
          </div>
        </div>
      )}
    </Card>
  );
};
