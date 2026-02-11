import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SignupData } from "@/pages/personal/PersonalSignup";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  PERSONAL_PAYMENTS_ENABLED, 
  PERSONAL_TRIAL_CONFIG, 
  PERSONAL_PRICING,
  PERSONAL_PAYMENT_LINKS,
  PERSONAL_AFFILIATE_PAYMENT_LINK,
} from "@/lib/personalConfig";
import { getPublicUsername } from "@/lib/personalUsername";
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
  planLocked?: boolean; // If true, skip plan selection (plan was chosen from pricing page)
}

type FlowStep = "plan" | "otp_sent" | "verifying" | "creating" | "existing_account";
type PlanType = "free" | "monthly" | "yearly";

export const CheckoutStep = ({ formData, updateFormData, onBack, onComplete, isLoading, setIsLoading, planLocked = false }: Props) => {
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [flowStep, setFlowStep] = useState<FlowStep>("plan");
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [detailedError, setDetailedError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [existingPassword, setExistingPassword] = useState("");
  const [existingUserId, setExistingUserId] = useState<string | null>(null);

  const freeFeatures = [
    "Up to 5 links",
    "Basic profile page",
    "Limited customization",
  ];

  const proFeatures = formData.planType === "yearly" ? [
    "Custom profile URL (tapaway.co/yourname)",
    "Unlimited links & updates",
    "Advanced analytics",
    "Email lead capture",
    "Custom header images",
    "Priority support",
  ] : [
    "Custom profile URL (tapaway.co/yourname)",
    "Unlimited links & updates",
    "Advanced analytics",
    "Email lead capture",
    "Custom header images",
    "Priority support",
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
    return formData.planType === "yearly" ? PERSONAL_PRICING.yearly : PERSONAL_PRICING.monthly;
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
        isNewUser: verifyData.isNewUser,
        existingAccount: verifyData.existingAccount,
      });

      // Handle existing account - user needs to sign in with their existing password
      if (verifyData.existingAccount) {
        logCheckpoint("Existing account detected - prompting for existing password");
        setExistingUserId(verifyData.userId);
        setFlowStep("existing_account");
        setProcessing(false);
        setIsLoading(false);
        toast.info("You already have an account! Please sign in with your existing password.");
        return;
      }

      // Step 2: Sign in with the password (new users only)
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

      // Step 4: Upload header image if custom image was selected
      let headerImageUrl = null;
      if (formData.headerType === "image" && formData.headerImageUrl) {
        logCheckpoint("Uploading header image");
        try {
          // Convert data URL to Blob if needed
          let headerBlob: Blob;
          if (formData.headerImageUrl.startsWith("data:")) {
            const arr = formData.headerImageUrl.split(",");
            const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
              u8arr[n] = bstr.charCodeAt(n);
            }
            headerBlob = new Blob([u8arr], { type: mime });
          } else {
            // It's already a URL, skip upload
            headerImageUrl = formData.headerImageUrl;
            headerBlob = null as any;
          }

          if (headerBlob) {
            const headerPath = `${signInData.user.id}/header.jpg`;
            const { error: headerUploadError } = await supabase.storage
              .from("personal-photos")
              .upload(headerPath, headerBlob, { 
                upsert: true, 
                contentType: "image/jpeg" 
              });

            if (!headerUploadError) {
              const { data: { publicUrl } } = supabase.storage
                .from("personal-photos")
                .getPublicUrl(headerPath);
              headerImageUrl = `${publicUrl}?t=${Date.now()}`;
              logCheckpoint("Header image uploaded", { url: headerImageUrl.substring(0, 50) + "..." });
            } else {
              console.warn("Header upload failed:", headerUploadError);
            }
          }
        } catch (headerErr) {
          console.warn("Header upload error:", headerErr);
          // Continue without header image
        }
      }

      // Step 5: Create the personal profile with ALL theme settings
      logCheckpoint("Creating personal profile");
      
      // Use the helper to get the correct public username
      const finalUsername = getPublicUsername(formData.planType, formData.username);
      
      const profileData: Record<string, any> = {
        user_id: signInData.user.id,
        email: formData.email,
        full_name: formData.fullName,
        username: finalUsername,
        plan_type: PERSONAL_PAYMENTS_ENABLED ? formData.planType : PERSONAL_TRIAL_CONFIG.paymentStatus,
        subscription_status: PERSONAL_TRIAL_CONFIG.subscriptionStatus,
        profile_photo_url: profilePhotoUrl,
        // Include ALL theme settings
        header_type: formData.headerType || "color",
        header_color: formData.headerColor || "#6BCB77",
        header_image_url: headerImageUrl,
        background_color: formData.backgroundColor || "#ffffff",
        card_front_headline: formData.cardHeadline || "Tap to Connect &\nCollaborate",
      };

      const { data: profileResult, error: profileError } = await supabase
        .from("personal_profiles")
        .insert(profileData as any)
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

      // Step 6: Create the links
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

      // Note: affiliate referral logging is now handled in PersonalSignupComplete
      // after Stripe payment verification for referred users

      // Step 8: Send welcome email with correct public username
      logCheckpoint("Sending welcome email");
      try {
        await supabase.functions.invoke("send-personal-welcome-emails", {
          body: {
            fullName: formData.fullName,
            username: finalUsername, // Use the public username
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
      // Real payment flow - redirect to Stripe (affiliate or regular)
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
      // Convert cropped photo blob to base64 for storage
      let profilePhotoBase64: string | null = null;
      if (formData.croppedPhotoBlob) {
        profilePhotoBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(formData.croppedPhotoBlob!);
        });
      }

      // Save complete signup data to sessionStorage for retrieval after payment
      const signupData = {
        fullName: formData.fullName,
        email: formData.email,
        username: formData.username,
        planType: formData.planType,
        links: formData.links,
        blocks: formData.blocks,
        cardHeadline: formData.cardHeadline,
        headerType: formData.headerType,
        headerColor: formData.headerColor,
        headerImageUrl: formData.headerImageUrl,
        backgroundColor: formData.backgroundColor,
        profilePhotoBase64, // Store as base64 for retrieval
        addExtraCard: formData.addExtraCard,
        extraCardCount: formData.extraCardCount,
      };
      
      sessionStorage.setItem("personal_signup_data", JSON.stringify(signupData));
      
      // Store password temporarily for auto-login after payment
      if (formData.password) {
        sessionStorage.setItem("signup_password", formData.password);
      }

      // Use affiliate payment link if referred, otherwise plan-based link
      const referralCode = sessionStorage.getItem("tapaway_ref");
      const paymentLink = referralCode
        ? PERSONAL_AFFILIATE_PAYMENT_LINK
        : (formData.planType === 'yearly' 
            ? PERSONAL_PAYMENT_LINKS.yearly 
            : PERSONAL_PAYMENT_LINKS.monthly);

      // Add prefilled email and client reference ID (username)
      const url = new URL(paymentLink);
      url.searchParams.set('prefilled_email', formData.email);
      url.searchParams.set('client_reference_id', formData.username);

      // Redirect to Stripe Payment Link
      window.location.href = url.toString();
    } catch (err) {
      console.error("Checkout error:", err);
      toast.error("Failed to start checkout. Please try again.");
      setProcessing(false);
      setIsLoading(false);
    }
  };

  // Handle existing account sign-in with their current password
  const handleExistingAccountSignIn = async () => {
    if (!existingPassword) {
      setOtpError("Please enter your password");
      return;
    }

    setProcessing(true);
    setIsLoading(true);
    setOtpError(null);
    logCheckpoint("Signing in existing user with their password");

    try {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: existingPassword,
      });

      if (signInError) {
        logCheckpoint("Existing account sign in failed", { error: signInError.message });
        setOtpError("Incorrect password. Please try again.");
        setProcessing(false);
        setIsLoading(false);
        return;
      }

      if (!signInData.user) {
        throw new Error("No user returned from sign in");
      }

      logCheckpoint("Existing user signed in", { userId: signInData.user.id });
      setFlowStep("creating");

      // Check if this user already has a personal profile
      const { data: existingProfile } = await supabase
        .from("personal_profiles")
        .select("id, username")
        .eq("user_id", signInData.user.id)
        .maybeSingle();

      if (existingProfile) {
        // They already have a personal profile - just redirect them
        logCheckpoint("User already has personal profile", { profileId: existingProfile.id });
        toast.success("Welcome back! You already have a TapAway profile.");
        localStorage.removeItem("tapaway_personal_draft");
        navigate(`/personal/dashboard`);
        return;
      }

      // Continue with creating their personal profile
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
          }
        } catch (photoErr) {
          console.warn("Photo upload error:", photoErr);
        }
      }

      // Step 4: Upload header image if custom image was selected
      let headerImageUrl = null;
      if (formData.headerType === "image" && formData.headerImageUrl) {
        try {
          let headerBlob: Blob;
          if (formData.headerImageUrl.startsWith("data:")) {
            const arr = formData.headerImageUrl.split(",");
            const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
              u8arr[n] = bstr.charCodeAt(n);
            }
            headerBlob = new Blob([u8arr], { type: mime });
          } else {
            headerImageUrl = formData.headerImageUrl;
            headerBlob = null as any;
          }

          if (headerBlob) {
            const headerPath = `${signInData.user.id}/header.jpg`;
            const { error: headerUploadError } = await supabase.storage
              .from("personal-photos")
              .upload(headerPath, headerBlob, { 
                upsert: true, 
                contentType: "image/jpeg" 
              });

            if (!headerUploadError) {
              const { data: { publicUrl } } = supabase.storage
                .from("personal-photos")
                .getPublicUrl(headerPath);
              headerImageUrl = `${publicUrl}?t=${Date.now()}`;
            }
          }
        } catch (headerErr) {
          console.warn("Header upload error:", headerErr);
        }
      }

      // Step 5: Create the personal profile
      const finalUsername = getPublicUsername(formData.planType, formData.username);
      
      const profileData = {
        user_id: signInData.user.id,
        email: formData.email,
        full_name: formData.fullName,
        username: finalUsername,
        plan_type: PERSONAL_PAYMENTS_ENABLED ? formData.planType : PERSONAL_TRIAL_CONFIG.paymentStatus,
        subscription_status: PERSONAL_TRIAL_CONFIG.subscriptionStatus,
        profile_photo_url: profilePhotoUrl,
        header_type: formData.headerType || "color",
        header_color: formData.headerColor || "#6BCB77",
        header_image_url: headerImageUrl,
        background_color: formData.backgroundColor || "#ffffff",
        card_front_headline: formData.cardHeadline || "Tap to Connect &\nCollaborate",
      };

      const { data: profileResult, error: profileError } = await supabase
        .from("personal_profiles")
        .insert(profileData)
        .select()
        .single();

      if (profileError) {
        if (profileError.code === "23505" || profileError.message?.includes("unique")) {
          throw new Error("This username is already taken. Please go back and choose a different one.");
        }
        throw new Error(`Failed to create profile: ${profileError.message}`);
      }

      // Create links
      if (formData.links.length > 0) {
        const linksToInsert = formData.links.map((link, index) => ({
          profile_id: profileResult.id,
          link_type: link.type,
          label: link.label,
          url: link.url,
          sort_order: index,
          is_active: true,
        }));

        await supabase.from("personal_links").insert(linksToInsert);
      }

      // Send welcome email
      try {
        await supabase.functions.invoke("send-personal-welcome-emails", {
          body: {
            fullName: formData.fullName,
            username: finalUsername,
            email: formData.email,
            profilePhotoUrl: profilePhotoUrl,
            profileId: profileResult.id,
          }
        });
      } catch (emailErr) {
        console.warn("Welcome email failed:", emailErr);
      }

      toast.success("Personal profile created! Welcome to TapAway!");
      localStorage.removeItem("tapaway_personal_draft");
      onComplete();

    } catch (err: any) {
      console.error("Existing account sign-in error:", err);
      const errorMessage = err?.message || "Something went wrong";
      setOtpError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setProcessing(false);
      setIsLoading(false);
    }
  };

  // Existing Account Sign-In View
  if (flowStep === "existing_account") {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
            <Shield className="h-8 w-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-foreground">You already have an account!</h2>
          <p className="text-muted-foreground">
            Sign in with your existing password to add a Personal profile to your account.
          </p>
        </div>

        <div className="p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground mb-1">Signing in as:</p>
          <p className="font-medium">{formData.email}</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Your existing password</label>
          <Input
            type="password"
            value={existingPassword}
            onChange={(e) => setExistingPassword(e.target.value)}
            placeholder="Enter your password"
            disabled={processing}
            autoFocus
          />
          {otpError && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {otpError}
            </p>
          )}
        </div>

        <Button
          onClick={handleExistingAccountSignIn}
          disabled={processing || !existingPassword}
          className="w-full h-14 text-base font-semibold"
        >
          {processing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Signing in...
            </>
          ) : (
            "Sign in & Continue"
          )}
        </Button>

        <div className="text-center space-y-2">
          <a 
            href="/auth?tab=login" 
            className="text-sm text-primary hover:underline"
          >
            Forgot your password?
          </a>
        </div>

        <Button
          variant="ghost"
          onClick={() => {
            setFlowStep("plan");
            setExistingPassword("");
            setOtpError(null);
          }}
          className="w-full"
          disabled={processing}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Use a different email
        </Button>
      </div>
    );
  }

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

  // Plan Selection View (simplified if planLocked)
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

      {/* Show plan summary if planLocked, otherwise show full selection */}
      {planLocked ? (
        // Compact plan summary (plan was chosen from pricing page)
        <div className="p-4 rounded-xl border-2 border-primary bg-primary/5">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-bold text-lg text-foreground">
                {formData.planType === "yearly" 
                  ? `Pro Annual — $${PERSONAL_PRICING.yearly}/year`
                  : formData.planType === "monthly"
                  ? `Pro Monthly — $${PERSONAL_PRICING.monthly}/month`
                  : "Free Plan"
                }
              </span>
              {formData.planType === "yearly" && (
                <p className="text-xs text-primary font-medium mt-1">
                  Save $45/year vs monthly
                </p>
              )}
            </div>
            <button
              onClick={() => navigate("/personal/pricing")}
              className="text-xs text-primary hover:underline"
            >
              Change
            </button>
          </div>
        </div>
      ) : (
        // Full plan selection
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
                BEST VALUE
              </span>
            </div>
            
            <div className="flex items-start justify-between pt-2">
              <div>
                <span className="font-bold text-xl text-foreground">Pro — ${PERSONAL_PRICING.yearly}/year</span>
                <p className="text-sm text-primary font-medium mt-1">Only $6.25/month • Save $45/year</p>
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
                <p className="text-sm text-muted-foreground mt-1">All Pro features • Flexible billing</p>
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
                <p className="text-sm text-muted-foreground mt-1">Limited features</p>
              </div>
              <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center ${
                formData.planType === "free" ? "border-muted-foreground bg-muted" : "border-muted"
              }`}>
                {formData.planType === "free" && <Check className="h-4 w-4 text-muted-foreground" />}
              </div>
            </div>
          </button>
        </div>
      )}

      {/* What's Included - only show if NOT planLocked */}
      {!planLocked && (
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
              Upgrade to Pro anytime to unlock all features
            </p>
          )}
        </div>
      )}

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
            Create My TapAway
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
