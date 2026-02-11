import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Mail, ArrowRight } from "lucide-react";
import { SuccessScreen } from "@/components/personal/signup/SuccessScreen";
import { Button } from "@/components/ui/button";
import { getPublicUsername } from "@/lib/personalUsername";

interface SavedSignupData {
  fullName: string;
  email: string;
  username: string;
  planType: "free" | "monthly" | "yearly";
  links: Array<{ type: string; label: string; url: string }>;
  blocks: Array<{ block_type: string; content: unknown; sort_order: number }>;
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
        // Step 1: Verify payment with backend
        setStep("verifying");
        const { data, error: verifyError } = await supabase.functions.invoke(
          "verify-personal-checkout",
          { body: { sessionId } }
        );

        if (verifyError) throw verifyError;
        
        if (!data?.success) {
          throw new Error(data?.error || "Verification failed");
        }

        console.log("[PersonalSignupComplete] Verification succeeded:", {
          username: data.username,
          userId: data.userId,
          planType: data.planType,
        });

        const verifiedUsername = data.username;
        const verifiedUserId = data.userId;
        const verifiedPlanType = data.planType || "yearly";
        
        setUsername(verifiedUsername);
        setPlanType(verifiedPlanType);

        // Step 2: Load saved signup data from sessionStorage
        const savedDataStr = sessionStorage.getItem("personal_signup_data");
        const savedPassword = sessionStorage.getItem("signup_password");
        
        if (!savedDataStr) {
          console.log("[PersonalSignupComplete] No saved signup data found");
          setStep("no_data");
          setLoading(false);
          return;
        }

        const savedData: SavedSignupData = JSON.parse(savedDataStr);
        console.log("[PersonalSignupComplete] Retrieved saved signup data:", {
          hasPhoto: !!savedData.profilePhotoBase64,
          linksCount: savedData.links?.length || 0,
          headerType: savedData.headerType,
        });

        setStep("finalizing");

