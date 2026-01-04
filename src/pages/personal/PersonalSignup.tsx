import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Step components
import { IdentityStep } from "@/components/personal/signup/IdentityStep";
import { LinksStep } from "@/components/personal/signup/LinksStep";
import { PreviewStep } from "@/components/personal/signup/PreviewStep";
import { CheckoutStep } from "@/components/personal/signup/CheckoutStep";
import { SuccessScreen } from "@/components/personal/signup/SuccessScreen";

export interface PersonalLink {
  id: string;
  type: string;
  label: string;
  url: string;
}

export interface SignupData {
  fullName: string;
  email: string;
  username: string;
  profilePhoto: File | null;
  profilePhotoUrl: string | null;
  links: PersonalLink[];
  addExtraCard: boolean;
  planType: "monthly" | "yearly";
}

const PersonalSignup = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [signupComplete, setSignupComplete] = useState(false);
  
  const [formData, setFormData] = useState<SignupData>({
    fullName: "",
    email: "",
    username: "",
    profilePhoto: null,
    profilePhotoUrl: null,
    links: [],
    addExtraCard: false,
    planType: "yearly", // Preselected as best value
  });

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

  const updateFormData = (updates: Partial<SignupData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

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
    setSignupComplete(true);
  };

  const stepTitles = {
    1: "Create your TapAway",
    2: "What do you want to share?",
    3: "This is your TapAway",
    4: "Finish your order",
  };

  if (signupComplete) {
    return <SuccessScreen username={formData.username} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <a href="/personal" className="font-black text-xl tracking-tight text-foreground">
              TapAway
            </a>
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
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default PersonalSignup;
