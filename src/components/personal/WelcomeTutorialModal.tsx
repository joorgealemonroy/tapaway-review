import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Link2, Palette, CreditCard, Share2, Copy, Check, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface WelcomeTutorialModalProps {
  open: boolean;
  onClose: () => void;
  username: string;
  fullName: string;
  hasPaidPlan: boolean;
  cardConfirmed: boolean;
  onNavigateToTab?: (tab: string) => void;
}

const STEPS = [
  {
    title: "Add Your Links",
    description: "Connect your social profiles, website, and any other links you want to share. Visitors can tap any link to connect with you instantly.",
    icon: Link2,
    tabHint: "links",
  },
  {
    title: "Customize Your Look",
    description: "Make your profile stand out! Choose colors, upload a header image, and adjust your layout to match your personal brand.",
    icon: Palette,
    tabHint: "design",
  },
  {
    title: "Confirm Your Card",
    description: "Review and approve your TapAway card design. Once confirmed, we'll print and ship your custom NFC card.",
    icon: CreditCard,
    tabHint: "card",
    paidOnly: true,
  },
  {
    title: "Share Everywhere",
    description: "Copy your profile link and share it anywhere — in your email signature, social bios, or just tap your card!",
    icon: Share2,
    tabHint: null,
  },
];

export const WelcomeTutorialModal = ({
  open,
  onClose,
  username,
  fullName,
  hasPaidPlan,
  cardConfirmed,
  onNavigateToTab,
}: WelcomeTutorialModalProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [copied, setCopied] = useState(false);

  // Filter steps based on plan and card status
  const filteredSteps = STEPS.filter((step) => {
    if (step.paidOnly && (!hasPaidPlan || cardConfirmed)) return false;
    return true;
  });

  const step = filteredSteps[currentStep];
  const StepIcon = step?.icon;
  const isLastStep = currentStep === filteredSteps.length - 1;
  const progress = ((currentStep + 1) / filteredSteps.length) * 100;

  const handleNext = () => {
    if (isLastStep) {
      onClose();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  const handleSkip = () => {
    onClose();
  };

  const handleGoToTab = () => {
    if (step?.tabHint && onNavigateToTab) {
      onNavigateToTab(step.tabHint);
      onClose();
    }
  };

  const copyProfileUrl = async () => {
    try {
      await navigator.clipboard.writeText(`https://tapaway.co/${username}`);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const firstName = fullName.split(" ")[0];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md bg-background border-border">
        <DialogHeader className="text-center pb-2">
          {currentStep === 0 && (
            <>
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <DialogTitle className="text-2xl">Welcome to TapAway! 🎉</DialogTitle>
              <DialogDescription className="text-base">
                Hey {firstName}, let's get you set up in just a few steps.
              </DialogDescription>
            </>
          )}
        </DialogHeader>

        {/* Progress bar */}
        <div className="space-y-2">
          <Progress value={progress} className="h-1.5" />
          <p className="text-xs text-muted-foreground text-center">
            Step {currentStep + 1} of {filteredSteps.length}
          </p>
        </div>

        {/* Step content */}
        <div className="py-6 text-center space-y-4">
          {StepIcon && (
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <StepIcon className="h-7 w-7 text-primary" />
            </div>
          )}
          <div className="space-y-2">
            <h3 className="font-semibold text-lg text-foreground">{step?.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
              {step?.description}
            </p>
          </div>

          {/* Profile URL display on last step */}
          {isLastStep && (
            <button
              onClick={copyProfileUrl}
              className="flex items-center gap-2 mx-auto px-4 py-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
            >
              <span className="text-sm font-medium text-foreground">
                tapaway.co/{username}
              </span>
              {copied ? (
                <Check className="h-4 w-4 text-primary" />
              ) : (
                <Copy className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          )}

          {/* Go to tab button for relevant steps */}
          {step?.tabHint && !isLastStep && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleGoToTab}
              className="mt-2"
            >
              Go to {step.title.split(" ").slice(-1)[0]} Tab
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div>
            {currentStep > 0 ? (
              <Button variant="ghost" size="sm" onClick={handleBack}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={handleSkip}>
                Skip Tutorial
              </Button>
            )}
          </div>

          <Button onClick={handleNext} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            {isLastStep ? "Get Started!" : "Next"}
            {!isLastStep && <ChevronRight className="h-4 w-4 ml-1" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
