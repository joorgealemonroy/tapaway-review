import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Camera, Link2, Palette, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  icon: React.ReactNode;
  action?: () => void;
}

interface SetupChecklistProps {
  profile: {
    id: string;
    username?: string;
    vibe_id?: string | null;
    profile_photo_url?: string | null;
  };
  linkCount: number;
  onAction?: (action: string) => void;
}

const DISMISS_KEY = "tapaway_setup_checklist_dismissed";

export const SetupChecklist = ({ profile, linkCount, onAction }: SetupChecklistProps) => {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const isMobile = useIsMobile();

  const items: ChecklistItem[] = [
    {
      id: "username",
      label: "Claim username",
      checked: !!profile.username,
      icon: <User className="h-4 w-4" />,
    },
    {
      id: "vibe",
      label: "Choose a vibe",
      checked: !!(profile as any).vibe_id,
      icon: <Palette className="h-4 w-4" />,
      action: () => onAction?.("design"),
    },
    {
      id: "photo",
      label: "Add profile picture",
      checked: !!profile.profile_photo_url,
      icon: <Camera className="h-4 w-4" />,
      action: () => onAction?.("photo"),
    },
    {
      id: "links",
      label: "Add your first 3 links",
      checked: linkCount >= 3,
      icon: <Link2 className="h-4 w-4" />,
      action: () => onAction?.("links"),
    },
  ];

  const completedCount = items.filter((i) => i.checked).length;
  const total = items.length;
  const percentage = Math.round((completedCount / total) * 100);
  const allComplete = completedCount === total;

  // Check dismissal on mount
  useEffect(() => {
    const key = `${DISMISS_KEY}_${profile.id}`;
    if (localStorage.getItem(key) === "true") {
      setDismissed(true);
    }
  }, [profile.id]);

  // Auto-dismiss when all complete
  useEffect(() => {
    if (allComplete) {
      const timer = setTimeout(() => {
        localStorage.setItem(`${DISMISS_KEY}_${profile.id}`, "true");
        setDismissed(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [allComplete, profile.id]);

  if (dismissed) return null;

  // SVG progress ring
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <>
      {/* Floating button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1, type: "spring", stiffness: 200 }}
        onClick={() => setOpen(!open)}
        className={cn(
          "fixed z-40 h-14 w-14 rounded-full bg-card border border-border shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow",
          isMobile ? "bottom-24 right-4" : "bottom-8 right-8"
        )}
      >
        <svg width="48" height="48" className="absolute">
          <circle
            cx="24"
            cy="24"
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="3"
          />
          <circle
            cx="24"
            cy="24"
            r={radius}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 24 24)"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <span className="text-xs font-bold text-foreground z-10">{percentage}%</span>
      </motion.button>

      {/* Checklist panel */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/20"
            />

            {/* Panel */}
            <motion.div
              initial={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95, y: 10 }}
              animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
              exit={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className={cn(
                "fixed z-50 bg-card border border-border shadow-2xl",
                isMobile
                  ? "bottom-0 left-0 right-0 rounded-t-2xl p-5 pb-8"
                  : "bottom-24 right-8 w-80 rounded-2xl p-5"
              )}
            >
              {/* Drag handle (mobile) */}
              {isMobile && (
                <div className="flex justify-center mb-3">
                  <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
                </div>
              )}

              <h3 className="text-base font-semibold text-foreground mb-1">
                Setup your profile
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                {allComplete
                  ? "You're all set! 🎉"
                  : `${completedCount} of ${total} complete`}
              </p>

              <div className="space-y-2">
                {items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (!item.checked && item.action) {
                        item.action();
                        setOpen(false);
                      }
                    }}
                    disabled={item.checked}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors",
                      item.checked
                        ? "bg-primary/5"
                        : "bg-muted/50 hover:bg-muted"
                    )}
                  >
                    <div
                      className={cn(
                        "h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
                        item.checked
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {item.checked ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        item.icon
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-sm font-medium",
                        item.checked
                          ? "text-muted-foreground line-through"
                          : "text-foreground"
                      )}
                    >
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
