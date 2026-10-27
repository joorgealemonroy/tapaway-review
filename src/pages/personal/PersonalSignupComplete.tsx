import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

interface SavedSignupData {
  fullName: string;
  email: string;
  username: string;
  planType: "free" | "monthly" | "yearly";
  links: Array<{
    type: string;
    label: string;
    url: string;
    sortOrder?: number;
    pillColor?: string | null;
    isFeatured?: boolean;
    displayStyle?: string;
    coverImageUrl?: string | null;
    gridSize?: string | null;
    thumbnailUrl?: string | null;
  }>;
  blocks: Array<{ block_type: string; content: any; sort_order: number }>;
  cardHeadline?: string;
  headerType?: string;
  headerColor?: string;
  headerImageUrl?: string;
  backgroundColor?: string;
  profilePhotoBase64?: string | null;
  addExtraCard?: boolean;
  extraCardCount?: number;
}

const PersonalSignupComplete = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);
  const [planType, setPlanType] = useState<"free" | "monthly" | "yearly">("yearly");
  const [error, setError] = useState<string | null>(null);
  const [cardCheckFailed, setCardCheckFailed] = useState(false);
  const [step, setStep] = useState<"verifying" | "finalizing" | "success" | "no_data">("verifying");
  const [sendingMagicLink, setSendingMagicLink] = useState(false);

  useEffect(() => {
    const verifyAndComplete = async () => {
      const sessionId = searchParams.get("session_id");
      
      if (!sessionId) {
        setError("No session ID found");
        setLoading(false);
        return;
      }

      try {
        // Step 1: Load saved signup data FIRST (need email for verify call)
        const savedDataStr = localStorage.getItem("personal_signup_data") || sessionStorage.getItem("personal_signup_data");
        // SECURITY: passwords are no longer stored in browser storage across the Stripe redirect.
        // After payment, we always send a magic link to complete sign-in.
        
        let savedData: SavedSignupData | null = null;
        if (savedDataStr) {
          savedData = JSON.parse(savedDataStr);
        }

        // Step 2: Verify payment with backend, passing signup email
        setStep("verifying");
        const { data, error: verifyError } = await supabase.functions.invoke(
          "verify-personal-checkout",
          { body: { sessionId, signupEmail: savedData?.email } }
        );

        if (verifyError) throw verifyError;
        
        if (!data?.success) {
          // CARD-CHECK: a failed $1 card verification blocks the trial (the
          // subscription was canceled server-side). Show the plain-language
          // message instead of the generic error screen.
          const err = new Error(data?.error || "Verification failed") as Error & { cardCheckFailed?: boolean };
          err.cardCheckFailed = data?.cardCheckFailed === true;
          throw err;
        }

        const verifiedUsername = data.username;
        const verifiedUserId = data.userId;
        const verifiedPlanType = data.planType || "yearly";
        
        setUsername(verifiedUsername);
        setPlanType(verifiedPlanType);

        if (!savedData) {
          setStep("no_data");
          setLoading(false);
          return;
        }

        setStep("finalizing");

        // Checkout confirmation is not proof of account ownership. Only the
        // already authenticated owner can apply saved dashboard content here.
        const { data: ownerData, error: ownerError } = await supabase.auth.getUser();
        const signedIn = !ownerError && ownerData.user?.id === verifiedUserId;

        // Step 4: Upload profile photo if we have one
        let profilePhotoUrl: string | null = null;
        if (savedData.profilePhotoBase64 && signedIn) {
          try {
            // Convert base64 back to blob
            const arr = savedData.profilePhotoBase64.split(",");
            const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
              u8arr[n] = bstr.charCodeAt(n);
            }
            const photoBlob = new Blob([u8arr], { type: mime });

            const filePath = `${verifiedUserId}/profile.jpg`;
            const { error: uploadError } = await supabase.storage
              .from("personal-photos")
              .upload(filePath, photoBlob, { upsert: true, contentType: "image/jpeg" });

            if (!uploadError) {
              const { data: { publicUrl } } = supabase.storage
                .from("personal-photos")
                .getPublicUrl(filePath);
              profilePhotoUrl = `${publicUrl}?t=${Date.now()}`;
            }
          } catch (err) {
            console.warn("[PersonalSignupComplete] Photo upload error:");
          }
        }

        // Step 5: Upload header image if custom
        let headerImageUrl: string | null = null;
        if (savedData.headerType === "image" && savedData.headerImageUrl && signedIn) {
          try {
            if (savedData.headerImageUrl.startsWith("data:")) {
              const arr = savedData.headerImageUrl.split(",");
              const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
              const bstr = atob(arr[1]);
              let n = bstr.length;
              const u8arr = new Uint8Array(n);
              while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
              }
              const headerBlob = new Blob([u8arr], { type: mime });

              const headerPath = `${verifiedUserId}/header.jpg`;
              const { error: headerUploadError } = await supabase.storage
                .from("personal-photos")
                .upload(headerPath, headerBlob, { upsert: true, contentType: "image/jpeg" });

              if (!headerUploadError) {
                const { data: { publicUrl } } = supabase.storage
                  .from("personal-photos")
                  .getPublicUrl(headerPath);
                headerImageUrl = `${publicUrl}?t=${Date.now()}`;
              }
            }
          } catch (err) {
            console.warn("[PersonalSignupComplete] Header upload error:");
          }
        }

        // Step 6: Update profile with all the saved data
        const { data: profile } = await supabase
          .from("personal_profiles")
          .select("id")
          .eq("username", verifiedUsername)
          .single();

        if (profile) {
          // Update profile with complete data
          // Free users cannot use banner/image headers. Force to "color"
          let effectiveHeaderType = savedData.headerType || "banner";
          if (verifiedPlanType === "free" && (effectiveHeaderType === "banner" || effectiveHeaderType === "image")) {
            effectiveHeaderType = "color";
          }

          const updateData: Record<string, unknown> = {
            full_name: savedData.fullName,
            headline: savedData.cardHeadline || null,
            header_type: effectiveHeaderType,
            header_color: savedData.headerColor || "#6BCB77",
            background_color: savedData.backgroundColor || "#000000",
            card_front_headline: savedData.cardHeadline || null,
          };

          if (profilePhotoUrl) {
            updateData.profile_photo_url = profilePhotoUrl;
          }
          if (headerImageUrl) {
            updateData.header_image_url = headerImageUrl;
          }

          // Card Club was selected during signup. Do NOT grant it free.
          // The $5/mo subscription is completed from the one-time welcome
          // offer in the dashboard (see tapaway_pending_card_club).
          if (savedData.addExtraCard) {
            localStorage.setItem("tapaway_pending_card_club", "1");
          }

          await supabase
            .from("personal_profiles")
            .update(updateData)
            .eq("id", profile.id);

          // Step 7: Delete existing links and create new ones
          if (savedData.links && savedData.links.length > 0) {
            // Delete any existing links first (prevents duplicates on refresh)
            await supabase
              .from("personal_links")
              .delete()
              .eq("profile_id", profile.id);

            // Insert saved links
            const linksToInsert = savedData.links.map((link, index) => ({
              profile_id: profile.id,
              link_type: link.type,
              label: link.label,
              url: link.url,
              sort_order: link.sortOrder ?? index,
              is_active: true,
              pill_color: link.pillColor || "#000000",
              is_featured: link.isFeatured || false,
              display_style: link.displayStyle || "pill",
              cover_image_url: link.coverImageUrl || null,
              grid_size: link.gridSize || null,
              thumbnail_url: link.thumbnailUrl || null,
            }));

            await supabase
              .from("personal_links")
              .insert(linksToInsert);
          }

          // Step 7b: Create blocks from saved data
          if (savedData.blocks && savedData.blocks.length > 0) {
            // Delete any existing blocks first (prevents duplicates on refresh)
            await supabase
              .from("personal_blocks")
              .delete()
              .eq("profile_id", profile.id);

            const blocksToInsert = savedData.blocks.map((block, index) => ({
              profile_id: profile.id,
              block_type: block.block_type,
              content: (block.content || {}) as Json,
              sort_order: block.sort_order ?? index,
              is_active: true,
              alignment: block.content?.alignment || "center",
            }));

            await supabase
              .from("personal_blocks")
              .insert(blocksToInsert);
          }
        }

        // Step 7b: Log affiliate referral and abuse check
        const referralCode = localStorage.getItem("tapaway_ref") || sessionStorage.getItem("tapaway_ref");
        if (referralCode && profile) {
          try {
            const { data: affiliate } = await supabase
              .from("affiliates")
              .select("id")
              .eq("referral_code", referralCode.toLowerCase())
              .eq("is_active", true)
              .maybeSingle();

            if (affiliate) {
              // Insert referral record
              const { data: referralRow } = await supabase
                .from("affiliate_referrals")
                .insert({
                  affiliate_id: affiliate.id,
                  referred_user_id: verifiedUserId,
                  referred_profile_id: profile.id,
                  ip_address: data.clientIp || null,
                } as any)
                .select("id")
                .single();

              // Also update profile with referred_by
              await supabase
                .from("personal_profiles")
                .update({ referred_by: referralCode } as any)
                .eq("id", profile.id);

              // Financial rewards are created only by the server after
              // validating eligibility; browser signup data is not authority.
              if (referralRow) {
                try {
                  await supabase.functions.invoke("check-affiliate-abuse", {
                    body: {
                      referralId: referralRow.id,
                      affiliateId: affiliate.id,
                    },
                  });
                } catch {
                  // Non-fatal
                }
              }
            }
          } catch (refErr) {
            console.warn("[PersonalSignupComplete] Referral logging failed (non-fatal):");
          }
          localStorage.removeItem("tapaway_ref");
          sessionStorage.removeItem("tapaway_ref");
        }

        // Step 8: Clear saved data from both storage locations
        localStorage.removeItem("personal_signup_data");
        localStorage.removeItem("signup_password");
        sessionStorage.removeItem("personal_signup_data");
        sessionStorage.removeItem("signup_password");
        localStorage.removeItem("tapaway_personal_draft");

        // Step 9: If not signed in, send magic link
        if (!signedIn && data.needsPasswordSetup && data.email) {
          const { error: otpError } = await supabase.auth.signInWithOtp({
             email: data.email,
            options: {
              emailRedirectTo: `${window.location.origin}/dashboard?welcome=true`,
            },
          });

          if (!otpError) {
            toast.success("Check your email to access your dashboard!");
          }
        }

        // Redirect to dashboard instead of showing success screen
        if (signedIn) {
          navigate("/dashboard?welcome=true");
          return;
        }

        setStep("success");
      } catch (err) {
        console.error("[PersonalSignupComplete] Error:");
        const wasCardCheck = (err as { cardCheckFailed?: boolean })?.cardCheckFailed === true;
        setCardCheckFailed(wasCardCheck);
        setError(err instanceof Error ? err.message : "Failed to verify payment");
        if (!wasCardCheck) {
          toast.error("Something went wrong. Please contact support.");
        }
      } finally {
        setLoading(false);
      }
    };

    verifyAndComplete();
  }, [searchParams]);

  const handleSendMagicLink = async () => {
    const email = searchParams.get("email") || sessionStorage.getItem("signup_email");
    if (!email) {
      toast.error("No email found. Please try signing in.");
      navigate("/auth?redirect=/dashboard");
      return;
    }

    setSendingMagicLink(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw error;
      toast.success("Magic link sent! Check your email.");
    } catch (err) {
      toast.error("Failed to send magic link");
    } finally {
      setSendingMagicLink(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">
          {step === "verifying" && "Verifying your payment..."}
          {step === "finalizing" && "Setting up your profile..."}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          {cardCheckFailed ? "We couldn't verify your card" : "Something went wrong"}
        </h1>
        <p className="text-muted-foreground mb-6 max-w-md">{error}</p>
        <a href="/personal/signup" className="text-primary hover:underline">
          Try again
        </a>
      </div>
    );
  }

  // No saved data. Auto-redirect to auth (no dead-end screen)
  if (step === "no_data") {
    toast.info("Your account is ready! Please sign in.");
    navigate("/auth?redirect=/dashboard");
    return null;
  }

  // Success but not signed in. Auto-redirect to auth
  if (username && step === "success") {
    toast.info("Your profile is set up! Please sign in to continue.");
    navigate("/auth?redirect=/dashboard");
    return null;
  }

  return null;
};

export default PersonalSignupComplete;
