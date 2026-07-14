import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const TrialBanner = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Check if user has trial intent but hasn't completed onboarding
    const hasPendingTrial = localStorage.getItem('tapaway_pending_trial') === 'true';
    const hasPendingSetup = localStorage.getItem('tapaway_pending_setup') === 'true';
    const onboardingComplete = localStorage.getItem('tapaway_onboarding_complete') === 'true';

    // Don't show on start, paywall, or onboarding pages
    const excludedPaths = ['/start', '/paywall', '/onboarding', '/onboarding-start', '/auth', '/dashboard'];
    const isExcludedPath = excludedPaths.some(path => location.pathname.startsWith(path));

    // Only show if user has actually started setup (paid/pending), not just clicked a CTA
    if ((hasPendingTrial || hasPendingSetup) && !onboardingComplete && !isExcludedPath && !dismissed) {
      setShowBanner(true);
    } else {
      setShowBanner(false);
    }
  }, [location.pathname, dismissed]);

  const handleDismiss = () => {
    setDismissed(true);
    setShowBanner(false);
  };

  return (
    <AnimatePresence>
      {showBanner && (
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
                You started your TapAway trial, let's finish setup!
              </span>
              <Link
                to="/onboarding-start?source=resume"
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary-foreground text-primary font-bold text-sm hover:bg-primary-foreground/90 transition-colors"
              >
                Finish Setup
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-primary-foreground/20 rounded-full transition-colors"
              aria-label="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
