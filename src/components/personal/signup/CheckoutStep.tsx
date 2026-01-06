import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SignupData } from "@/pages/personal/PersonalSignup";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  PERSONAL_PAYMENTS_ENABLED, 
  PERSONAL_TRIAL_CONFIG, 
  PERSONAL_PRICING 
} from "@/lib/personalConfig";
import { 
  ArrowLeft, 
  Check,
  CreditCard,
  Loader2,
  Shield,
  Sparkles,
  Mail,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  formData: SignupData;
  updateFormData: (updates: Partial<SignupData>) => void;
  onBack: () => void;
  onComplete: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

type FlowStep = "plan" | "otp_sent" | "verifying" | "creating";
type PlanType = "free" | "monthly" | "yearly";

export const CheckoutStep = ({ formData, updateFormData, onBack, onComplete, isLoading, setIsLoading }: Props) => {
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [flowStep, setFlowStep] = useState<FlowStep>("plan");
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [detailedError, setDetailedError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const freeFeatures = [
    "Up to 5 links",
    "Basic profile page",
    "No NFC card included",
  ];

  const proFeatures = [
    "1 custom TapAway NFC card included",
    "Unlimited links & updates",
    "Advanced analytics",
    "Email lead capture",
    "Custom header images",
    "Priority support",
    "Free shipping",
  ];

  // Cooldown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const calculateTotal = () => {
    if (formData.planType === "free") return 0;
    let total = formData.planType === "yearly" ? PERSONAL_PRICING.yearly : PERSONAL_PRICING.monthly;
    if (formData.addExtraCard) {
      total += PERSONAL_PRICING.extraCard * formData.extraCardCount;
    }
    return total;
  };

  const isFreePlan = formData.planType === "free";

  const logCheckpoint = (checkpoint: string, data?: Record<string, any>) => {
    const logData = {
      checkpoint,
      email: formData.email?.substring(0, 3) + "***",
      username: formData.username,
      timestamp: new Date().toISOString(),
      ...data,
    };
    console.log(`[Personal Signup] ${checkpoint}:`, logData);
  };

  const sendOTP = async () => {
    setProcessing(true);
    setOtpError(null);
    setDetailedError(null);
    logCheckpoint("Sending OTP");

    try {
      const { data, error } = await supabase.functions.invoke("send-custom-otp", {
        body: { email: formData.email },
      });

      if (error) {
        logCheckpoint("OTP send failed", { error: error.message });
        throw error;
      }

      logCheckpoint("OTP sent successfully");
      setFlowStep("otp_sent");
      setResendCooldown(60);
      toast.success("Verification code sent! Check your email.");
    } catch (err: any) {
      console.error("Error sending OTP:", err);
      const errorMessage = err?.message || "Failed to send verification code";
      setOtpError(errorMessage);
      setDetailedError(`Failed to send OTP: ${errorMessage}`);
      toast.error(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  const verifyOTPAndCreateAccount = async () => {
    if (otpCode.length !== 6) {
      setOtpError("Please enter the 6-digit code");
      return;
    }

    setProcessing(true);
    setIsLoading(true);
    setOtpError(null);
    setDetailedError(null);
    setFlowStep("verifying");
    logCheckpoint("Verifying OTP");

    try {
      // Step 1: Verify OTP and create/update user
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke("verify-custom-otp", {
        body: { 
          email: formData.email, 
          code: otpCode,
          password: formData.password,
        },
      });

      if (verifyError) {
        logCheckpoint("OTP verification failed", { error: verifyError.message });
        throw new Error(verifyError.message || "Invalid verification code");
      }

      if (!verifyData?.success) {
        const errorMsg = verifyData?.error || "Verification failed";
        logCheckpoint("OTP verification failed", { error: errorMsg });
        throw new Error(errorMsg);
      }

      logCheckpoint("OTP verified", { 
        userId: verifyData.userId, 
        isNewUser: verifyData.isNewUser 
      });

      // Step 2: Sign in with the password
      setFlowStep("creating");
      logCheckpoint("Signing in user");
      
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: verifyData.tempPassword || formData.password,
      });

      if (signInError) {
        logCheckpoint("Sign in failed", { error: signInError.message });
        throw new Error(`Failed to sign in: ${signInError.message}`);
      }

      if (!signInData.user) {
        throw new Error("No user returned from sign in");
      }

      logCheckpoint("Session created", { userId: signInData.user.id });

      // Step 3: Upload profile photo if exists
      let profilePhotoUrl = formData.profilePhotoUrl;
      if (formData.croppedPhotoBlob) {
        logCheckpoint("Uploading profile photo");
        try {
          const filePath = `${signInData.user.id}/profile.jpg`;
          const { error: uploadError } = await supabase.storage
            .from("personal-photos")
            .upload(filePath, formData.croppedPhotoBlob, { 
              upsert: true, 
              contentType: "image/jpeg" 
            });

          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
              .from("personal-photos")
              .getPublicUrl(filePath);
            profilePhotoUrl = `${publicUrl}?t=${Date.now()}`;
            logCheckpoint("Photo uploaded", { url: profilePhotoUrl.substring(0, 50) + "..." });
          } else {
            console.warn("Photo upload failed:", uploadError);
          }
        } catch (photoErr) {
          console.warn("Photo upload error:", photoErr);
          // Continue without photo
        }
      }

      // Step 4: Create the personal profile
      logCheckpoint("Creating personal profile");
      
      // For free plan, add "tap" prefix to username
      const finalUsername = formData.planType === "free" 
        ? `tap${formData.username.toLowerCase()}`
        : formData.username.toLowerCase();
      
      const profileData = {
        user_id: signInData.user.id,
        email: formData.email,
        full_name: formData.fullName,
        username: finalUsername,
        plan_type: PERSONAL_PAYMENTS_ENABLED ? formData.planType : PERSONAL_TRIAL_CONFIG.paymentStatus,
        subscription_status: PERSONAL_TRIAL_CONFIG.subscriptionStatus,
        profile_photo_url: profilePhotoUrl,
      };

      const { data: profileResult, error: profileError } = await supabase
        .from("personal_profiles")
        .insert(profileData)
        .select()
        .single();

      if (profileError) {
        logCheckpoint("Profile insert failed", { 
          error: profileError.message, 
          code: profileError.code,
          details: profileError.details,
        });
        
        // Check if it's a duplicate username error
        if (profileError.code === "23505" || profileError.message?.includes("unique")) {
          throw new Error("This username is already taken. Please go back and choose a different one.");
        }
        
        throw new Error(`Failed to create profile: ${profileError.message}`);
      }

      logCheckpoint("Profile created", { profileId: profileResult.id });

      // Step 5: Create the links
      if (formData.links.length > 0) {
        logCheckpoint("Creating links", { count: formData.links.length });
        
        const linksToInsert = formData.links.map((link, index) => ({
          profile_id: profileResult.id,
          link_type: link.type,
          label: link.label,
          url: link.url,
          sort_order: index,
          is_active: true,
        }));

        const { error: linksError } = await supabase
          .from("personal_links")
          .insert(linksToInsert);

        if (linksError) {
          console.warn("Links insert error:", linksError);
          // Non-fatal, continue
        } else {
          logCheckpoint("Links created successfully");
        }
      }

      // Step 6: Send welcome email
      logCheckpoint("Sending welcome email");
      try {
        await supabase.functions.invoke("send-personal-welcome-emails", {
          body: {
            fullName: formData.fullName,
            username: formData.username,
            email: formData.email,
            profilePhotoUrl: profilePhotoUrl,
            profileId: profileResult.id,
          }
        });
        logCheckpoint("Welcome email sent");
      } catch (emailErr) {
        console.warn("Welcome email failed:", emailErr);
        // Non-fatal, continue
      }

      logCheckpoint("Account creation complete");
      toast.success("Account created successfully! Welcome to TapAway!");
      
      // Clear the draft and show success
      localStorage.removeItem("tapaway_personal_draft");
      onComplete();
      
    } catch (err: any) {
      console.error("Account creation error:", err);
      const errorMessage = err?.message || "Something went wrong";
      
      setOtpError(errorMessage);
      setDetailedError(`Error details: ${JSON.stringify(err)}`);
      setFlowStep("otp_sent");
      
      // Show user-friendly error
      if (errorMessage.includes("username")) {
        toast.error("This username is already taken. Please go back and choose a different one.");
      } else if (errorMessage.includes("Invalid") || errorMessage.includes("expired")) {
        toast.error("Invalid or expired code. Please request a new one.");
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setProcessing(false);
      setIsLoading(false);
    }
  };

  const handleGetCard = () => {
    if (PERSONAL_PAYMENTS_ENABLED) {
      // Real payment flow - redirect to Stripe
      handleStripeCheckout();
    } else {
      // Test mode - send OTP for verification
      sendOTP();
    }
  };

  const handleStripeCheckout = async () => {
    setProcessing(true);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-personal-checkout", {
        body: {
          email: formData.email,
          fullName: formData.fullName,
          username: formData.username,
          planType: formData.planType,
          addExtraCard: formData.addExtraCard,
          extraCardCount: formData.extraCardCount,
          links: formData.links,
          blocks: formData.blocks,
          cardHeadline: formData.cardHeadline,
        },
      });

      if (error) throw error;

      if (data?.url) {
        sessionStorage.setItem("personal_signup_data", JSON.stringify({
          ...formData,
          profilePhoto: null,
          croppedPhotoBlob: null,
        }));
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      toast.error("Failed to start checkout. Please try again.");
    } finally {
      setProcessing(false);
      setIsLoading(false);
    }
  };

  // OTP Entry View
  if (flowStep === "otp_sent" || flowStep === "verifying" || flowStep === "creating") {
    return (
      <div className="space-y-6">
        {/* Status Header */}
        <div className="text-center space-y-2">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            {flowStep === "creating" ? (
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            ) : (
              <Mail className="h-8 w-8 text-primary" />
            )}
          </div>
          <h2 className="text-xl font-bold text-foreground">
            {flowStep === "creating" ? "Creating your account..." : "Check your email"}
          </h2>
          <p className="text-muted-foreground">
            {flowStep === "creating" 
              ? "Setting up your TapAway profile"
              : `We sent a code to ${formData.email}`
            }
          </p>
        </div>

        {flowStep !== "creating" && (
          <>
            {/* OTP Input */}
            <div className="space-y-4">
              <div className="flex justify-center gap-2">
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={otpCode[index] || ""}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      if (val) {
                        const newCode = otpCode.split("");
                        newCode[index] = val;
                        setOtpCode(newCode.join(""));
                        // Auto-focus next input
                        if (index < 5) {
                          document.getElementById(`otp-${index + 1}`)?.focus();
                        }
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace" && !otpCode[index] && index > 0) {
                        document.getElementById(`otp-${index - 1}`)?.focus();
                      }
                    }}
                    onPaste={(e) => {
                      e.preventDefault();
                      const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
                      setOtpCode(pasted);
                      if (pasted.length === 6) {
                        document.getElementById(`otp-5`)?.focus();
                      }
                    }}
                    className="w-12 h-14 text-center text-xl font-bold border-2 border-border rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all bg-background"
                    disabled={processing}
                    autoFocus={index === 0}
                  />
                ))}
              </div>

              {otpError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-destructive">
                      <p className="font-medium">{otpError}</p>
                      {detailedError && (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-xs opacity-70">Technical details</summary>
                          <pre className="text-xs mt-1 whitespace-pre-wrap break-all">{detailedError}</pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Verify Button */}
            <Button
              onClick={verifyOTPAndCreateAccount}
              disabled={processing || otpCode.length !== 6}
              className="w-full h-14 text-base font-semibold"
            >
              {processing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  {flowStep === "verifying" ? "Verifying..." : "Creating account..."}
                </>
              ) : (
                "Verify & Create Account"
              )}
            </Button>

            {/* Resend */}
            <div className="text-center">
              {resendCooldown > 0 ? (
                <p className="text-sm text-muted-foreground">
                  Resend code in {resendCooldown}s
                </p>
              ) : (
                <button
                  onClick={sendOTP}
                  disabled={processing}
                  className="text-sm text-primary hover:underline flex items-center gap-1 mx-auto"
                >
                  <RefreshCw className="h-3 w-3" />
                  Resend code
                </button>
              )}
            </div>

            {/* Support Link */}
            <div className="text-center pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Having trouble?{" "}
                <a href="mailto:tap@tapaway.co" className="text-primary hover:underline">
                  Contact support
                </a>
              </p>
            </div>
          </>
        )}

        {/* Back Button (only show if not creating) */}
        {flowStep === "otp_sent" && (
          <Button
            variant="ghost"
            onClick={() => setFlowStep("plan")}
            className="w-full h-12"
            disabled={processing}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to plan selection
          </Button>
        )}
      </div>
    );
  }

  // Plan Selection View
  return (
    <div className="space-y-6">
      {/* Test Mode Banner */}
      {!PERSONAL_PAYMENTS_ENABLED && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800 font-medium text-center">
            🧪 Test Mode: No payment required
          </p>
        </div>
      )}

      {/* Plan Selection */}
      <div className="space-y-3">
        {/* Pro Yearly Plan - Most Prominent */}
        <button
          onClick={() => updateFormData({ planType: "yearly" })}
          className={`relative w-full p-4 rounded-xl border-2 text-left transition-all ${
            formData.planType === "yearly"
              ? "border-primary bg-primary/5 shadow-lg shadow-primary/10 ring-2 ring-primary/20"
              : "border-border hover:border-primary/50"
          }`}
        >
          <div className="absolute -top-3 left-4">
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full">
              <Sparkles className="h-3 w-3" />
              RECOMMENDED — NFC Card Included
            </span>
          </div>
          
          <div className="flex items-start justify-between pt-2">
            <div>
              <span className="font-bold text-xl text-foreground">Pro — ${PERSONAL_PRICING.yearly}/year</span>
              <p className="text-sm text-primary font-medium mt-1">Only $8.25/month • Save $20/year</p>
            </div>
            <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center ${
              formData.planType === "yearly" ? "border-primary bg-primary" : "border-muted-foreground"
            }`}>
              {formData.planType === "yearly" && <Check className="h-4 w-4 text-primary-foreground" />}
            </div>
          </div>
        </button>

        {/* Pro Monthly Plan */}
        <button
          onClick={() => updateFormData({ planType: "monthly" })}
          className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
            formData.planType === "monthly"
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="font-bold text-foreground">Pro — ${PERSONAL_PRICING.monthly}/month</span>
              <p className="text-sm text-muted-foreground mt-1">NFC Card included • Flexible billing</p>
            </div>
            <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center ${
              formData.planType === "monthly" ? "border-primary bg-primary" : "border-muted-foreground"
            }`}>
              {formData.planType === "monthly" && <Check className="h-4 w-4 text-primary-foreground" />}
            </div>
          </div>
        </button>

        {/* Free Plan - Less Prominent */}
        <button
          onClick={() => updateFormData({ planType: "free" as any })}
          className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
            formData.planType === "free"
              ? "border-muted bg-muted/30"
              : "border-border/50 hover:border-border opacity-70"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium text-muted-foreground">Free — $0</span>
              <p className="text-sm text-muted-foreground mt-1">No NFC card • Limited features</p>
            </div>
            <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center ${
              formData.planType === "free" ? "border-muted-foreground bg-muted" : "border-muted"
            }`}>
              {formData.planType === "free" && <Check className="h-4 w-4 text-muted-foreground" />}
            </div>
          </div>
        </button>
      </div>

      {/* What's Included */}
      <div className="p-4 bg-muted/50 rounded-xl">
        <h3 className="font-semibold text-foreground mb-3">
          {isFreePlan ? "Free plan includes" : "Pro plan includes"}
        </h3>
        <ul className="space-y-2">
          {(isFreePlan ? freeFeatures : proFeatures).map((feature, index) => (
            <li key={index} className="flex items-center gap-2 text-sm">
              <Check className={`h-4 w-4 flex-shrink-0 ${isFreePlan ? "text-muted-foreground" : "text-primary"}`} />
              <span className={isFreePlan ? "text-muted-foreground" : "text-foreground"}>{feature}</span>
            </li>
          ))}
        </ul>
        {isFreePlan && (
          <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
            Upgrade to Pro anytime to get your NFC card and unlock all features
          </p>
        )}
      </div>

      {/* Order Summary */}
      <div className="space-y-2 py-4 border-t border-border">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {formData.planType === "yearly" ? "Annual plan" : "Monthly plan"}
          </span>
          <span className="font-medium">
            {PERSONAL_PAYMENTS_ENABLED 
              ? `$${formData.planType === "yearly" ? PERSONAL_PRICING.yearly : PERSONAL_PRICING.monthly}`
              : "$0 (test mode)"
            }
          </span>
        </div>
        {formData.addExtraCard && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Extra card{formData.extraCardCount > 1 ? `s (×${formData.extraCardCount})` : ""}
            </span>
            <span className="font-medium">+${PERSONAL_PRICING.extraCard * formData.extraCardCount}</span>
          </div>
        )}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-lg font-semibold text-foreground">
            {PERSONAL_PAYMENTS_ENABLED ? "Total due today" : "Due today"}
          </span>
          <span className="text-2xl font-bold text-foreground">
            {PERSONAL_PAYMENTS_ENABLED ? `$${calculateTotal()}` : "$0"}
          </span>
        </div>
      </div>

      {/* CTA Button */}
      <Button
        onClick={handleGetCard}
        disabled={processing || isLoading}
        className="w-full h-14 text-base font-semibold"
      >
        {processing ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Processing...
          </>
        ) : isFreePlan ? (
          "Create Free Account"
        ) : (
          <>
            <CreditCard className="h-5 w-5 mr-2" />
            Get My TapAway Card
          </>
        )}
      </Button>

      {/* Reassurance */}
      <div className="space-y-2 text-center">
        <p className="text-sm text-muted-foreground">
          Instant access • No app required • Works on iPhone & Android
        </p>
        {PERSONAL_PAYMENTS_ENABLED && (
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-3 w-3" />
            <span>Secure checkout powered by Stripe</span>
          </div>
        )}
      </div>

      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={onBack}
        className="w-full h-12"
        disabled={processing}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>
    </div>
  );
};