        // Step 3: Try to sign in the user
        let signedIn = false;
        if (savedPassword && data.email) {
          try {
            // First, set the user's password using our edge function
            const { error: setPasswordError } = await supabase.functions.invoke(
              "set-user-password",
              { 
                body: { 
                  userId: verifiedUserId, 
                  password: savedPassword,
                  sessionId, // For verification
                } 
              }
            );

            if (!setPasswordError) {
              // Now sign in with the password
              const { error: signInError } = await supabase.auth.signInWithPassword({
                email: data.email,
                password: savedPassword,
              });

              if (!signInError) {
                signedIn = true;
                console.log("[PersonalSignupComplete] User signed in successfully");
              } else {
                console.warn("[PersonalSignupComplete] Sign in failed:", signInError.message);
              }
            } else {
              console.warn("[PersonalSignupComplete] Set password failed:", setPasswordError);
            }
          } catch (err) {
            console.warn("[PersonalSignupComplete] Auth error:", err);
          }
        }

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
              console.log("[PersonalSignupComplete] Profile photo uploaded");
            }
          } catch (err) {
            console.warn("[PersonalSignupComplete] Photo upload error:", err);
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
                console.log("[PersonalSignupComplete] Header image uploaded");
              }
            }
          } catch (err) {
            console.warn("[PersonalSignupComplete] Header upload error:", err);
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
          const updateData: Record<string, unknown> = {
            full_name: savedData.fullName,
            headline: savedData.cardHeadline || null,
            header_type: savedData.headerType || "banner",
            header_color: savedData.headerColor || "#6BCB77",
            background_color: savedData.backgroundColor || "#ffffff",
            card_front_headline: savedData.cardHeadline || "Tap to Connect &\nCollaborate",
          };

          if (profilePhotoUrl) {
            updateData.profile_photo_url = profilePhotoUrl;
          }
          if (headerImageUrl) {
            updateData.header_image_url = headerImageUrl;
          }

          await supabase
            .from("personal_profiles")
            .update(updateData)
            .eq("id", profile.id);

          console.log("[PersonalSignupComplete] Profile updated with theme settings");

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
              sort_order: index,
              is_active: true,
            }));

            await supabase
              .from("personal_links")
              .insert(linksToInsert);

            console.log("[PersonalSignupComplete] Links created:", linksToInsert.length);
          }
        }

        // Step 7b: Log affiliate referral, commission, and abuse check
        const referralCode = sessionStorage.getItem("tapaway_ref");
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

              console.log("[PersonalSignupComplete] Affiliate referral logged");

              // Auto-create commission
              if (referralRow) {
                try {
                  const { data: settings } = await supabase
                    .from("affiliate_settings")
                    .select("commission_per_referral")
                    .limit(1)
                    .single();

                  const commissionAmount = settings?.commission_per_referral ?? 5;

                  await supabase.from("affiliate_commissions").insert({
                    affiliate_id: affiliate.id,
                    referral_id: referralRow.id,
                    amount: commissionAmount,
                    status: "pending",
                  });

                  console.log("[PersonalSignupComplete] Commission created:", commissionAmount);
                } catch (commErr) {
                  console.warn("[PersonalSignupComplete] Commission creation failed (non-fatal):", commErr);
                }

                // Trigger abuse check (fire and forget)
                try {
                  supabase.functions.invoke("check-affiliate-abuse", {
                    body: {
                      referralId: referralRow.id,
                      affiliateId: affiliate.id,
                      ipAddress: data.clientIp || null,
                      referredEmail: data.email,
                    },
                  });
                } catch {
                  // Non-fatal
                }
              }
            }
          } catch (refErr) {
            console.warn("[PersonalSignupComplete] Referral logging failed (non-fatal):", refErr);
          }
          sessionStorage.removeItem("tapaway_ref");
        }

        // Step 8: Clear saved data
        sessionStorage.removeItem("personal_signup_data");
        sessionStorage.removeItem("signup_password");
        localStorage.removeItem("tapaway_personal_draft");

        // Step 9: If not signed in, send magic link
        if (!signedIn && data.needsPasswordSetup && data.email) {
          const { error: otpError } = await supabase.auth.signInWithOtp({
            email: data.email,
            options: {
              emailRedirectTo: `${window.location.origin}/personal/dashboard`,
            },
          });

          if (!otpError) {
            toast.success("Check your email to access your dashboard!");
          }
        }

        // Redirect to dashboard instead of showing success screen
        if (signedIn) {
          navigate("/personal/dashboard?welcome=true");
          return;
        }

        setStep("success");
      } catch (err) {
        console.error("[PersonalSignupComplete] Error:", err);
        setError(err instanceof Error ? err.message : "Failed to verify payment");
        toast.error("Something went wrong. Please contact support.");
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
      navigate("/auth?redirect=/personal/dashboard");
      return;
    }

    setSendingMagicLink(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/personal/dashboard`,
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
        <h1 className="text-2xl font-bold text-foreground mb-2">Something went wrong</h1>
        <p className="text-muted-foreground mb-6">{error}</p>
        <a href="/personal/signup" className="text-primary hover:underline">
          Try again
        </a>
      </div>
    );
  }

  // No saved data - show recovery options
  if (step === "no_data") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center max-w-md mx-auto">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <Mail className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Payment Confirmed! 🎉</h1>
        <p className="text-muted-foreground mb-8">
          Your account has been created. To complete your setup, please log in.
        </p>
        
        <div className="w-full space-y-3">
          <Button
            onClick={handleSendMagicLink}
            disabled={sendingMagicLink}
            className="w-full h-12"
          >
            {sendingMagicLink ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Mail className="h-4 w-4 mr-2" />
            )}
            Send me a login link
          </Button>
          
          <Button
            variant="outline"
            onClick={() => navigate("/auth?redirect=/personal/dashboard")}
            className="w-full h-12"
          >
            Log in with password
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  if (username && step === "success") {
    return <SuccessScreen username={username} planType={planType} />;
  }

  return null;
};

export default PersonalSignupComplete;