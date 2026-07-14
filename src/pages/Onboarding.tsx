import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Check, Loader2, Shield, ArrowRight, User, Building2, CloudUpload, X, Mail, Phone } from "lucide-react";
// MagicLoadingOverlay removed — concierge model: no auto-builder
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { GooglePlacesAutocomplete } from "@/components/GooglePlacesAutocomplete";
import { isSuperAdmin } from "@/lib/grandfatheredUsers";
import { normalizeGooglePlaceId, buildGoogleReviewUrl } from "@/lib/google";
import {
  getOnboardingData,
  saveOnboardingData,
  clearOnboardingData,
  generateSlug,
  setPendingSetup,
} from "@/lib/onboardingData";


type Plan = "solo" | "venue";
type Step = "plan" | "protection" | "info";

const PLAN_DETAILS = {
  solo: { label: "Solo Pro", subtitle: "For Service Pros & Individuals.", price: 15, cards: 3, icon: User, refill: "3-card", badge: null, trialDays: 14, totalTrialDays: 21 },
  venue: { label: "Venue Pack", subtitle: "For Storefronts & Teams.", price: 39, cards: 15, icon: Building2, refill: "10-card", badge: "Most Popular", trialDays: 14, totalTrialDays: 21 },
};

const PROTECTION_PRICE = 5;

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
};

