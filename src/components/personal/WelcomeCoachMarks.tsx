import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface CoachMarkStep {
  id: string;
  targetId: string;
  title: string;
  message: string;
  position: "top" | "bottom";
}

const COACH_STEPS: CoachMarkStep[] = [
  {
    id: "welcome",
    targetId: "profile-header",
    title: "Welcome to TapAway! 🎉",
    message: "This is your digital profile. Tap your photo to customize it.",
    position: "bottom",
  },
  {
    id: "links",
    targetId: "tab-links",
    title: "Add Your Links",
    message: "Connect social profiles, websites, and anything you want to share.",
    position: "bottom",
  },
  {
    id: "design",
    targetId: "tab-design",
    title: "Customize Your Look",
    message: "Choose colors and upload a header image to match your style.",
    position: "bottom",
  },
  {
    id: "share",
    targetId: "profile-url",
    title: "You're All Set!",
    message: "Share your link anywhere. Want a physical card? Check the Card tab!",
    position: "top",
  },
];

interface WelcomeCoachMarksProps {
  active: boolean;
  onComplete: () => void;
  highlightedStep: string | null;
  onHighlightChange: (stepId: string | null) => void;
}

interface Position {
  top: number;
  left: number;
  arrowPosition: "top" | "bottom";
}

export const WelcomeCoachMarks = ({
  active,
  onComplete,
  highlightedStep,
  onHighlightChange,
}: WelcomeCoachMarksProps) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [position, setPosition] = useState<Position | null>(null);

  const currentStep = COACH_STEPS[currentStepIndex];
  const isLastStep = currentStepIndex === COACH_STEPS.length - 1;

  // Calculate position based on target element with mobile-first bounds checking
  const updatePosition = useCallback(() => {
    if (!currentStep) return;

    const target = document.getElementById(currentStep.targetId);
    if (!target) {
      setPosition(null);
      return;
    }

    const rect = target.getBoundingClientRect();
    const tooltipWidth = 280;
    const tooltipHeight = 140; // Slightly larger to account for content
    const offset = 12;
    const safeAreaTop = 60; // Account for mobile status bar/notch

    let top: number;
    let arrowPosition: "top" | "bottom";
    let preferredPosition = currentStep.position;

    // Check if there's enough space above for "top" position
    if (preferredPosition === "top") {
      const spaceAbove = rect.top - safeAreaTop;
      if (spaceAbove < tooltipHeight + offset) {
        // Not enough space above, flip to bottom
        preferredPosition = "bottom";
      }
    }

    // Check if there's enough space below for "bottom" position
    if (preferredPosition === "bottom") {
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < tooltipHeight + offset) {
        // Not enough space below, try top (unless we already tried)
        if (currentStep.position === "bottom") {
          preferredPosition = "top";
        }
      }
    }

    // Calculate final position
    if (preferredPosition === "bottom") {
      top = rect.bottom + offset;
      arrowPosition = "top";
    } else {
      top = rect.top - tooltipHeight - offset;
      arrowPosition = "bottom";
    }

    // Ensure tooltip stays within vertical bounds
    top = Math.max(safeAreaTop, top);
    top = Math.min(top, window.innerHeight - tooltipHeight - 16);

    // Center horizontally on the target, but keep within viewport
    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16));

    setPosition({ top, left, arrowPosition });
  }, [currentStep]);

  // Update position on step change and window resize
  useEffect(() => {
    if (!active) return;

    updatePosition();

    const handleResize = () => updatePosition();
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
    };
  }, [active, currentStepIndex, updatePosition]);

  // Update highlighted step
  useEffect(() => {
    if (active && currentStep) {
      onHighlightChange(currentStep.id);
    }
  }, [active, currentStep, onHighlightChange]);

  const handleNext = () => {
    if (isLastStep) {
      onHighlightChange(null);
      onComplete();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handleSkip = () => {
    onHighlightChange(null);
    onComplete();
  };

  if (!active || !position) return null;

  return createPortal(
    <AnimatePresence>
      {active && (
        <>
          {/* Backdrop - subtle overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99] pointer-events-none"
            style={{ background: "rgba(0,0,0,0.1)" }}
          />

          {/* Coach mark tooltip */}
          <motion.div
            key={currentStep.id}
            initial={{ opacity: 0, y: position.arrowPosition === "top" ? -10 : 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed z-[100] bg-popover border border-border shadow-xl rounded-xl p-4 w-[280px]"
            style={{ top: position.top, left: position.left }}
          >
            {/* Arrow */}
            <div
              className={`absolute left-1/2 -translate-x-1/2 w-3 h-3 bg-popover border-border rotate-45 ${
                position.arrowPosition === "top"
                  ? "-top-1.5 border-l border-t"
                  : "-bottom-1.5 border-r border-b"
              }`}
            />

            {/* Close button */}
            <button
              onClick={handleSkip}
              className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Content */}
            <div className="pr-6">
              <h4 className="font-semibold text-sm text-foreground mb-1">
                {currentStep.title}
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {currentStep.message}
              </p>
            </div>

            {/* Progress and actions */}
            <div className="flex items-center justify-between mt-4">
              <div className="flex gap-1">
                {COACH_STEPS.map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      idx === currentStepIndex
                        ? "bg-primary"
                        : idx < currentStepIndex
                        ? "bg-primary/40"
                        : "bg-muted"
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSkip}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Skip
                </button>
                <Button size="sm" onClick={handleNext} className="h-7 text-xs px-3">
                  {isLastStep ? "Done!" : "Next"}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

// Export the step IDs for use in PersonalDashboard
export const COACH_STEP_IDS = COACH_STEPS.map((s) => s.id);
