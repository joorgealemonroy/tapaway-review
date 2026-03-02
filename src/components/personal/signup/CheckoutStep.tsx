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
import { PERSONAL_PLANS } from "@/lib/personalPlanLimits";
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
  RefreshCw,
  AlertTriangle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  formData: SignupData;
  updateFormData: (updates: Partial<SignupData>) => void;
  onBack: () => void;
  onComplete: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  planLocked?: boolean;
  cardCode?: string;
  isOAuthUser?: boolean;
}

type FlowStep = "plan" | "otp_sent" | "verifying" | "creating" | "existing_account";
type PlanType = "free" | "monthly" | "yearly";

export const CheckoutStep = ({ formData, updateFormData, onBack, onComplete, isLoading, setIsLoading, planLocked = false, cardCode, isOAuthUser = false }: Props) => {
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [flowStep, setFlowStep] = useState<FlowStep>("plan");
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [detailedError, setDetailedError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [existingPassword, setExistingPassword] = useState("");
  const [existingUserId, setExistingUserId] = useState<string | null>(null);
  const [showPlanSelector, setShowPlanSelector] = useState(false);
  const [showDowngradeWarning, setShowDowngradeWarning] = useState(false);
  const [pendingDowngradePlan, setPendingDowngradePlan] = useState<PlanType | null>(null);
  const [downgradeIssues, setDowngradeIssues] = useState<string[]>([]);
  const [preAuthed, setPreAuthed] = useState(false);

  // Detect if user is already authenticated (card activation flow or OAuth)
  useEffect(() => {
    const checkPreAuth = async () => {
      const flag = sessionStorage.getItem("tapaway_card_preauthed");
      if (flag === "true" || isOAuthUser) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setPreAuthed(true);
        }
      }
    };
    checkPreAuth();
  }, [isOAuthUser]);

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
    if (formData.planType === "free" || formData.planType === "vip") return 0;
    return formData.planType === "yearly" ? PERSONAL_PRICING.yearly : PERSONAL_PRICING.monthly;
  };
  const maxFreeLinks = PERSONAL_PLANS.free.maxLinks;

  const getProFeaturesInUse = (): string[] => {
    const issues: string[] = [];
    if (formData.headerType === "image") issues.push("Custom header image will revert to a solid color");
    if (formData.links.length > maxFreeLinks) issues.push(`Links beyond ${maxFreeLinks} will be removed`);
    const proBlocks = formData.blocks.filter(b => (b.type as string) === "photo_collage");
    if (proBlocks.length > 0) issues.push("Pro-only blocks (photo collage) will be removed");
    return issues;
  };

  const handlePlanSwitch = (newPlan: PlanType) => {
    const currentPlan = formData.planType;
    // Switching to free from a paid plan - check for pro features
    if (newPlan === "free" && currentPlan !== "free") {
      const issues = getProFeaturesInUse();
      if (issues.length > 0) {
        setDowngradeIssues(issues);
        setPendingDowngradePlan(newPlan);
        setShowDowngradeWarning(true);
        return;
      }
    }
    updateFormData({ planType: newPlan });
    setShowPlanSelector(false);
  };

  const confirmDowngrade = () => {
    if (!pendingDowngradePlan) return;
    // Strip pro features
    const updates: Partial<SignupData> = { planType: pendingDowngradePlan };
    if (formData.headerType === "image") {
      updates.headerType = "color";
      updates.headerImageUrl = null;
    }
    if (formData.links.length > maxFreeLinks) {
      // We can't directly trim links via updateFormData since links is managed separately,
      // but we update planType and the trimming happens naturally
    }
    updateFormData(updates);
    setShowDowngradeWarning(false);
    setPendingDowngradePlan(null);
    setShowPlanSelector(false);
    toast.info("Switched to Free plan. Some Pro features were removed.");
  };
  const isFreePlan = formData.planType === "free" || formData.planType === "vip";


  const logAffiliateReferral = async (userId: string, profileId: string, planType: string) => {
    const referralCode = sessionStorage.getItem("tapaway_ref") || localStorage.getItem("tapaway_ref");
    if (!referralCode) return;

    try {
      const { data: affiliate } = await supabase
        .from("affiliates")
        .select("id")
        .eq("referral_code", referralCode.toLowerCase())
        .eq("is_active", true)
        .maybeSingle();

      if (!affiliate) return;

      // Insert referral record
      const { data: referralRow } = await supabase
        .from("affiliate_referrals")
        .insert({
          affiliate_id: affiliate.id,
          referred_user_id: userId,
          referred_profile_id: profileId,
        } as any)
        .select("id")
        .single();

      // Update profile with referred_by
      await supabase
        .from("personal_profiles")
        .update({ referred_by: referralCode } as any)
        .eq("id", profileId);

      console.log("[CheckoutStep] Affiliate referral logged");

      // Create commission for free signups
      if (referralRow && planType === "free") {
        try {
          const { count: referralCount } = await supabase
            .from("affiliate_referrals")
            .select("id", { count: "exact", head: true })
            .eq("affiliate_id", affiliate.id);

          const { data: affSettings } = await supabase
            .from("affiliate_settings")
            .select("commission_free_base, commission_free_bonus, bonus_threshold")
            .limit(1)
            .single();

          const threshold = affSettings?.bonus_threshold ?? 25;
          const amount = (referralCount ?? 0) > threshold
            ? Number(affSettings?.commission_free_bonus ?? 5)
            : Number(affSettings?.commission_free_base ?? 3);

          await supabase
            .from("affiliate_commissions")
            .insert({
              affiliate_id: affiliate.id,
              referral_id: referralRow.id,
              amount,
              status: "pending",
            } as any);

          console.log(`[CheckoutStep] Created $${amount} free-signup commission`);
        } catch (commErr) {
          console.warn("[CheckoutStep] Commission creation failed (non-fatal):", commErr);
        }

        // Fire abuse check (non-fatal)
        try {
          supabase.functions.invoke("check-affiliate-abuse", {
            body: {
              referralId: referralRow.id,
              affiliateId: affiliate.id,
              referredEmail: formData.email,
            },
          });
        } catch {
          // Non-fatal
        }
      }
    } catch (refErr) {
      console.warn("[CheckoutStep] Referral logging failed (non-fatal):", refErr);
    }

    // Clear ref from storage
    sessionStorage.removeItem("tapaway_ref");
    localStorage.removeItem("tapaway_ref");
  };

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
      
      // Detect VIP card activation
      const isVipCard = sessionStorage.getItem("tapaway_card_vip") === "true";
      const effectivePlanType = isVipCard ? "vip" : formData.planType;
      
      // Use the helper to get the correct public username
      const finalUsername = getPublicUsername(effectivePlanType as any, formData.username);
      
      const profileData: Record<string, any> = {
        user_id: signInData.user.id,
        email: formData.email,
        full_name: formData.fullName,
        username: finalUsername,
        plan_type: isVipCard ? "vip" : (PERSONAL_PAYMENTS_ENABLED ? formData.planType : PERSONAL_TRIAL_CONFIG.paymentStatus),
        subscription_status: isVipCard ? "active" : PERSONAL_TRIAL_CONFIG.subscriptionStatus,
        profile_photo_url: profilePhotoUrl,
        // Include ALL theme settings
        header_type: formData.headerType || "color",
        header_color: formData.headerColor || "#6BCB77",
        header_image_url: headerImageUrl,
        background_color: formData.backgroundColor || "#ffffff",
        card_front_headline: formData.cardHeadline || null,
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
          sort_order: link.sortOrder ?? index,
          is_active: true,
          pill_color: link.pillColor || null,
          is_featured: link.isFeatured || false,
          display_style: link.displayStyle || "pill",
          cover_image_url: link.coverImageUrl || null,
          grid_size: link.gridSize || null,
          thumbnail_url: link.thumbnailUrl || null,
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

      // Step 6b: Create blocks
      if (formData.blocks.length > 0) {
        logCheckpoint("Creating blocks", { count: formData.blocks.length });
        const blocksToInsert = formData.blocks.map((block, index) => ({
          profile_id: profileResult.id,
          block_type: block.type,
          content: block.content || {},
          sort_order: block.sortOrder ?? index,
          is_active: true,
          alignment: (block.content as any)?.alignment || "center",
        }));

        const { error: blocksError } = await supabase
          .from("personal_blocks")
          .insert(blocksToInsert);

        if (blocksError) {
          console.warn("Blocks insert error:", blocksError);
        } else {
          logCheckpoint("Blocks created successfully");
        }
      }

      // Affiliate referral logging for free-plan signups (paid plans go through PersonalSignupComplete -> stripe-webhook)
      if (isFreePlan) {
        await logAffiliateReferral(signInData.user.id, profileResult.id, formData.planType);
      }

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

      // Claim NFC card if this signup originated from card activation
      if (cardCode) {
        try {
          await supabase.functions.invoke("claim-card", {
            body: { public_code: cardCode },
          });
          logCheckpoint("Card claimed", { cardCode });
        } catch (claimErr) {
          console.warn("Card claim failed (non-fatal):", claimErr);
        }
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

  const createProfileDirectly = async () => {
    setProcessing(true);
    setIsLoading(true);
    setFlowStep("creating");
    logCheckpoint("Pre-authed user — skipping OTP, creating profile directly");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user found");

      logCheckpoint("Session confirmed", { userId: user.id });

      // Upload profile photo
      let profilePhotoUrl = formData.profilePhotoUrl;
      if (formData.croppedPhotoBlob) {
        logCheckpoint("Uploading profile photo");
        try {
          const filePath = `${user.id}/profile.jpg`;
          const { error: uploadError } = await supabase.storage
            .from("personal-photos")
            .upload(filePath, formData.croppedPhotoBlob, { upsert: true, contentType: "image/jpeg" });
          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage.from("personal-photos").getPublicUrl(filePath);
            profilePhotoUrl = `${publicUrl}?t=${Date.now()}`;
          } else {
            console.warn("Photo upload failed:", uploadError);
          }
        } catch (photoErr) {
          console.warn("Photo upload error:", photoErr);
        }
      }

      // Upload header image
      let headerImageUrl: string | null = null;
      if (formData.headerType === "image" && formData.headerImageUrl) {
        try {
          let headerBlob: Blob | null = null;
          if (formData.headerImageUrl.startsWith("data:")) {
            const arr = formData.headerImageUrl.split(",");
            const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) u8arr[n] = bstr.charCodeAt(n);
            headerBlob = new Blob([u8arr], { type: mime });
          } else {
            headerImageUrl = formData.headerImageUrl;
          }
          if (headerBlob) {
            const headerPath = `${user.id}/header.jpg`;
            const { error: headerUploadError } = await supabase.storage
              .from("personal-photos")
              .upload(headerPath, headerBlob, { upsert: true, contentType: "image/jpeg" });
            if (!headerUploadError) {
              const { data: { publicUrl } } = supabase.storage.from("personal-photos").getPublicUrl(headerPath);
              headerImageUrl = `${publicUrl}?t=${Date.now()}`;
            }
          }
        } catch (headerErr) {
          console.warn("Header upload error:", headerErr);
        }
      }

      // Detect VIP card activation
      const isVipCard = sessionStorage.getItem("tapaway_card_vip") === "true";
      const effectivePlanType = isVipCard ? "vip" : formData.planType;
      
      // Create profile
      const finalUsername = getPublicUsername(effectivePlanType as any, formData.username);
      const profileData: Record<string, any> = {
        user_id: user.id,
        email: formData.email,
        full_name: formData.fullName,
        username: finalUsername,
        plan_type: isVipCard ? "vip" : (PERSONAL_PAYMENTS_ENABLED ? formData.planType : PERSONAL_TRIAL_CONFIG.paymentStatus),
        subscription_status: isVipCard ? "active" : PERSONAL_TRIAL_CONFIG.subscriptionStatus,
        profile_photo_url: profilePhotoUrl,
        header_type: formData.headerType || "color",
        header_color: formData.headerColor || "#6BCB77",
        header_image_url: headerImageUrl,
        background_color: formData.backgroundColor || "#ffffff",
        card_front_headline: formData.cardHeadline || null,
      };

      const { data: profileResult, error: profileError } = await supabase
        .from("personal_profiles")
        .insert(profileData as any)
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
          sort_order: link.sortOrder ?? index,
          is_active: true,
          pill_color: link.pillColor || null,
          is_featured: link.isFeatured || false,
          display_style: link.displayStyle || "pill",
          cover_image_url: link.coverImageUrl || null,
          grid_size: link.gridSize || null,
          thumbnail_url: link.thumbnailUrl || null,
        }));
        await supabase.from("personal_links").insert(linksToInsert);
      }

      // Create blocks
      if (formData.blocks.length > 0) {
        const blocksToInsert = formData.blocks.map((block, index) => ({
          profile_id: profileResult.id,
          block_type: block.type,
          content: block.content || {},
          sort_order: block.sortOrder ?? index,
          is_active: true,
          alignment: (block.content as any)?.alignment || "center",
        }));
        await supabase.from("personal_blocks").insert(blocksToInsert);
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

      // Affiliate referral logging for free-plan signups
      if (isFreePlan) {
        await logAffiliateReferral(user.id, profileResult.id, formData.planType);
      }

      // Cleanup
      sessionStorage.removeItem("tapaway_card_preauthed");
      sessionStorage.removeItem("tapaway_card_email");
      sessionStorage.removeItem("tapaway_card_password");
      sessionStorage.removeItem("tapaway_card_vip");
      localStorage.removeItem("tapaway_personal_draft");

      // Claim NFC card if this signup originated from card activation
      if (cardCode) {
        try {
          await supabase.functions.invoke("claim-card", {
            body: { public_code: cardCode },
          });
          logCheckpoint("Card claimed (pre-authed)", { cardCode });
        } catch (claimErr) {
          console.warn("Card claim failed (non-fatal):", claimErr);
        }
      }

      logCheckpoint("Account creation complete (pre-authed flow)");
      toast.success("Account created successfully! Welcome to TapAway!");
      onComplete();

    } catch (err: any) {
      console.error("Account creation error:", err);
      const errorMessage = err?.message || "Something went wrong";
      setOtpError(errorMessage);
      setDetailedError(`Error details: ${JSON.stringify(err)}`);
      setFlowStep("plan");
      toast.error(errorMessage);
    } finally {
      setProcessing(false);
      setIsLoading(false);
    }
  };

  const handleGetCard = () => {
    const isVipCard = sessionStorage.getItem("tapaway_card_vip") === "true";
    if (isVipCard || isFreePlan) {
      if (preAuthed) {
        createProfileDirectly();
      } else {
        sendOTP();
      }
    } else if (PERSONAL_PAYMENTS_ENABLED) {
      handleStripeCheckout();
    } else {
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
      const isVipCard = sessionStorage.getItem("tapaway_card_vip") === "true";
      const effectivePlanType = isVipCard ? "vip" : formData.planType;
      const finalUsername = getPublicUsername(effectivePlanType as any, formData.username);
      
      const profileData = {
        user_id: signInData.user.id,
        email: formData.email,
        full_name: formData.fullName,
        username: finalUsername,
        plan_type: isVipCard ? "vip" : (PERSONAL_PAYMENTS_ENABLED ? formData.planType : PERSONAL_TRIAL_CONFIG.paymentStatus),
        subscription_status: isVipCard ? "active" : PERSONAL_TRIAL_CONFIG.subscriptionStatus,
        profile_photo_url: profilePhotoUrl,
        header_type: formData.headerType || "color",
        header_color: formData.headerColor || "#6BCB77",
        header_image_url: headerImageUrl,
        background_color: formData.backgroundColor || "#ffffff",
        card_front_headline: formData.cardHeadline || null,
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

      // Create blocks
      if (formData.blocks.length > 0) {
        const blocksToInsert = formData.blocks.map((block, index) => ({
          profile_id: profileResult.id,
          block_type: block.type,
          content: block.content || {},
          sort_order: index,
          is_active: true,
        }));

        await supabase.from("personal_blocks").insert(blocksToInsert);
      }

      // Affiliate referral logging for free-plan signups
      if (isFreePlan) {
        await logAffiliateReferral(signInData.user.id, profileResult.id, formData.planType);
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
          {flowStep !== "creating" && (
            <button
              type="button"
              onClick={() => {
                setFlowStep("plan");
                setOtpCode("");
                setOtpError(null);
              }}
              className="text-xs text-muted-foreground underline cursor-pointer mx-auto"
            >
              Wrong email? Change it
            </button>
          )}
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

      {/* Show plan summary if planLocked and not editing, otherwise show full selection */}
      {planLocked && !showPlanSelector ? (
        // Compact plan summary (plan was chosen from pricing page)
        <div className={`p-4 rounded-xl border-2 ${formData.planType === "free" ? "border-muted bg-muted/30" : "border-primary bg-primary/5"}`}>
         <div className="flex items-center justify-between">
            <div>
              <span className="font-bold text-lg text-foreground">
                {sessionStorage.getItem("tapaway_card_vip") === "true"
                  ? "⭐ VIP Access — $0"
                  : formData.planType === "yearly" 
                  ? "Pro Annual — $6.25/month"
                  : formData.planType === "monthly"
                  ? `Pro Monthly — $${PERSONAL_PRICING.monthly}/month`
                  : "Free Plan — $0"
                }
              </span>
              {sessionStorage.getItem("tapaway_card_vip") === "true" ? (
                <p className="text-xs text-primary font-medium mt-1">
                  Full Pro features included with your VIP card
                </p>
              ) : formData.planType === "yearly" ? (
                <p className="text-xs text-primary font-medium mt-1">
                  Billed annually $75
                </p>
              ) : null}
            </div>
            {sessionStorage.getItem("tapaway_card_vip") !== "true" && (
              <button
                onClick={() => setShowPlanSelector(true)}
                className="text-xs text-primary hover:underline"
              >
                Change
              </button>
            )}
          </div>
        </div>
      ) : (
        // Full plan selection
        <div className="space-y-3">
          {/* Pro Yearly Plan - Most Prominent */}
          <button
            onClick={() => handlePlanSwitch("yearly")}
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
                <span className="font-bold text-xl text-foreground">Pro — $6.25/month</span>
                <p className="text-sm text-primary font-medium mt-1">Billed annually $75 • Save $45/year</p>
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
            onClick={() => handlePlanSwitch("monthly")}
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
            onClick={() => handlePlanSwitch("free")}
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
            {formData.planType === "vip"
              ? "VIP Access"
              : formData.planType === "free" 
              ? "Free plan" 
              : formData.planType === "yearly" 
              ? "Annual plan" 
              : "Monthly plan"}
          </span>
          <div className="text-right">
            <span className="font-medium">
              {formData.planType === "free" || formData.planType === "vip"
                ? "$0"
                : formData.planType === "yearly"
                ? "$6.25/mo"
                : `$${PERSONAL_PRICING.monthly}/mo`}
            </span>
            {formData.planType === "yearly" && (
              <p className="text-xs text-muted-foreground">Billed annually $75</p>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-lg font-semibold text-foreground">
            Total due today
          </span>
          <span className="text-2xl font-bold text-foreground">
            ${calculateTotal()}
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
          formData.planType === "vip" ? "Create My TapAway" : "Create Free Account"
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
        {PERSONAL_PAYMENTS_ENABLED && !isFreePlan && (
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

      {/* Downgrade Warning Dialog */}
      <AlertDialog open={showDowngradeWarning} onOpenChange={setShowDowngradeWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Some features will be removed
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>Switching to the Free plan means these Pro features you set up will be affected:</p>
                <ul className="space-y-1.5">
                  {downgradeIssues.map((issue, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-amber-500 mt-0.5">•</span>
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={() => setPendingDowngradePlan(null)}>
              Keep Pro plan
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDowngrade}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Switch to Free anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