const Onboarding = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user: authUser } = useAuth();

  // Rep mode detection
  const isRepMode = searchParams.get("rep") === "true";
  const repId = searchParams.get("rep_id") || undefined;

  // Promo token detection
  const promoTokenParam = searchParams.get("promo_token") || undefined;
  const [promoDiscountType, setPromoDiscountType] = useState<string | null>(null);
  const [promoValidated, setPromoValidated] = useState(false);

  const [step, setStep] = useState<Step>("plan");
  const [direction, setDirection] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const [isCompletingSetup, setIsCompletingSetup] = useState(false);

  // Plan state
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [hasProtection, setHasProtection] = useState(false);
  const [dashboardType, setDashboardType] = useState<"restaurant" | "personal" | null>(null);

  // Business info state
  const [businessName, setBusinessName] = useState("");
  const [notOnGoogle, setNotOnGoogle] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [selectedGooglePlace, setSelectedGooglePlace] = useState<{
    placeId: string; name: string; address: string;
  } | null>(null);
  const [ownerPhone, setOwnerPhone] = useState("");

  // Rep mode: client email
  const [clientEmail, setClientEmail] = useState("");
  const [repSubmitting, setRepSubmitting] = useState(false);

  // Email signup
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [emailSignupAddress, setEmailSignupAddress] = useState("");
  const [emailSubmitting, setEmailSubmitting] = useState(false);

  // Auth / restaurant IDs
  const [userId, setUserId] = useState<string | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  // Success/loading

  const totalPrice = selectedPlan ? PLAN_DETAILS[selectedPlan].price + (hasProtection ? PROTECTION_PRICE : 0) : 0;
  const stepNumber = step === "plan" ? 1 : step === "protection" ? 2 : 3;

  // ── Handle Stripe return ──
  const [verifyingCheckout, setVerifyingCheckout] = useState(false);

  // ── Validate promo token on mount ──
  useEffect(() => {
    if (!promoTokenParam) { setPromoValidated(true); return; }
    const validatePromo = async () => {
      try {
        const { data, error: promoError } = await supabase.functions.invoke("validate-promo-token", {
          body: { token: promoTokenParam },
        });
        if (!promoError && data?.valid) {
          setPromoDiscountType(data.discount_type as string);
          console.log("[onboarding] Valid promo token:", data.discount_type);
        } else {
          console.warn("[onboarding] Invalid promo token:", data?.error);
          toast.error("This promo link is invalid or expired.");
        }
      } catch {
        console.error("[onboarding] Promo validation failed");
      } finally {
        setPromoValidated(true);
      }
    };
    validatePromo();
  }, [promoTokenParam]);

  // ── Init: check session, prefill, handle Stripe return ──
  useEffect(() => {
    const init = async () => {
      setPendingSetup(true);
      const savedData = getOnboardingData();

      if (savedData.businessName) setBusinessName(savedData.businessName);
      if (savedData.planType) setSelectedPlan(savedData.planType as Plan);
      if (savedData.hasProtection) setHasProtection(true);
      if (savedData.dashboardType) setDashboardType(savedData.dashboardType as 'personal' | 'restaurant');
      if (savedData.phone) setOwnerPhone(savedData.phone);

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        if (isSuperAdmin(session.user.email)) { navigate("/admin"); return; }
        setUserId(session.user.id);
        const { data: restaurant } = await supabase
          .from("restaurants")
          .select("id, onboarding_completed, plan_type")
          .eq("owner_id", session.user.id)
          .maybeSingle();
        if (restaurant?.onboarding_completed) {
          const dest = restaurant.plan_type === 'solo' ? "/dashboard?type=lite" : "/dashboard";
          navigate(dest);
          return;
        }
        if (restaurant) setRestaurantId(restaurant.id);

        // Handle return from Stripe checkout
        const sessionId = searchParams.get("session_id");
        if (sessionId && restaurant?.id) {
          setVerifyingCheckout(true);
          try {
            const { data, error } = await supabase.functions.invoke("verify-checkout", {
              body: { sessionId, userId: session.user.id },
            });
            if (error) throw error;
            console.log("[onboarding] Stripe checkout verified:", data);

            // Mark onboarding complete
            await supabase.from("restaurants").update({ onboarding_completed: true, onboarding_step: 4 }).eq("id", restaurant.id);

            // Finalize
            try { await supabase.functions.invoke("finalize-onboarding", { body: { restaurantId: restaurant.id } }); } catch {}

            // Send magic link for password setup if user signed up via email
            if (session.user.app_metadata?.provider === 'email') {
              try {
                await supabase.functions.invoke("send-magic-link-email", {
                  body: { userId: session.user.id, email: session.user.email, fullName: session.user.user_metadata?.full_name || '' },
                });
                console.log("[onboarding] Magic link sent for password setup");
              } catch (err) {
                console.error("[onboarding] Magic link send failed (non-blocking):", err);
              }
            }

            // Concierge model: route ALL paid users to VIP success screen
            clearOnboardingData();
            navigate("/onboarding-success");
            return;
          } catch (err: any) {
            console.error("[onboarding] Checkout verification failed:", err);
            toast.error("Payment verification failed. Please contact support.");
          } finally {
            setVerifyingCheckout(false);
          }
          setInitialCheckDone(true);
          return;
        }
      }
      setInitialCheckDone(true);
    };
    init();
  }, [navigate, searchParams]);

  // ── Auth guard ──
  useEffect(() => {
    const blocked = ["signInWithOtp", "signUp", "resetPasswordForEmail", "verifyOtp"] as const;
    const originals: Record<string, unknown> = {};
    blocked.forEach((m) => {
      const a = supabase.auth as any;
      if (typeof a[m] !== "function") return;
      originals[m] = a[m];
      a[m] = () => { throw new Error("Blocked in onboarding"); };
    });
    return () => { blocked.forEach((m) => { const a = supabase.auth as any; if (originals[m]) a[m] = originals[m]; }); };
  }, []);

  // ── Navigation helpers ──
  const goTo = (s: Step, dir: number) => { setDirection(dir); setStep(s); };

  // ── Google place handler ──
  const handleGooglePlaceSelected = useCallback(({ placeId, name, address }: { placeId: string; name: string; address: string }) => {
    const normalized = normalizeGooglePlaceId(placeId) || placeId.replace(/^places\//, "");
    setSelectedGooglePlace({ placeId: normalized, name, address });
    setBusinessName(name);
  }, []);

  // ── Logo upload handler ──
  const handleLogoUpload = async (file: File) => {
    if (file.size > 20 * 1024 * 1024) { toast.error("File must be under 20MB"); return; }
    setLogoUploading(true);
    try {
      // Convert to Base64 data URL and store locally (upload happens post-auth)
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setLogoUrl(base64);
        saveOnboardingData({ logoUrl: base64, logoUploaded: true });
        toast.success("Logo ready!");
        setLogoUploading(false);
      };
      reader.onerror = () => {
        toast.error("Failed to read file");
        setLogoUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
      setLogoUploading(false);
    }
  };

  const handleLogoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) handleLogoUpload(file);
  };

  const removeLogo = () => {
    setLogoUrl(null);
    saveOnboardingData({ logoUrl: '', logoUploaded: false });
  };

  // ── Rep mode / promo checkout ──
  const handleRepCheckout = async () => {
    if (!clientEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (!selectedGooglePlace && !businessName.trim()) {
      toast.error("Please search and select the business");
      return;
    }
    if (ownerPhone.replace(/\D/g, "").length < 7) {
      toast.error("Please enter a valid phone number");
      return;
    }

    setRepSubmitting(true);
    try {
      const requestBody: Record<string, unknown> = {
        clientEmail: clientEmail.trim(),
        businessName: businessName.trim(),
        planType: selectedPlan || "venue",
        hasProtection,
        googlePlaceId: selectedGooglePlace?.placeId || "",
        googlePlaceName: selectedGooglePlace?.name || "",
        googlePlaceAddress: selectedGooglePlace?.address || "",
        logoUrl: logoUrl || "",
        ownerPhone: ownerPhone.trim(),
        repRestaurantId: repId || "",
      };

      // If promo token present, attach it (allows unauthenticated invocation)
      if (promoTokenParam) {
        requestBody.promoToken = promoTokenParam;
      }

      // Build headers — only include auth if we have a session
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/create-rep-onboarding`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseAnonKey,
          ...headers,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Request failed");

      // Free promo: no Stripe URL, just redirect to success
      if (data?.success) {
        clearOnboardingData();
        navigate("/rep-checkout-success?status=success");
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error("No checkout URL returned");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to start checkout";
      console.error("[onboarding] Rep/promo checkout failed:", err);
      toast.error(message);
    } finally {
      setRepSubmitting(false);
    }
  };

  // ── Auth + complete ──
  const handleOAuth = async (provider: "google" | "apple") => {
    if (!selectedGooglePlace && !businessName.trim()) { toast.error("Please search and select your business"); return; }
    if (ownerPhone.replace(/\D/g, "").length < 7) { toast.error("Please enter a valid phone number"); return; }
    setIsLoading(true);

    try {
      // Save ALL step 3 data before redirect
      saveOnboardingData({
        businessName: businessName.trim(),
        logoUrl: logoUrl || '',
        planType: selectedPlan || 'venue',
        hasProtection,
        googlePlaceId: selectedGooglePlace?.placeId || '',
        googlePlaceName: selectedGooglePlace?.name || '',
        googlePlaceAddress: selectedGooglePlace?.address || '',
        phone: ownerPhone.trim(),
        dashboardType: dashboardType || (selectedPlan === 'solo' ? 'personal' : 'restaurant'),
      });

      const { error } = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin + "/onboarding",
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message || "Auth failed");
      setIsLoading(false);
    }
  };

  // ── Email signup handler ──
  const handleEmailSignup = async () => {
    const email = emailSignupAddress.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (!selectedGooglePlace && !businessName.trim()) {
      toast.error("Please search and select your business");
      return;
    }
    if (ownerPhone.replace(/\D/g, "").length < 7) {
      toast.error("Please enter a valid phone number");
      return;
    }

    setEmailSubmitting(true);
    try {
      // Save onboarding data (same as OAuth flow)
      saveOnboardingData({
        businessName: businessName.trim(),
        logoUrl: logoUrl || '',
        planType: selectedPlan || 'venue',
        hasProtection,
        googlePlaceId: selectedGooglePlace?.placeId || '',
        googlePlaceName: selectedGooglePlace?.name || '',
        googlePlaceAddress: selectedGooglePlace?.address || '',
        phone: ownerPhone.trim(),
        dashboardType: dashboardType || (selectedPlan === 'solo' ? 'personal' : 'restaurant'),
      });

      // Create user via edge function (auto-confirmed, bypasses email verification)
      const { data, error } = await supabase.functions.invoke("create-email-signup", {
        body: { email, businessName: businessName.trim() },
      });

      if (error) throw new Error(error.message || "Signup failed");
      if (data?.error) throw new Error(data.error);

      // Sign in with the temp credentials to get a session
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: data.tempPassword,
      });

      if (signInError) throw signInError;

      // Session is now set — the completeSetup useEffect will fire automatically
      console.log("[onboarding] Email signup successful, session set");
    } catch (err: any) {
      console.error("[onboarding] Email signup failed:", err);
      toast.error(err.message || "Failed to create account");
      setEmailSubmitting(false);
    }
  };

  // Post-auth: create restaurant then redirect to Stripe
  useEffect(() => {
    if (!initialCheckDone) return;
    const completeSetup = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      // If we already have a session_id, skip — handled in init
      if (searchParams.get("session_id")) return;

      const uid = session.user.id;
      setUserId(uid);

      const savedData = getOnboardingData();
      const bName = businessName || savedData.businessName;
      let savedLogoUrl = logoUrl || savedData.logoUrl || null;
      if (!bName) return;

      // Show loading screen immediately so user doesn't see Step 1
      setIsCompletingSetup(true);
      setIsLoading(true);

      // Already completed?
      const { data: existing } = await supabase
        .from("restaurants")
        .select("id, onboarding_completed, google_place_id")
        .eq("owner_id", uid)
        .maybeSingle();
      if (existing?.onboarding_completed) { navigate("/dashboard"); return; }

      // Upload Base64 logo now that user is authenticated
      if (savedLogoUrl && savedLogoUrl.startsWith('data:')) {
        try {
          const response = await fetch(savedLogoUrl);
          const blob = await response.blob();
          const ext = blob.type.split('/')[1] || 'png';
          const fileName = `onboarding-${uid}-${Date.now()}.${ext}`;
          const { error: uploadError } = await supabase.storage.from('restaurant-logos').upload(fileName, blob, { upsert: true });
          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage.from('restaurant-logos').getPublicUrl(fileName);
            savedLogoUrl = publicUrl;
          } else {
            console.error("[onboarding] Logo upload failed:", uploadError);
            savedLogoUrl = null;
          }
        } catch (err) {
          console.error("[onboarding] Logo upload error:", err);
          savedLogoUrl = null;
        }
      }

      const slug = generateSlug(bName);

      const plan = (savedData.planType as Plan) || selectedPlan || "venue";
      const protection = savedData.hasProtection || hasProtection;
      const resolvedDashboardType = savedData.dashboardType || dashboardType || (plan === 'solo' ? 'personal' : 'restaurant');
      const totalTrialDays = PLAN_DETAILS[plan].totalTrialDays;
      const trialEndsAt = new Date(Date.now() + totalTrialDays * 86400000).toISOString();

      const ownerPhoneSaved = (savedData.phone || ownerPhone || '').trim();

      let rId = existing?.id || restaurantId;
      if (rId) {
        await supabase.from("restaurants").update({
          restaurant_name: bName,
          custom_slug: slug,
          email: session.user.email,
          subscription_status: "trialing",
          onboarding_step: 3,
          plan_type: plan,
          has_loss_protection: protection,
          trial_ends_at: trialEndsAt,
          ...(ownerPhoneSaved ? { phone: ownerPhoneSaved } : {}),
          ...(savedLogoUrl ? { logo_url: savedLogoUrl } : {}),
        }).eq("id", rId);
      } else {
        const { data: created, error: insertErr } = await supabase.from("restaurants").insert({
          owner_id: uid,
          restaurant_name: bName,
          custom_slug: slug,
          email: session.user.email,
          subscription_status: "trialing",
          onboarding_step: 3,
          plan_type: plan,
          has_loss_protection: protection,
          trial_ends_at: trialEndsAt,
          ...(ownerPhoneSaved ? { phone: ownerPhoneSaved } : {}),
          ...(savedLogoUrl ? { logo_url: savedLogoUrl } : {}),
        }).select("id").single();

        if (insertErr && insertErr.code === '23505') {
          // Duplicate slug — try owner lookup first, then broader recovery
          console.log("[onboarding] Slug collision, attempting recovery");

          // Try 1: find by owner_id (any slug)
          const { data: ownedRow } = await supabase.from("restaurants")
            .select("id").eq("owner_id", uid).maybeSingle();

          if (ownedRow?.id) {
            rId = ownedRow.id;
            await supabase.from("restaurants").update({
              restaurant_name: bName,
              custom_slug: slug,
              email: session.user.email,
              subscription_status: "trialing",
              onboarding_step: 3,
              plan_type: plan,
              has_loss_protection: protection,
              trial_ends_at: trialEndsAt,
              ...(ownerPhoneSaved ? { phone: ownerPhoneSaved } : {}),
              ...(savedLogoUrl ? { logo_url: savedLogoUrl } : {}),
            }).eq("id", rId);
          } else {
            // Try 2: slug taken by another user — append random suffix
            const uniqueSlug = `${slug}-${Date.now().toString(36)}`;
            console.log("[onboarding] Slug taken by another user, using fallback:", uniqueSlug);
            const { data: created2, error: insertErr2 } = await supabase.from("restaurants").insert({
              owner_id: uid,
              restaurant_name: bName,
              custom_slug: uniqueSlug,
              email: session.user.email,
              subscription_status: "trialing",
              onboarding_step: 3,
              plan_type: plan,
              has_loss_protection: protection,
              trial_ends_at: trialEndsAt,
              ...(ownerPhoneSaved ? { phone: ownerPhoneSaved } : {}),
              ...(savedLogoUrl ? { logo_url: savedLogoUrl } : {}),
            }).select("id").single();
            if (insertErr2) {
              console.error("[onboarding] Fallback slug insert also failed:", insertErr2);
            } else {
              rId = created2?.id;
            }
          }
        } else {
          rId = created?.id;
        }
      }
      if (!rId) { toast.error("Failed to create account"); setIsLoading(false); setIsCompletingSetup(false); return; }
      setRestaurantId(rId);

      // Save Google place if selected (from state or restored from localStorage)
      const placeId = selectedGooglePlace?.placeId || savedData.googlePlaceId;
      const placeName = selectedGooglePlace?.name || savedData.googlePlaceName;
      const placeAddress = selectedGooglePlace?.address || savedData.googlePlaceAddress;
      if (placeId) {
        const reviewUrl = buildGoogleReviewUrl(placeId);
        const encodedAddr = encodeURIComponent(placeAddress || "");
        const encodedName = encodeURIComponent(placeName || bName);
        await supabase.from("restaurants").update({
          google_place_id: placeId,
          google_review_url: reviewUrl,
          address: placeAddress || undefined,
          directions_url: `https://maps.apple.com/?q=${encodedName}&address=${encodedAddr}`,
        }).eq("id", rId);
      }

      // Concierge model: NO auto-builder. Our team builds the profile manually.
      // (Removed: auto-yelp-from-place + magic-onboarding edge function calls.)

      // ── FREE PROMO: skip Stripe entirely ──
      if (promoDiscountType === 'free' && promoTokenParam) {
        try {
          await supabase.from("restaurants").update({
            subscription_status: "active",
            onboarding_completed: true,
            onboarding_step: 4,
          }).eq("id", rId);

          await supabase.functions.invoke("validate-promo-token", {
            body: { token: promoTokenParam, markUsed: true },
          });

          try { await supabase.functions.invoke("finalize-onboarding", { body: { restaurantId: rId } }); } catch {}

          clearOnboardingData();
          navigate("/onboarding-success");
          return;
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Failed to activate free promo";
          console.error("[onboarding] Free promo activation failed:", err);
          toast.error(message);
          setIsLoading(false);
          setIsCompletingSetup(false);
          return;
        }
      }

      // ── ADMIN/TEST BYPASS: skip Stripe for dev testing ──
      const userEmail = session.user.email || '';
      if (userEmail === 'tap@tapaway.co' || userEmail.endsWith('@tapaway.co') || userEmail.includes('+test')) {
        console.log("[onboarding] Admin/test bypass — skipping Stripe");
        await supabase.from("restaurants").update({
          subscription_status: "active",
          onboarding_completed: true,
          onboarding_step: 4,
        }).eq("id", rId);
        try { await supabase.functions.invoke("finalize-onboarding", { body: { restaurantId: rId } }); } catch {}
        clearOnboardingData();
        navigate("/onboarding-success");
        return;
      }

      // Redirect to Stripe Checkout for card on file
      try {
        const { data, error } = await supabase.functions.invoke("create-checkout-session", {
          body: {
            email: session.user.email,
            userId: uid,
            restaurantId: rId,
            planType: plan,
            hasProtection: protection,
            promoToken: promoTokenParam || undefined,
            dashboardType: resolvedDashboardType,
          },
        });
        if (error) throw error;
        if (data?.url) {
          window.location.href = data.url;
          return;
        }
        throw new Error("No checkout URL returned");
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Stripe redirect failed";
        console.error("[onboarding] Stripe redirect failed:", err);
        toast.error("Failed to start checkout. Please try again.");
        setIsLoading(false);
        setIsCompletingSetup(false);
      }
    };

    // Only run post-auth completion if we came back from OAuth
    if (step === "info" || step === "plan") {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_IN") {
          completeSetup();
          subscription.unsubscribe();
        }
      });
      completeSetup();
      return () => subscription.unsubscribe();
    }
  }, [initialCheckDone, step]);

  // ── Loading ──
  if (!initialCheckDone || verifyingCheckout || !promoValidated || isCompletingSetup) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        {verifyingCheckout && <p className="text-gray-400 text-sm">Verifying your payment…</p>}
        {isCompletingSetup && <p className="text-gray-400 text-sm">Setting up your account…</p>}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-[#0a0e1a]/90 backdrop-blur-lg border-b border-white/5">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <a href="/" className="font-black text-xl tracking-tight">TapAway</a>
          <div className="flex gap-1.5">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${s <= stepNumber ? "w-8 bg-blue-500" : "w-4 bg-white/10"}`} />
            ))}
          </div>
        </div>
        {promoDiscountType && (
          <div className="max-w-md mx-auto px-4 pt-1">
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
              🎉 {promoDiscountType === 'free' ? '100% Free' : '50% Off'} Promo Applied
            </span>
          </div>
        )}
      </nav>

      <main className="max-w-md mx-auto px-4 py-8">
        <AnimatePresence mode="wait" custom={direction}>
          {/* ════════ STEP 1: Plan Selection ════════ */}
          {step === "plan" && (
            <motion.div key="plan" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }} className="space-y-6">
              <div className="text-center">
                <h1 className="text-3xl font-black mb-2">What's your setup?</h1>
                <p className="text-gray-400">Pick the plan that fits your business.</p>
              </div>

              <div className="space-y-4">
                {(["solo", "venue"] as Plan[]).map((plan) => {
                  const d = PLAN_DETAILS[plan];
                  const selected = selectedPlan === plan;
                  const Icon = d.icon;
                  return (
                    <button
                      key={plan}
                      onClick={() => { setSelectedPlan(plan); if (plan === 'solo') setDashboardType('personal'); else setDashboardType(null); }}
                      className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 relative overflow-hidden ${
                        selected
                          ? "border-blue-500 bg-blue-500/10 shadow-[0_0_30px_rgba(59,130,246,0.15)]"
                          : "border-white/10 bg-[#111827] hover:border-white/20"
                      }`}
                    >
                      {/* Trial badge — top left */}
                      <div className="absolute top-0 left-0 bg-emerald-500 text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-br-lg">
                        {d.trialDays}-Day Free Trial
                      </div>
                      {d.badge && (
                        <div className="absolute top-0 right-0 bg-[#3B82F6] text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-bl-lg">
                          {d.badge}
                        </div>
                      )}
                      <div className="flex items-start gap-4 mt-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selected ? "bg-blue-500/20" : "bg-white/5"}`}>
                          <Icon className={`w-6 h-6 ${selected ? "text-blue-400" : "text-gray-400"}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-lg font-bold">{d.label}</span>
                            {/* Radio selection indicator */}
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                selected ? "border-[#3B82F6] bg-[#3B82F6]" : "border-white/30 bg-transparent"
                              }`}
                              aria-hidden="true"
                            >
                              {selected && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                          </div>
                          <div className="mb-1">
                            <div className="text-2xl font-black text-[#3B82F6] leading-tight">$0 Today</div>
                            <div className="text-xs text-gray-500">(then ${d.price}/mo after {d.trialDays} days)</div>
                          </div>
                          <p className="text-sm text-gray-400 mb-1">{d.subtitle}</p>
                          <p className="text-xs text-gray-500">Includes <span className="font-bold text-gray-400">{d.cards} Smart Cards + Free Shipping</span>.</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>


              {/* Spacer for fixed bottom button */}
              {selectedPlan && <div className="h-20" />}
            </motion.div>
          )}

          {/* ════════ STEP 2: Loss Protection ════════ */}
          {step === "protection" && selectedPlan && (
            <motion.div key="protection" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }} className="space-y-6">
              <div className="text-center">
                <h1 className="text-2xl font-black mb-2">Customers love these cards.<br />Sometimes too much.</h1>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {selectedPlan === "solo"
                    ? "Don't let missing cards stall your growth. Includes priority replacements, easy to claim anytime in your dashboard."
                    : "In busy venues, cards tend to walk home with guests. Don't stop growing because a card went missing."}
                </p>
              </div>

              {/* Protection card */}
              <div className="relative rounded-2xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-transparent to-purple-600/10 pointer-events-none" />
                <div className="border border-white/10 rounded-2xl p-6 bg-[#111827] space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                      <Shield className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Loss Protection</h3>
                      <p className="text-blue-400 font-black text-xl">$5<span className="text-sm font-normal text-gray-500">/mo</span> <span className="text-emerald-400 text-sm font-semibold">($0 Today)</span></p>
                    </div>
                  </div>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-blue-400 shrink-0" /> <span><span className="font-bold text-white">Monthly</span> {PLAN_DETAILS[selectedPlan].refill} refills available when you need them.</span></li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-blue-400 shrink-0" /> No questions asked replacements</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-blue-400 shrink-0" /> Cancel anytime</li>
                  </ul>
                </div>
              </div>

              <button
                onClick={() => { setHasProtection(true); goTo("info", 1); }}
                className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-lg transition-colors flex items-center justify-center gap-2"
              >
                Add Protection — $0 Today
              </button>

              <button
                onClick={() => { setHasProtection(false); goTo("info", 1); }}
                className="w-full text-center text-sm text-gray-500 hover:text-gray-300 transition-colors py-2"
              >
                No thanks, I'll pay $10 + shipping per replacement
              </button>

              <p className="text-center text-xs text-gray-600">
                Standard billing starts after your trial ends. Cancel anytime.
              </p>

              <button
                onClick={() => goTo("plan", -1)}
                className="w-full text-center text-xs text-gray-600 hover:text-gray-400 transition-colors"
              >
                ← Back
              </button>
            </motion.div>
          )}

          {/* ════════ STEP 3: Business Info + Auth ════════ */}
          {step === "info" && (
            <motion.div key="info" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }} className="space-y-8">
              <div className="text-center">
                <h1 className="text-2xl font-black mb-2">Let's brand your cards</h1>
                <p className="text-gray-400 text-sm">Tell us about your business. We'll design your cards and build your digital profile for you.</p>
              </div>

              {/* Google Places Business Search OR Manual Entry */}
              <div>
                {!notOnGoogle ? (
                  <>
                    <GooglePlacesAutocomplete
                      onPlaceSelected={handleGooglePlaceSelected}
                      defaultValue={businessName}
                      placeholder="e.g., Joe's Pizza"
                      label="Search Your Business on Google"
                    />
                    {selectedGooglePlace && (
                      <p className="text-xs text-emerald-400 mt-1.5 flex items-center gap-1">
                        <Check className="w-3 h-3" /> {selectedGooglePlace.name}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => { setNotOnGoogle(true); setSelectedGooglePlace(null); }}
                      className="text-xs text-blue-400 hover:text-blue-300 mt-2 transition-colors"
                    >
                      Not on Google yet?
                    </button>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-gray-300 text-sm">Business Name</Label>
                      <Input
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="Your Business Name"
                        className="mt-1 h-12 bg-[#111827] border-white/10 text-white placeholder:text-gray-600 rounded-xl focus:border-blue-500 focus:ring-blue-500/20"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300 text-sm">Website URL <span className="text-gray-500">(optional)</span></Label>
                      <Input
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        placeholder="https://yourbusiness.com"
                        className="mt-1 h-12 bg-[#111827] border-white/10 text-white placeholder:text-gray-600 rounded-xl focus:border-blue-500 focus:ring-blue-500/20"
                      />
                      <p className="text-xs text-gray-500 mt-1">We'll use this to pull your branding and social links.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotOnGoogle(false)}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      ← Search Google instead
                    </button>
                  </div>
                )}
              </div>

              {/* Phone number — required for concierge follow-up */}
              <div>
                <Label className="text-gray-300 text-sm flex items-center gap-2">
                  <Phone className="w-4 h-4" /> Phone Number
                </Label>
                <Input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="mt-1 h-12 bg-[#111827] border-white/10 text-white placeholder:text-gray-600 rounded-xl focus:border-blue-500 focus:ring-blue-500/20"
                />
                <p className="text-xs text-gray-500 mt-1">
                  We'll text you to confirm details and finalize your design.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300 text-sm">Your Logo</Label>
                {logoUrl ? (
                  <div className="flex items-center gap-3 p-3 bg-[#111827] border border-white/10 rounded-xl">
                    <img src={logoUrl} alt="Logo preview" className="w-12 h-12 rounded-lg object-cover" />
                    <span className="text-sm text-gray-300 flex-1 truncate">Logo uploaded</span>
                    <button onClick={removeLogo} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleLogoDrop}
                    onClick={() => logoInputRef.current?.click()}
                    className="border-2 border-dashed border-white/10 hover:border-blue-500/40 rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer transition-colors bg-[#111827]/50"
                  >
                    {logoUploading ? (
                      <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                    ) : (
                      <CloudUpload className="w-6 h-6 text-gray-500" />
                    )}
                    <span className="text-sm text-gray-400">{logoUploading ? "Uploading..." : "Drag & drop or click to upload"}</span>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => { if (e.target.files?.[0]) handleLogoUpload(e.target.files[0]); }}
                    />
                  </div>
                )}
                <p className="text-xs text-gray-500 italic">
                  Pro Tip: High-resolution PNGs work best. Our design team will manually optimize your logo for the best print quality.
                </p>
              </div>

              {/* Due Today receipt */}
              {selectedPlan && (
                <div className="bg-slate-900/50 border border-white/10 rounded-xl p-5 space-y-1.5">
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>{PLAN_DETAILS[selectedPlan].label}</span>
                    <span className="text-emerald-400 font-semibold">$0.00</span>
                  </div>
                  {hasProtection && (
                    <div className="flex justify-between text-sm text-gray-400">
                      <span>Loss Protection</span>
                      <span className="text-emerald-400 font-semibold">$0.00</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>Shipping</span>
                    <span className="text-emerald-400 font-semibold">$0.00</span>
                  </div>
                  <div className="border-t border-white/10 mt-2 pt-2 flex justify-between font-bold">
                    <span>Total Due Today</span>
                    <span className="text-emerald-400 text-lg">$0.00</span>
                  </div>
                  <p className="text-xs text-gray-500 pt-2">
                    After trial: ${PLAN_DETAILS[selectedPlan].price}{hasProtection ? ` + $${PROTECTION_PRICE}` : ""}/mo
                  </p>
                  <p className="text-xs text-gray-600">
                    Your trial starts after a 7-day shipping buffer so you get the full experience.
                  </p>
                </div>
              )}

              {/* Auth buttons OR Rep email input */}
              {(isRepMode && authUser) || !!promoTokenParam ? (
                <div className="space-y-4">
                  <div>
                    <Label className="text-gray-300 text-sm flex items-center gap-2">
                      <Mail className="w-4 h-4" /> Owner's Email Address
                    </Label>
                    <Input
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="owner@business.com"
                      className="mt-1 h-12 bg-[#111827] border-white/10 text-white placeholder:text-gray-600 rounded-xl focus:border-blue-500 focus:ring-blue-500/20"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      We'll send them a link to set up their password and access their dashboard.
                    </p>
                  </div>
                  <button
                    onClick={handleRepCheckout}
                    disabled={repSubmitting || !clientEmail.trim()}
                    className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {repSubmitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>Continue to Checkout <ArrowRight className="w-5 h-5" /></>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={() => handleOAuth("google")}
                    disabled={isLoading}
                    className="w-full h-14 bg-white text-gray-900 font-bold rounded-xl text-base transition-all hover:bg-gray-100 flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" className="w-5 h-5"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                        Start My Free Trial
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleOAuth("apple")}
                    disabled={isLoading}
                    className="w-full h-14 bg-white/5 border border-white/10 text-white font-bold rounded-xl text-base transition-all hover:bg-white/10 flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                    Start My Free Trial
                  </button>

                  {/* Email signup option */}
                  {!showEmailInput ? (
                    <button
                      onClick={() => setShowEmailInput(true)}
                      className="w-full text-center text-sm text-gray-500 hover:text-gray-300 transition-colors py-2 flex items-center justify-center gap-2"
                    >
                      <Mail className="w-3.5 h-3.5" /> or continue with email
                    </button>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      transition={{ duration: 0.25 }}
                      className="space-y-3 overflow-hidden"
                    >
                      <Input
                        type="email"
                        value={emailSignupAddress}
                        onChange={(e) => setEmailSignupAddress(e.target.value)}
                        placeholder="you@email.com"
                        className="h-12 bg-[#111827] border-white/10 text-white placeholder:text-gray-600 rounded-xl focus:border-blue-500 focus:ring-blue-500/20"
                        onKeyDown={(e) => { if (e.key === "Enter") handleEmailSignup(); }}
                        autoFocus
                      />
                      <button
                        onClick={handleEmailSignup}
                        disabled={emailSubmitting || !emailSignupAddress.trim()}
                        className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-base transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {emailSubmitting ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>Start My Free Trial <ArrowRight className="w-5 h-5" /></>
                        )}
                      </button>
                    </motion.div>
                  )}
                </div>
              )}

              <button
                onClick={() => goTo("protection", -1)}
                className="w-full text-center text-xs text-gray-600 hover:text-gray-400 transition-colors"
              >
                ← Back
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Fixed bottom CTA for plan step */}
      <AnimatePresence>
        {step === "plan" && selectedPlan && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-[#0a0e1a] via-[#0a0e1a]/95 to-transparent pt-10"
          >
            <div className="max-w-md mx-auto">
              <button
                onClick={() => goTo("protection", 1)}
                className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-lg transition-colors flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(59,130,246,0.3)]"
              >
                Continue <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Onboarding;
