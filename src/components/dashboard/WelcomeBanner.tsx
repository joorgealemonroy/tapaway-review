import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Sparkles, Mail, CreditCard, Menu, Link2, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface WelcomeBannerProps {
  restaurantId: string;
  restaurantName: string;
  createdAt: string;
  hasMenu?: boolean;
  hasGoogleLink?: boolean;
  hasYelpLink?: boolean;
}

const BANNER_DISMISS_KEY = "tapaway_welcome_dismissed";
const NEW_USER_DAYS = 14; // Show for 14 days after signup

export const WelcomeBanner = ({
  restaurantId,
  restaurantName,
  createdAt,
  hasMenu = false,
  hasGoogleLink = false,
  hasYelpLink = false,
}: WelcomeBannerProps) => {
  const [dismissed, setDismissed] = useState(true);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Check if banner was dismissed
    const dismissedData = localStorage.getItem(BANNER_DISMISS_KEY);
    if (dismissedData) {
      try {
        const parsed = JSON.parse(dismissedData);
        if (parsed[restaurantId]) {
          setDismissed(true);
          return;
        }
      } catch {
        // Invalid data, continue showing
      }
    }

    // Check if user is still "new" (within 14 days)
    const created = new Date(createdAt);
    const now = new Date();
    const daysSinceCreation = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceCreation > NEW_USER_DAYS) {
      setDismissed(true);
      return;
    }

    setDismissed(false);

    // Load checked items from localStorage
    const savedChecks = localStorage.getItem(`tapaway_checklist_${restaurantId}`);
    if (savedChecks) {
      try {
        setCheckedItems(JSON.parse(savedChecks));
      } catch {
        // Invalid data
      }
    }
  }, [restaurantId, createdAt]);

  const handleDismiss = () => {
    setDismissed(true);
    const dismissedData = localStorage.getItem(BANNER_DISMISS_KEY);
    let parsed: Record<string, boolean> = {};
    try {
      if (dismissedData) {
        parsed = JSON.parse(dismissedData);
      }
    } catch {
      // Start fresh
    }
    parsed[restaurantId] = true;
    localStorage.setItem(BANNER_DISMISS_KEY, JSON.stringify(parsed));
  };

  const toggleCheck = (key: string) => {
    const newChecked = { ...checkedItems, [key]: !checkedItems[key] };
    setCheckedItems(newChecked);
    localStorage.setItem(`tapaway_checklist_${restaurantId}`, JSON.stringify(newChecked));
  };

  const checklistItems = [
    {
      key: "menu",
      label: "Set up your menu",
      description: "Add your menu so customers can browse while they wait",
      icon: Menu,
      autoComplete: hasMenu,
    },
    {
      key: "google",
      label: "Verify your Google link",
      description: "Make sure your Google review link works perfectly",
      icon: Link2,
      autoComplete: hasGoogleLink,
    },
    {
      key: "yelp",
      label: "Add Yelp link (optional)",
      description: "Connect your Yelp page for more review options",
      icon: Link2,
      autoComplete: hasYelpLink,
    },
  ];

  const completedCount = checklistItems.filter(
    (item) => item.autoComplete || checkedItems[item.key]
  ).length;
  const allComplete = completedCount === checklistItems.length;

  if (dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.98 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <Card className="relative overflow-hidden border-none bg-gradient-to-br from-primary/5 via-primary/10 to-accent/5 p-6 mb-6">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-accent/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
          
          {/* Dismiss button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 right-3 h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>

          <div className="relative z-10">
            {/* Header */}
            <div className="flex items-start gap-3 mb-5">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Welcome to TapAway, {restaurantName}! 🎉
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Your cards are on the way — here's what to do while you wait
                </p>
              </div>
            </div>

            {/* Email notice */}
            <div className="flex items-center gap-2 mb-5 p-3 rounded-lg bg-background/60 border border-border/50">
              <Mail className="w-4 h-4 text-primary flex-shrink-0" />
              <p className="text-sm text-foreground">
                <span className="font-medium">Check your inbox!</span>{" "}
                <span className="text-muted-foreground">
                  We sent you an email with your NFC card details and tracking info.
                </span>
              </p>
            </div>

            {/* Checklist */}
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-foreground flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-primary" />
                  While your cards arrive...
                </p>
                <span className="text-xs text-muted-foreground">
                  {completedCount}/{checklistItems.length} complete
                </span>
              </div>

              {checklistItems.map((item) => {
                const isChecked = item.autoComplete || checkedItems[item.key];
                return (
                  <motion.div
                    key={item.key}
                    className={`flex items-start gap-3 p-3 rounded-lg transition-all duration-200 ${
                      isChecked 
                        ? "bg-primary/5 border border-primary/20" 
                        : "bg-background/40 border border-border/30 hover:border-border/50"
                    }`}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => !item.autoComplete && toggleCheck(item.key)}
                      disabled={item.autoComplete}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${isChecked ? "text-primary line-through" : "text-foreground"}`}>
                        {item.label}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.description}
                      </p>
                    </div>
                    {isChecked && (
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* All complete message */}
            {allComplete && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center"
              >
                <p className="text-sm font-medium text-green-600 dark:text-green-400">
                  ✨ You're all set! Your TapAway hub is ready for customers.
                </p>
              </motion.div>
            )}
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};
