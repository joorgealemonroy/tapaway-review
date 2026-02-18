import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { X } from "lucide-react";
import { AffiliatePaywall } from "@/components/personal/signup/AffiliatePaywall";

// Step components
import { IdentityStep } from "@/components/personal/signup/IdentityStep";
import { LinksStep } from "@/components/personal/signup/LinksStep";
import { PreviewStep } from "@/components/personal/signup/PreviewStep";
import { CheckoutStep } from "@/components/personal/signup/CheckoutStep";
import { SuccessScreen } from "@/components/personal/signup/SuccessScreen";

// Hooks and types
import { usePersonalOnboarding, PersonalLink, PersonalBlock, ContentItem } from "@/hooks/usePersonalOnboarding";

// Re-export types for backward compatibility
export type { PersonalLink, PersonalBlock, ContentItem };

export interface SignupData {
  fullName: string;
  email: string;
  username: string;
  password: string;
  profilePhoto: File | null;
  profilePhotoUrl: string | null;
  croppedPhotoBlob: Blob | null;
  headerType: "color" | "image" | "banner";
  headerImageUrl: string | null;
  headerColor: string | null;
  backgroundColor: string | null;
  cardHeadline: string;
  links: PersonalLink[];
  blocks: PersonalBlock[];
  addExtraCard: boolean;
  extraCardCount: number;
  planType: "free" | "monthly" | "yearly";
  cardChoice: "custom" | "basic" | "none";
  basicCardColor: string | null;
}

const PersonalSignup = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [signupComplete, setSignupComplete] = useState(false);
  const [completedUsername, setCompletedUsername] = useState<string | null>(null);
  const [completedPlanType, setCompletedPlanType] = useState<"free" | "monthly" | "yearly">("yearly");
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  
  const { 
    data: onboardingData, 
    update, 
    addLink, 
    updateLink, 
    removeLink, 
    reorderLinks,
    addBlock,
    updateBlock,
    removeBlock,
    reorderBlocks,
    reorderContent,
    clearDraft,
    hasDraft 
  } = usePersonalOnboarding();

  // Set plan type from URL param on mount and track if plan was pre-selected
  const [planLocked, setPlanLocked] = useState(false);
  
  // Capture affiliate referral code from URL
  const [affiliateRef, setAffiliateRef] = useState<string | null>(null);
  
  useEffect(() => {
    const refParam = searchParams.get("ref");
    if (refParam) {
      sessionStorage.setItem("tapaway_ref", refParam);
      setAffiliateRef(refParam);
    } else {
      const stored = sessionStorage.getItem("tapaway_ref");
      if (stored) setAffiliateRef(stored);
    }
  }, [searchParams]);
  
  useEffect(() => {
    const planParam = searchParams.get("plan");
    if (planParam === "free" || planParam === "monthly" || planParam === "yearly") {
      update({ planType: planParam });
      setPlanLocked(true); // Plan was chosen from pricing page, skip selection in checkout
    }
  }, [searchParams, update]);

  const selectedPlan = onboardingData.planType;
  const isPaidPlan = selectedPlan === "monthly" || selectedPlan === "yearly";

  // Convert onboarding data to SignupData format for components
  const formData: SignupData = {
    fullName: onboardingData.fullName,
    email: onboardingData.email,
    username: onboardingData.username,
    password: onboardingData.password,
    profilePhoto: onboardingData.profilePhoto,
    profilePhotoUrl: onboardingData.profilePhotoUrl,
    croppedPhotoBlob: onboardingData.croppedPhotoBlob,
    headerType: onboardingData.headerType,
    headerImageUrl: onboardingData.headerImageUrl,
    headerColor: onboardingData.headerColor,
    backgroundColor: onboardingData.backgroundColor,
    cardHeadline: onboardingData.cardHeadline,
    links: onboardingData.links,
    blocks: onboardingData.blocks,
    addExtraCard: onboardingData.addExtraCard,
    extraCardCount: onboardingData.extraCardCount,
    planType: onboardingData.planType,
    cardChoice: onboardingData.cardChoice,
    basicCardColor: onboardingData.basicCardColor,
  };

  const updateFormData = (updates: Partial<SignupData>) => {
    update(updates);
  };

  // Check if user is already authenticated and has a profile
  useEffect(() => {
    const checkExistingProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("personal_profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();
        
        if (profile && profile.subscription_status === "active") {
          navigate("/personal/dashboard");
        }
      }
    };
    checkExistingProfile();
  }, [navigate]);

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleCheckoutComplete = () => {
    // Capture username and plan type BEFORE clearing draft
    setCompletedUsername(formData.username);
    setCompletedPlanType(formData.planType);
    setSignupComplete(true);
    clearDraft();
  };

  const handleCancel = () => {
    setShowCancelDialog(true);
  };

  const confirmCancel = () => {
    clearDraft();
    navigate("/personal");
  };

  const stepTitles = {
    1: "Create your TapAway",
    2: "Build your profile",
    3: "Get a physical card",
    4: "Finish your order",
  };

  // Affiliate-referred users get a dedicated paywall
  if (affiliateRef) {
    return <AffiliatePaywall referralCode={affiliateRef} />;
  }

  if (signupComplete && completedUsername) {
    return <SuccessScreen username={completedUsername} planType={completedPlanType} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <a href="/personal" className="font-black text-xl tracking-tight text-foreground">
              TapAway
            </a>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      step === currentStep
                        ? "w-8 bg-primary"
                        : step < currentStep
                        ? "w-4 bg-primary/50"
                        : "w-4 bg-muted"
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={handleCancel}
                className="p-2 -mr-2 hover:bg-muted rounded-lg transition-colors"
                aria-label="Cancel"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Step Title */}
            <h1 className="text-2xl font-bold text-foreground mb-6">
              {stepTitles[currentStep as keyof typeof stepTitles]}
            </h1>

            {currentStep === 1 && (
              <IdentityStep
                formData={formData}
                updateFormData={updateFormData}
                onNext={nextStep}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
                selectedPlan={selectedPlan}
              />
            )}

            {currentStep === 2 && (
              <LinksStep
                formData={formData}
                updateFormData={updateFormData}
                onNext={nextStep}
                onBack={prevStep}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
                addLink={addLink}
                updateLink={updateLink}
                removeLink={removeLink}
                reorderLinks={reorderLinks}
                addBlock={addBlock}
                updateBlock={updateBlock}
                removeBlock={removeBlock}
                reorderBlocks={reorderBlocks}
                reorderContent={reorderContent}
              />
            )}

            {currentStep === 3 && (
              <PreviewStep
                formData={formData}
                updateFormData={updateFormData}
                onNext={nextStep}
                onBack={prevStep}
              />
            )}

            {currentStep === 4 && (
              <CheckoutStep
                formData={formData}
                updateFormData={updateFormData}
                onBack={prevStep}
                onComplete={handleCheckoutComplete}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
                planLocked={planLocked}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Cancel confirmation dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Nothing will be saved. You'll need to start over if you come back.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PersonalSignup;
