import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";

const EXCLUDED_PATHS = [
  '/start',
  '/paywall',
  '/onboarding',
  '/onboarding-start',
  '/auth',
  '/dashboard',
  '/admin',
  '/rep',
  '/affiliate',
  '/personal',
];

export const OfferBanner = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const alreadyDismissed = sessionStorage.getItem('tapaway_offer_dismissed') === 'true';
    const hasPendingTrial = localStorage.getItem('tapaway_pending_trial') === 'true';
    const hasPendingSetup = localStorage.getItem('tapaway_pending_setup') === 'true';
    const onboardingComplete = localStorage.getItem('tapaway_onboarding_complete') === 'true';

    // If TrialBanner will show, defer to it
    const trialBannerActive = (hasPendingTrial || hasPendingSetup) && !onboardingComplete;

    const isExcludedPath = EXCLUDED_PATHS.some(path => location.pathname.startsWith(path));

    if (!alreadyDismissed && !dismissed && !user && !trialBannerActive && !isExcludedPath) {
      setShowBanner(true);
    } else {
      setShowBanner(false);
    }
  }, [location.pathname, dismissed, user]);

  const handleDismiss = () => {
    sessionStorage.setItem('tapaway_offer_dismissed', 'true');
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
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="text-sm font-medium truncate">
                Zero setup. $0 today + free shipping on your NFC cards.
              </span>
              <Link
                to="/start"
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary-foreground text-primary font-bold text-sm hover:bg-primary-foreground/90 transition-colors whitespace-nowrap"
              >
                Claim Offer
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
