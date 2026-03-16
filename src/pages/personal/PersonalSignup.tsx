import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { getLayoutTemplate } from "@/lib/layoutTemplates";
import { getVibeTemplate } from "@/lib/vibeTemplates";
import { getPlatformConfig } from "@/lib/platformLinks";
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


// Step components
import { ClaimStep } from "@/components/personal/signup/ClaimStep";
import { LinksStep } from "@/components/personal/signup/LinksStep";
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
  planType: "free" | "monthly" | "yearly" | "vip" | "founding_pro";
  cardChoice: "custom" | "basic" | "none";
  basicCardColor: string | null;
  vibeId?: string | null;
}

function getFriendlyValue(type: string): string {
  const social = ["instagram", "tiktok", "x", "youtube", "linkedin", "discord", "snapchat", "threads", "twitch", "pinterest", "spotify"];
  if (social.includes(type)) return "@yourname";
  if (type === "email") return "you@email.com";
  if (type === "phone") return "+1 (555) 000-0000";
  if (type === "website") return "yoursite.com";
  return "";
}

const PersonalSignup = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [signupComplete, setSignupComplete] = useState(false);
  const [isOAuthUser, setIsOAuthUser] = useState(false);
  const [completedUsername, setCompletedUsername] = useState<string | null>(null);
  const [completedPlanType, setCompletedPlanType] = useState<"free" | "monthly" | "yearly" | "vip" | "founding_pro">("yearly");
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [hasImportedProfile, setHasImportedProfile] = useState(false);
  const [fromVibeFlow, setFromVibeFlow] = useState(false);
  
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
  
  // Consume imported profile data from /import page
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("tapaway_import_data");
      if (raw) {
        const imported = JSON.parse(raw);
        sessionStorage.removeItem("tapaway_import_data");
        
        if (imported.name) {
          update({ fullName: imported.name });
        }

        // Auto-fill photo and bio from import
        if (imported.photoUrl) {
          update({ profilePhotoUrl: imported.photoUrl });
        }
        if (imported.bio) {
          update({ cardHeadline: imported.bio });
        }
        
        // Clear any existing draft/template links before importing
        update({ links: [], blocks: [] });
        
        // Pre-fill links from import, using clean platform labels for known types
        if (imported.links?.length) {
          for (const link of imported.links) {
            const platformConfig = getPlatformConfig(link.type);
            addLink({
              type: link.type || 'website',
              url: link.url,
              label: platformConfig?.label || link.label || 'Link',
              value: '',
              thumbnailUrl: link.thumbnailUrl,
              coverImageUrl: link.coverImageUrl,
              displayStyle: link.displayStyle,
              gridSize: link.gridSize,
            });
          }
        }

        setHasImportedProfile(true);
        toast.success("Profile imported! Review and customize your links.");
      }
    } catch (e) {
      console.error('[PersonalSignup] Failed to consume import data:', e);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const planParam = searchParams.get("plan");
    if (planParam === "free" || planParam === "monthly" || planParam === "yearly") {
      update({ planType: planParam });
      setPlanLocked(true);
    }
    // Restore step from URL (OAuth redirect back)
    const stepParam = searchParams.get("step");
    if (stepParam) {
      const step = parseInt(stepParam, 10);
      if (step >= 1 && step <= 3) setCurrentStep(step);
    }
  }, [searchParams, update]);

  // Detect card-activation users and VIP cards
  const fromCardActivation = !!searchParams.get("card") || sessionStorage.getItem("tapaway_card_preauthed") === "true";
  const isVipCard = sessionStorage.getItem("tapaway_card_vip") === "true";
  const effectiveSteps = (hasImportedProfile || fromVibeFlow) ? [1, 3] : [1, 2, 3];
  const totalSteps = effectiveSteps.length;

  // Vibe metadata for ClaimStep visual continuity
  const [vibeMetadata, setVibeMetadata] = useState<{ name: string; glowColor: string; accentColor: string } | null>(null);

  // Consume vibe template from sessionStorage
  const [vibeApplied, setVibeApplied] = useState(false);
  useEffect(() => {
    if (vibeApplied) return;
    const vibeParam = searchParams.get("vibe");
    const vibeId = sessionStorage.getItem("tapaway_selected_vibe");
    if (vibeParam && vibeId) {
      const vibe = getVibeTemplate(vibeId);
      if (vibe) {
        setFromVibeFlow(true);
        // Capture vibe metadata BEFORE clearing storage
        setVibeMetadata({
          name: vibe.name,
          glowColor: vibe.glowColor,
          accentColor: vibe.mockupTheme.accent,
        });
        update({ links: [], blocks: [] });

        vibe.defaultLinks.forEach((l, i) => {
          addLink({
            type: l.type,
            label: l.label,
            value: "",
            url: "",
            sortOrder: l.sortOrder ?? i,
            displayStyle: l.displayStyle,
            pillColor: l.pillColor,
            gridSize: l.gridSize,
            isFeatured: l.isFeatured,
            placeholder: l.placeholder,
          });
        });

        vibe.defaultBlocks.forEach((b, i) => {
          addBlock({
            type: b.type,
            content: b.content,
            sortOrder: b.sortOrder ?? i,
          });
        });

        update({
          headerType: vibe.headerType,
          headerColor: vibe.style.headerColor,
          backgroundColor: vibe.style.bgColor,
          vibeId: vibeId,
        });
      }
      sessionStorage.removeItem("tapaway_selected_vibe");
    }
    setVibeApplied(true);
  }, [vibeApplied, searchParams, addLink, addBlock, update]);

  // Auto-select free plan for card-activation users if no plan was pre-selected
  useEffect(() => {
    if (fromCardActivation && !planLocked) {
      update({ planType: isVipCard ? "vip" : "free" });
      setPlanLocked(true);
    }
  }, [fromCardActivation, planLocked, isVipCard, update]);

  // Apply layout template from sessionStorage (set during card onboarding)
  const [templateApplied, setTemplateApplied] = useState(false);
  useEffect(() => {
    if (templateApplied) return;

    // Check for copied layout first, then hardcoded template
    const copiedRaw = sessionStorage.getItem("tapaway_copied_layout");
    const templateId = sessionStorage.getItem("tapaway_selected_layout");

    let template: { defaultLinks: Array<{ type: string; label: string; placeholder: string; displayStyle?: string; pillColor?: string; gridSize?: string; isFeatured?: boolean; sortOrder?: number }>; defaultBlocks: Array<{ type: string; content: Record<string, string>; sortOrder?: number }>; headerType: "color" | "image" | "banner"; style: { bgColor: string; headerColor: string } } | null = null;

    if (copiedRaw) {
      try {
        template = JSON.parse(copiedRaw);
      } catch { /* ignore */ }
      sessionStorage.removeItem("tapaway_copied_layout");
    } else if (templateId) {
      template = getLayoutTemplate(templateId) || null;
      sessionStorage.removeItem("tapaway_selected_layout");
    }

    if (!template) {
      setTemplateApplied(true);
      return;
    }

    // Clear existing draft content before applying new template
    update({ links: [], blocks: [] });

    // Store selected template ID
    const appliedTemplateId = copiedRaw ? "copied" : templateId;
    update({ selectedTemplate: appliedTemplateId });

    // Add template links with placeholder cues
    template.defaultLinks.forEach((l, i) => {
      addLink({
        type: l.type,
        label: l.label,
        value: "",
        url: "",
        sortOrder: l.sortOrder ?? i,
        displayStyle: l.displayStyle,
        pillColor: l.pillColor,
        gridSize: l.gridSize,
        isFeatured: l.isFeatured,
        placeholder: l.placeholder,
      });
    });

    // Add template blocks
    template.defaultBlocks.forEach((b, i) => {
      addBlock({
        type: b.type as "youtube" | "image" | "text" | "button",
        content: b.content,
        sortOrder: b.sortOrder ?? i,
      });
    });

    // Apply style — force free users to "color" header (banner/image are Pro-only)
    const isVipCard = onboardingData.cardChoice === "custom" || onboardingData.cardChoice === "basic";
    const isPaid = onboardingData.planType === "monthly" || onboardingData.planType === "yearly" || onboardingData.planType === "vip" || onboardingData.planType === "founding_pro";
    const effectiveHeaderType = (!isPaid && !isVipCard && (template.headerType === "banner" || template.headerType === "image"))
      ? "color" as const
      : template.headerType;

    update({
      headerType: effectiveHeaderType,
      headerColor: template.style.headerColor,
      backgroundColor: template.style.bgColor,
    });

    setTemplateApplied(true);
  }, [templateApplied, onboardingData.links.length, onboardingData.blocks.length, addLink, addBlock, update]);

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
    vibeId: onboardingData.vibeId,
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
    const currentIndex = effectiveSteps.indexOf(currentStep);
    if (currentIndex < effectiveSteps.length - 1) {
      setCurrentStep(effectiveSteps[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    const currentIndex = effectiveSteps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(effectiveSteps[currentIndex - 1]);
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

  const stepTitles = { 1: "Create your TapAway", 2: "Build your profile", 3: "Finish your order" };

  if (signupComplete && completedUsername) {
    return <SuccessScreen username={completedUsername} planType={completedPlanType} vibeName={vibeMetadata?.name} accentColor={vibeMetadata?.accentColor} />;
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
                {effectiveSteps.map((step, i) => (
                  <div
                    key={step}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      step === currentStep
                        ? "w-8 bg-primary"
                        : effectiveSteps.indexOf(currentStep) > i
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
              <ClaimStep
                formData={formData}
                updateFormData={updateFormData}
                onNext={nextStep}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
                selectedPlan={selectedPlan}
                isOAuthUser={isOAuthUser}
                setIsOAuthUser={setIsOAuthUser}
                vibeMetadata={vibeMetadata}
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
                selectedTemplate={onboardingData.selectedTemplate}
              />
            )}

            {currentStep === 3 && (
              <CheckoutStep
                formData={formData}
                updateFormData={updateFormData}
                onBack={prevStep}
                onComplete={handleCheckoutComplete}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
                planLocked={planLocked}
                cardCode={searchParams.get("card") || sessionStorage.getItem("tapaway_card_code") || undefined}
                isOAuthUser={isOAuthUser}
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
