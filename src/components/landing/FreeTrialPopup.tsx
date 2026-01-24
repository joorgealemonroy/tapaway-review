import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

const EXCLUDED_PATHS = [
  "/personal/signup",
  "/personal/dashboard",
  "/auth",
  "/dashboard",
  "/admin",
  "/rep",
  "/onboarding",
];

export const FreeTrialPopup = () => {
  const [show, setShow] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Don't show on excluded paths
    const isExcluded = EXCLUDED_PATHS.some(path => 
      location.pathname.startsWith(path)
    );
    if (isExcluded) return;

    // Only show once per session
    if (sessionStorage.getItem("tapaway_free_popup_shown")) return;

    // Show after 3 seconds
    const timer = setTimeout(() => {
      setShow(true);
      sessionStorage.setItem("tapaway_free_popup_shown", "true");
    }, 3000);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  const handleDismiss = () => {
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 
                     bg-gradient-to-r from-primary to-primary/90 text-primary-foreground 
                     p-4 rounded-2xl shadow-2xl border border-white/10"
        >
          <button 
            onClick={handleDismiss} 
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
          
          <p className="font-bold text-lg pr-6">Create Your Digital Card Free</p>
          <p className="text-sm opacity-90 mt-1">
            Share your links with one tap — no app needed.
          </p>
          
          <Link 
            to="/personal/signup" 
            className="mt-3 inline-block px-5 py-2 bg-white text-primary 
                       font-semibold rounded-lg hover:bg-white/90 transition-colors"
          >
            Get Started Free →
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
