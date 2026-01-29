import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CreditCard, Crown, Sparkles, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PERSONAL_PLANS, isPaidPlan, isVIPPlan } from "@/lib/personalPlanLimits";

interface PersonalBillingTabProps {
  profile: {
    id: string;
    plan_type: string | null;
    subscription_status: string | null;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
  };
  onUpgrade: () => void;
  onPlanChange: () => void;
}

export function PersonalBillingTab({ profile, onUpgrade, onPlanChange }: PersonalBillingTabProps) {
  const [isDowngrading, setIsDowngrading] = useState(false);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);

  const isPro = isPaidPlan(profile.plan_type) || isVIPPlan(profile.plan_type);
  const planInfo = isVIPPlan(profile.plan_type) 
    ? PERSONAL_PLANS.vip 
    : isPaidPlan(profile.plan_type) 
      ? PERSONAL_PLANS.paid 
      : PERSONAL_PLANS.free;
  
  // Detect VIP: explicit plan_type OR admin-created accounts (paid without Stripe)
  const isVIP = isVIPPlan(profile.plan_type) || (isPaidPlan(profile.plan_type) && !profile.stripe_subscription_id);

  const handleManageSubscription = async () => {
    if (!profile.stripe_customer_id) {
      toast.error("No subscription found");
      return;
    }

    setIsOpeningPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-personal-subscription", {
        body: { action: "portal", profileId: profile.id },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("Error opening portal:", error);
      toast.error("Failed to open subscription portal");
    } finally {
      setIsOpeningPortal(false);
    }
  };

  const handleDowngrade = async () => {
    setIsDowngrading(true);
    try {
      const { error } = await supabase.functions.invoke("manage-personal-subscription", {
        body: { action: "downgrade", profileId: profile.id },
      });

      if (error) throw error;

      toast.success("Successfully downgraded to Free plan");
      onPlanChange();
    } catch (error) {
      console.error("Error downgrading:", error);
      toast.error("Failed to downgrade plan");
    } finally {
      setIsDowngrading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {isPro ? <Crown className="h-5 w-5 text-amber-500" /> : <Sparkles className="h-5 w-5" />}
                Current Plan
              </CardTitle>
              <CardDescription>
                {isVIP 
                  ? "You have complimentary full access to all features!" 
                  : isPro 
                    ? "You have access to all premium features" 
                    : "Upgrade to unlock premium features"}
              </CardDescription>
            </div>
            <Badge variant="default" className={isVIP ? "bg-emerald-500" : isPro ? "bg-amber-500" : ""}>
              {isVIP ? "VIP Access" : planInfo.name}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold">{planInfo.price}</span>
            <span className="text-muted-foreground">{planInfo.priceSubtext}</span>
          </div>

          {isVIP && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
              ✨ You have complimentary access to all premium features - enjoy!
            </p>
          )}

          {isPro && !isVIP && profile.subscription_status === "active" && (
            <p className="text-sm text-muted-foreground">
              Your subscription is active. Manage billing details through the Stripe portal.
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            {isPro ? (
              <>
                {/* Only show subscription management for paying users */}
                {!isVIP && (
                  <Button
                    variant="outline"
                    onClick={handleManageSubscription}
                    disabled={isOpeningPortal || !profile.stripe_customer_id}
                  >
                    {isOpeningPortal ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CreditCard className="h-4 w-4 mr-2" />
                    )}
                    Manage Subscription
                    <ExternalLink className="h-3 w-3 ml-2" />
                  </Button>
                )}

                {/* Only show downgrade option for paying users */}
                {!isVIP && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" className="text-muted-foreground">
                        Downgrade to Free
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Downgrade to Free Plan?</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                          <div className="space-y-3">
                            <p>Your subscription will be canceled immediately.</p>

                            <div className="bg-muted p-3 rounded-lg space-y-2">
                              <p className="font-medium text-foreground">What happens to your content:</p>
                              <ul className="text-sm space-y-1">
                                <li>✓ Your first 5 links will remain active</li>
                                <li>✓ Basic blocks (text, image, youtube, button) stay visible</li>
                                <li>⏸ Extra links will be hidden (not deleted)</li>
                                <li>⏸ Photo collage & email capture blocks will be hidden</li>
                                <li>⏸ Custom header image will be hidden</li>
                              </ul>
                            </div>

                            <p className="text-sm text-amber-600 dark:text-amber-400">
                              💡 If you upgrade again within 60 days, everything will be restored!
                            </p>
                          </div>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep Pro</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDowngrade}
                          disabled={isDowngrading}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {isDowngrading ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : null}
                          Downgrade to Free
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </>
            ) : (
              <Button onClick={onUpgrade}>
                <Crown className="h-4 w-4 mr-2" />
                Upgrade to Pro
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Feature Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Plan Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Free Features */}
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Badge variant="secondary">Free</Badge>
              </h4>
              <ul className="text-sm space-y-2">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Up to 5 links
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Social icon bar
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> YouTube embeds
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Image & text blocks
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Button blocks
                </li>
              </ul>
            </div>

            {/* Pro Features */}
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Badge className="bg-amber-500">Pro</Badge>
                <span className="text-muted-foreground text-sm">$10/month</span>
              </h4>
              <ul className="text-sm space-y-2">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Everything in Free
                </li>
                <li className="flex items-center gap-2">
                  <Crown className="h-3 w-3 text-amber-500" /> Unlimited links
                </li>
                <li className="flex items-center gap-2">
                  <Crown className="h-3 w-3 text-amber-500" /> Custom NFC card
                </li>
                <li className="flex items-center gap-2">
                  <Crown className="h-3 w-3 text-amber-500" /> Custom header image
                </li>
                <li className="flex items-center gap-2">
                  <Crown className="h-3 w-3 text-amber-500" /> Photo collage block
                </li>
                <li className="flex items-center gap-2">
                  <Crown className="h-3 w-3 text-amber-500" /> Email capture block
                </li>
                <li className="flex items-center gap-2">
                  <Crown className="h-3 w-3 text-amber-500" /> Advanced analytics
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
