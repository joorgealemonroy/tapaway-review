import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ProfileSignupBarProps {
  profileId?: string; // hide if current user owns this profile
}

export const ProfileSignupBar = ({ profileId }: ProfileSignupBarProps) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("tapaway_profile_bar_shown")) return;

    const checkAndShow = async () => {
      // Don't show to profile owner
      if (profileId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from("personal_profiles")
            .select("id")
            .eq("user_id", user.id)
            .eq("id", profileId)
            .maybeSingle();
          if (data) return; // owner viewing own profile
        }
      }

      const timer = setTimeout(() => {
        setShow(true);
        sessionStorage.setItem("tapaway_profile_bar_shown", "true");
      }, 2000);

      return () => clearTimeout(timer);
    };

    let cleanup: (() => void) | undefined;
    checkAndShow().then(c => { cleanup = c; });
    return () => cleanup?.();
  }, [profileId]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="fixed bottom-3 left-3 right-3 z-40 flex justify-center pointer-events-none"
        >
          <div className="pointer-events-auto flex items-center gap-2 px-4 py-2.5 max-w-md w-full
                          bg-background/80 backdrop-blur-xl
                          border border-border/50
                          shadow-lg rounded-full">
            <Zap className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="text-sm text-muted-foreground flex-1 truncate">
              Create your digital card — free
            </span>
            <Link
              to="/personal/signup"
              className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-full hover:opacity-90 transition-opacity flex-shrink-0"
            >
              Sign up free
            </Link>
            <button
              onClick={() => setShow(false)}
              className="p-1 rounded-full hover:bg-muted transition-colors flex-shrink-0"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
