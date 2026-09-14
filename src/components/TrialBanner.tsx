import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

type PendingSetup = {
  message: string;
  action: string;
  href: string;
};

const EXCLUDED_PATHS = [
  "/start",
  "/paywall",
  "/onboarding",
  "/onboarding-start",
  "/auth",
  "/dashboard",
  "/admin",
  "/rep",
  "/affiliate",
];

const FINISHED_CARD_STATES = new Set(["activated", "card_ready", "delivered", "converted"]);

export const TrialBanner = () => {
  const [pendingSetup, setPendingSetup] = useState<PendingSetup | null>(null);
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    let cancelled = false;

    const checkSetupStatus = async () => {
      setPendingSetup(null);

      if (authLoading || !user) return;
      if (EXCLUDED_PATHS.some((path) => location.pathname.startsWith(path))) return;

      const dismissalKey = `tapaway_setup_banner_dismissed_${user.id}`;
      if (localStorage.getItem(dismissalKey) === "true") return;

      const [restaurantResult, personalResult] = await Promise.all([
        supabase
          .from("restaurants")
          .select("onboarding_completed, onboarding_step, subscription_status")
          .eq("owner_id", user.id),
        supabase
          .from("personal_profiles")
          .select("is_approved, pipeline_status, activated_at, subscription_status")
          .eq("user_id", user.id),
      ]);

      if (cancelled) return;

      const restaurantNeedsSetup = (restaurantResult.data ?? []).some(
        (account) =>
          account.onboarding_completed !== true ||
          account.onboarding_step < 4 ||
          account.subscription_status === "pending_setup",
      );

      if (restaurantNeedsSetup) {
        setPendingSetup({
          message: "Your TapAway setup is waiting for you.",
          action: "Finish Setup",
          href: "/onboarding-start?source=resume",
        });
        return;
      }

      const personalNeedsSetup = (personalResult.data ?? []).some((account) => {
        const pipelineStatus = account.pipeline_status ?? "draft";
        return (
          account.subscription_status === "pending_setup" ||
          account.is_approved !== true ||
          !account.activated_at ||
          !FINISHED_CARD_STATES.has(pipelineStatus)
        );
      });

      if (personalNeedsSetup) {
        setPendingSetup({
          message: "Your TapAway setup still has a step to finish.",
          action: "Continue Setup",
          href: "/dashboard",
        });
      }
    };

    void checkSetupStatus();

    return () => {
      cancelled = true;
    };
  }, [authLoading, location.pathname, user]);

  const handleDismiss = () => {
    if (user) {
      localStorage.setItem(`tapaway_setup_banner_dismissed_${user.id}`, "true");
    }
    setPendingSetup(null);
  };

  return (
    <AnimatePresence>
      {pendingSetup && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed top-14 md:top-0 left-0 right-0 z-[60] bg-primary text-primary-foreground py-3 px-4 shadow-lg"
        >
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <span className="text-sm font-medium">
                {pendingSetup.message}
              </span>
              <Link
                to={pendingSetup.href}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary-foreground text-primary font-bold text-sm hover:bg-primary-foreground/90 transition-colors"
              >
                {pendingSetup.action}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleDismiss}
              className="h-8 w-8 shrink-0 rounded-full text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground"
              aria-label="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
