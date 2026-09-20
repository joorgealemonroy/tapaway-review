import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Check, Loader2, ArrowRight, User, Building2, CloudUpload, X, Mail, Phone, CreditCard, Clock3 } from "lucide-react";
// MagicLoadingOverlay removed. Concierge model: no auto-builder
import { motion, AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/hooks/useAuth";
import { GooglePlacesAutocomplete } from "@/components/GooglePlacesAutocomplete";
import { isSuperAdmin } from "@/lib/grandfatheredUsers";
import { normalizeGooglePlaceId, buildGoogleReviewUrl } from "@/lib/google";
import { getTrybeVisitorId } from "@/lib/trybePixel";
import {
  getOnboardingData,
  saveOnboardingData,
  clearOnboardingData,
  generateSlug,
  setPendingSetup,
  getCampaignParams,
} from "@/lib/onboardingData";
import { track } from "@/lib/analytics";
import { getAppSettings } from "@/lib/appSettings";
import { Button } from "@/components/ui/button";


type Plan = "solo" | "venue";
type BillingInterval = "month" | "year";
type Step = "plan" | "info";

const PLAN_DETAILS = {
  solo: { label: "TapAway Solo", subtitle: "For Service Pros & Individuals.", price: 20, yearlyPrice: 199, yearlyPerMonth: "16.58", yearlyBadge: "Save $41/yr", cards: 4, icon: User, refill: "3-card", badge: null, trialDays: 14, totalTrialDays: 14 },
  venue: { label: "TapAway Pro", subtitle: "For Storefronts & Teams.", price: 39, yearlyPrice: 390, yearlyPerMonth: "32.50", yearlyBadge: "2 months free", cards: 15, icon: Building2, refill: "10-card", badge: "Most Popular", trialDays: 14, totalTrialDays: 14 },
};

type CatalogItem = { plan: Plan; interval: BillingInterval; amount: number; currency: "usd"; trialDays: number; available: boolean };
const CATALOG_CACHE_KEY = "tapaway_onboarding_catalog_v1";

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
  // Token-specific validation state. A plain boolean races with the OAuth
  // param restore: after the stashed query string is navigated back in,
  // searchParams update and this re-validates the NEW token. But a boolean
  // left over from the pre-restore (no-token) pass could let post-auth setup
  // run against the wrong token. The gate below requires the validated token
  // to match the token currently in the URL.
  const [promoValidation, setPromoValidation] = useState<{ token: string | null; done: boolean }>({
    token: null,
    done: true,
  });

  // OAuth round-trip param restore.
  // Google/Apple strip query params from the redirect URI, which would
  // otherwise lose ?card=, ?promo_token=, and ?rep= on the way back.
  // handleOAuth stashes the query string before redirecting; this restores
  // it on return (before anything else reads the params). Runs once.
  const [restoreChecked, setRestoreChecked] = useState(false);
  const restoreAttempted = useRef(false);
  useEffect(() => {
    if (restoreAttempted.current) return;
    restoreAttempted.current = true;
    const current = new URLSearchParams(window.location.search);
    const hasOurs =
      current.get("session_id") || current.get("card") || current.get("promo_token") || current.get("rep");
    if (hasOurs) {
      sessionStorage.removeItem("tapaway_oauth_return_search");
      setRestoreChecked(true);
      return;
    }
    const stashed = sessionStorage.getItem("tapaway_oauth_return_search");
    if (stashed && stashed.length > 1) {
      sessionStorage.removeItem("tapaway_oauth_return_search");
      navigate(
        { pathname: "/onboarding", search: stashed, hash: window.location.hash || undefined },
        { replace: true }
      );
    }
    setRestoreChecked(true);
  }, [navigate]);

  // Card-claim detection (NFC tap flow: /start?card=CODE → /onboarding?card=CODE).
  // Stripe's success URL drops query params, so stash the code in sessionStorage
  // before the checkout redirect and claim it once onboarding completes.
  useEffect(() => {
    const cardCode = searchParams.get("card");
    if (cardCode) sessionStorage.setItem("tapaway_card_code", cardCode);
  }, [searchParams]);

  const [step, setStep] = useState<Step>("plan");
  const [direction, setDirection] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const [isCompletingSetup, setIsCompletingSetup] = useState(false);

  // Plan state
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  // Billing period: yearly is preselected and visually pushed as the best
  // value (Solo $199/yr = save $41; Venue $390/yr = 2 months free).
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("year");
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [dashboardType, setDashboardType] = useState<"restaurant" | "personal" | null>(null);

  // Business info state
  const [businessName, setBusinessName] = useState("");
  const [notOnGoogle, setNotOnGoogle] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoSkipped, setLogoSkipped] = useState(false);
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

  const stepNumber = step === "plan" ? 1 : 2;

  // ── Handle Stripe return ──
  const [verifyingCheckout, setVerifyingCheckout] = useState(false);

  // CARD-CHECK: plain-language message when the $1 card verification failed.
  // The trial was canceled in Stripe. Show the error + retry, never success.
  const [cardCheckError, setCardCheckError] = useState<string | null>(null);

  // ── Validate promo token on mount ──
  // Re-runs whenever the token in the URL changes. Including when the OAuth
  // round-trip restore navigates the stashed query string back in. The
  // validation state is keyed to the token it validated so post-auth setup
  // can never proceed against a stale/mismatched token.
  useEffect(() => {
    const token = promoTokenParam ?? null;
    // Mark validation pending for THIS token so the gate below waits for it.
    setPromoValidation({ token, done: false });
    if (!token) {
      setPromoValidation({ token: null, done: true });
      return;
    }
    let cancelled = false;
    const validatePromo = async () => {
      try {
        const { data, error: promoError } = await supabase.functions.invoke("validate-promo-token", {
          body: { token },
        });
        if (cancelled) return;
        if (!promoError && data?.valid) {
          setPromoDiscountType(data.discount_type as string);
          console.log("[onboarding] Valid promo token:", data.discount_type);
        } else {
          console.warn("[onboarding] Invalid promo token:", data?.error);
          toast.error("This promo link is invalid or expired.");
        }
      } catch {
        if (!cancelled) console.error("[onboarding] Promo validation failed");
      } finally {
        if (!cancelled) setPromoValidation({ token, done: true });
      }
    };
    validatePromo();
    return () => { cancelled = true; };
  }, [promoTokenParam]);

  // ── Init: check session, prefill, handle Stripe return ──
  useEffect(() => {
    const init = async () => {
      setPendingSetup(true);
      const savedData = getOnboardingData();

      if (savedData.businessName) setBusinessName(savedData.businessName);
      if (savedData.planType) setSelectedPlan(savedData.planType as Plan);
      const explicitBilling = searchParams.get("billing") || searchParams.get("billing_interval");
      if (explicitBilling === "month" || explicitBilling === "year") {
        setBillingInterval(explicitBilling);
        saveOnboardingData({ billingInterval: explicitBilling, billingSelectionExplicit: true });
      } else if (savedData.billingInterval === "month" || savedData.billingInterval === "year") {
        setBillingInterval(savedData.billingInterval);
      } else {
        const settings = await getAppSettings(supabase);
        setBillingInterval(settings.onboardingDefaultBilling);
      }
      saveOnboardingData({ hasProtection: false, campaign: { ...savedData.campaign, ...getCampaignParams() } });
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
          navigate("/dashboard");
          return;
        }

        if (restaurant) setRestaurantId(restaurant.id);

        // Handle return from Stripe checkout
        const sessionId = searchParams.get("session_id");
        if (sessionId && restaurant?.id) {
          setVerifyingCheckout(true);
          try {
            const { data, error } = await supabase.functions.invoke("verify-checkout", {
              body: { sessionId },
            });
            if (error) throw error;
            console.log("[onboarding] Stripe checkout verified:", data);
            if (data?.subscriptionStatus === "trialing") {
              track("trial_start_confirmed", { hubKind: "site", props: { session_id: sessionId } });
            }

            // CARD-CHECK: the $1 card verification failed. The trial was
            // canceled in Stripe. Show the plain-language message with a
            // retry path instead of the success screen.
            if (data?.cardCheckFailed) {
              setCardCheckError(
                typeof data?.message === "string" && data.message.length > 0
                  ? data.message
                  : "We couldn't verify your card. Double-check the details or try a different card."
              );
              setInitialCheckDone(true);
              return;
            }

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
            await claimPendingCard();
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

  useEffect(() => {
    let cancelled = false;
    const loadCatalog = async () => {
      try {
        const cached = sessionStorage.getItem(CATALOG_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached) as { expiresAt: number; catalog: CatalogItem[] };
          if (parsed.expiresAt > Date.now() && Array.isArray(parsed.catalog)) {
            if (!cancelled) setCatalog(parsed.catalog);
            if (!cancelled) setCatalogLoading(false);
            return;
          }
        }
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/onboarding-plan-catalog`, {
          headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        });
        if (!response.ok) throw new Error("Catalog unavailable");
        const data = await response.json();
        const items = Array.isArray(data?.catalog) ? data.catalog as CatalogItem[] : [];
        sessionStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify({ expiresAt: Date.now() + 10 * 60 * 1000, catalog: items }));
        if (!cancelled) setCatalog(items);
      } catch (error) {
        console.error("[onboarding] Plan catalog unavailable", error);
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    };
    loadCatalog();
    track("plan_view", { hubKind: "site", props: { default_interval: billingInterval } });
    return () => { cancelled = true; };
  }, []);

  const selectBillingInterval = (interval: BillingInterval) => {
    setBillingInterval(interval);
    saveOnboardingData({ billingInterval: interval, billingSelectionExplicit: true, hasProtection: false });
    track("billing_cycle_change", { hubKind: "site", props: { interval } });
  };

  const selectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setDashboardType(plan === "solo" ? "personal" : null);
    saveOnboardingData({ planType: plan, billingInterval, billingSelectionExplicit: true, hasProtection: false, dashboardType: plan === "solo" ? "personal" : undefined });
  };

  const continueFromPlan = () => {
    if (!selectedPlan) return;
    saveOnboardingData({ planType: selectedPlan, billingInterval, billingSelectionExplicit: true, hasProtection: false });
    track("continue_click", { hubKind: "site", props: { plan: selectedPlan, interval: billingInterval } });
    goTo("info", 1);
  };

  const catalogItem = (plan: Plan, interval: BillingInterval) => catalog.find((item) => item.plan === plan && item.interval === interval);

  // ── Card claim (NFC tap flow) ──
  // Claims a stashed card code after onboarding completes, mirroring the
  // personal-signup flow. Non-fatal: onboarding success must never depend
  // on the claim succeeding.
  const claimPendingCard = useCallback(async () => {
    const cardCode = sessionStorage.getItem("tapaway_card_code");
    if (!cardCode) return;
    try {
      await supabase.functions.invoke("claim-card", { body: { public_code: cardCode } });
      console.log("[onboarding] Card claimed:", cardCode);
      sessionStorage.removeItem("tapaway_card_code");
    } catch (err) {
      console.warn("[onboarding] Card claim failed (non-fatal):", err);
    }
  }, []);

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
        hasProtection: false,
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

      // Build headers. Only include auth if we have a session
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
      // Stash the current query string. The OAuth provider strips query
      // params from the redirect URI, which would otherwise lose ?card=,
      // ?promo_token=, and ?rep= on the way back. Restored on mount.
      if (window.location.search) {
        sessionStorage.setItem("tapaway_oauth_return_search", window.location.search);
      }

      // Save ALL step 3 data before redirect
      saveOnboardingData({
        businessName: businessName.trim(),
        logoUrl: logoUrl || '',
        planType: selectedPlan || 'venue',
        billingInterval,
        hasProtection: false,
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
        billingInterval,
        hasProtection: false,
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

      // Session is now set. The completeSetup useEffect will fire automatically
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

      // If we already have a session_id, skip. Handled in init
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
      const protection = false;
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
          // Duplicate slug. Try owner lookup first, then broader recovery
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
            // Try 2: slug taken by another user. Append random suffix
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

          await claimPendingCard();
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

      // ── ADMIN/TEST BYPASS: local dev only. Never runs in production builds.
      // Jorge: to test without Stripe, run `npm run dev` (Vite sets
      // import.meta.env.DEV to true only there) and sign in with tap@tapaway.co.
      const userEmail = session.user.email || '';
      const devBypassEnabled = import.meta.env.DEV === true;
      if (devBypassEnabled && userEmail === 'tap@tapaway.co') {
        console.log("[onboarding] Admin/test bypass. Skipping Stripe (local dev only)");
        await supabase.from("restaurants").update({
          subscription_status: "active",
          onboarding_completed: true,
          onboarding_step: 4,
        }).eq("id", rId);
        try { await supabase.functions.invoke("finalize-onboarding", { body: { restaurantId: rId } }); } catch {}
        await claimPendingCard();
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
            // Yearly is the pushed option: 14-day trial still applies, then
            // the full yearly amount ($199 Solo / $390 Venue) is charged.
            billingInterval: savedData.billingInterval === "month" || savedData.billingInterval === "year"
              ? savedData.billingInterval
              : billingInterval,
            hasProtection: false,
            promoToken: promoTokenParam || undefined,
            dashboardType: resolvedDashboardType,
            trybeVisitorId: getTrybeVisitorId(),
            campaign: savedData.campaign || {},
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

    // Only run post-auth completion once the OAuth param restore and promo
    // validation have both settled. The free-promo path depends on
    // promoDiscountType being resolved, and rep/card params must be back
    // before the restaurant row is created. The token check closes the race
    // where a stale "validated" flag from the pre-restore pass could let
    // completeSetup() run before the restored promo token was validated.
    if (!restoreChecked) return;
    const currentToken = promoTokenParam ?? null;
    if (!promoValidation.done || promoValidation.token !== currentToken) return;

    // Rep mode: the client's account is created via handleRepCheckout
    // (create-rep-onboarding), never via the standard post-auth setup.
    // Without this, a signed-in rep returning from OAuth would create the
    // business under their own account and be sent to Stripe.
    if (isRepMode) return;

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
  }, [initialCheckDone, step, restoreChecked, promoValidation, promoTokenParam, isRepMode]);

  // ── Loading ──
  const promoGateOpen =
    promoValidation.done && promoValidation.token === (promoTokenParam ?? null);
  if (!initialCheckDone || verifyingCheckout || !promoGateOpen || isCompletingSetup) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        {verifyingCheckout && <p className="text-gray-400 text-sm">Verifying your payment…</p>}
        {isCompletingSetup && <p className="text-gray-400 text-sm">Setting up your account…</p>}
      </div>
    );
  }

  // CARD-CHECK failure screen: the $1 card verification failed, so the trial
  // was canceled in Stripe and never went live. Offer a retry. Never success.
  if (cardCheckError) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] text-white flex flex-col items-center justify-center px-6">
        <div className="max-w-md w-full text-center space-y-5">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-red-500/15 flex items-center justify-center">
            <CreditCard className="w-7 h-7 text-red-400" />
          </div>
          <h1 className="text-2xl font-black">We couldn't verify your card</h1>
          <p className="text-gray-400 text-sm leading-relaxed">{cardCheckError}</p>
          <button
            onClick={() => {
              setCardCheckError(null);
              // Drop session_id so we don't re-verify the dead session, then
              // restart the flow. Saved business info is prefilled.
              navigate("/onboarding", { replace: true });
              goTo("plan", -1);
            }}
            className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-lg transition-colors flex items-center justify-center gap-2"
          >
            Try a different card <ArrowRight className="w-5 h-5" />
          </button>
          <p className="text-xs text-gray-500">
            Your trial hasn't started and you haven't been charged. Checking out again starts a fresh trial once your card verifies.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={step === "plan" ? "min-h-screen bg-[hsl(var(--onboarding-bg))] text-[hsl(var(--onboarding-fg))]" : "min-h-screen bg-[#0a0e1a] text-white"}>
      <Helmet>
        <title>Create Your Hub | TapAway</title>
        <meta name="description" content="Create your TapAway hub. Custom NFC cards, your business links in one place, free 14-day trial." />
        <link rel="canonical" href="https://tapaway.co/start" />
      </Helmet>
      {/* Nav */}
      <nav className={step === "plan" ? "sticky top-0 z-50 bg-[hsl(var(--onboarding-bg)/0.94)] backdrop-blur-lg border-b border-[hsl(var(--onboarding-border))]" : "sticky top-0 z-50 bg-[#0a0e1a]/90 backdrop-blur-lg border-b border-white/5"}>
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
          <a href="/" className="font-black text-2xl">TapAway</a>
          {step === "plan" ? <a href="/support" className="text-sm text-[hsl(var(--onboarding-muted))]">Need help?</a> : (
            <div className="flex gap-1.5">
              {[1, 2].map((s) => (
                <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${s <= stepNumber ? "w-8 bg-blue-500" : "w-4 bg-white/10"}`} />
              ))}
            </div>
          )}
        </div>
        {promoDiscountType && (
          <div className="max-w-md mx-auto px-4 pt-1">
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
              🎉 {promoDiscountType === 'free' ? '100% Free' : '50% Off'} Promo Applied
            </span>
          </div>
        )}
      </nav>

      <main className={step === "plan" ? "max-w-3xl mx-auto px-4 sm:px-6 pt-8 pb-52 md:pb-12" : "max-w-md mx-auto px-4 py-8"}>
        <AnimatePresence mode="wait" custom={direction}>
          {/* ════════ STEP 1: Plan Selection ════════ */}
          {step === "plan" && (
            <motion.div key="plan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-7">
              <header>
                <p className="mb-2 text-xs font-bold uppercase text-[hsl(var(--onboarding-green))]">Made for your business</p>
                <h1 className="text-4xl sm:text-5xl font-black leading-[1.02]">Let’s get your cards ready.</h1>
                <p className="mt-4 max-w-2xl text-lg leading-relaxed text-[hsl(var(--onboarding-muted))]">Choose your plan. We’ll design your cards, build your business hub, and ship it all to you.</p>
              </header>

              <div className="flex items-center justify-between rounded-md bg-[hsl(var(--onboarding-green-soft))] px-4 py-3 font-bold text-[hsl(var(--onboarding-green))]">
                <span className="flex items-center gap-2"><Clock3 className="h-5 w-5" />14 days free</span><span>$0 due today</span>
              </div>

              <section aria-labelledby="choose-plan-heading">
                <div className="mb-3 flex items-end justify-between gap-3">
                  <h2 id="choose-plan-heading" className="text-xl font-black">Choose your plan</h2>
                  <div className="grid grid-cols-2 rounded-md border border-[hsl(var(--onboarding-border))] bg-card p-1 text-sm">
                    <Button type="button" variant="ghost" size="sm" onClick={() => selectBillingInterval("year")} className={billingInterval === "year" ? "bg-[hsl(var(--onboarding-green))] text-primary-foreground hover:bg-[hsl(var(--onboarding-green))]" : "text-[hsl(var(--onboarding-muted))]"}>Yearly</Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => selectBillingInterval("month")} className={billingInterval === "month" ? "bg-[hsl(var(--onboarding-green))] text-primary-foreground hover:bg-[hsl(var(--onboarding-green))]" : "text-[hsl(var(--onboarding-muted))]"}>Monthly</Button>
                  </div>
                </div>

                {billingInterval === "year" && !catalogLoading && catalog.some((item) => item.interval === "year" && !item.available) && (
                  <div className="mb-3 rounded-md border border-[hsl(var(--onboarding-border))] bg-card px-4 py-3 text-sm">
                    Yearly is temporarily unavailable. <button type="button" className="font-bold underline" onClick={() => selectBillingInterval("month")}>Choose monthly</button>
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  {(["solo", "venue"] as Plan[]).map((plan) => {
                    const d = PLAN_DETAILS[plan];
                    const selected = selectedPlan === plan;
                    const item = catalogItem(plan, billingInterval);
                    const unavailable = !catalogLoading && item?.available === false;
                    const monthlyEquivalent = d.yearlyPrice / 12;
                    const savings = d.price * 12 - d.yearlyPrice;
                    return (
                      <Button key={plan} type="button" variant="outline" disabled={unavailable} onClick={() => selectPlan(plan)} className={`h-auto min-h-[238px] whitespace-normal p-5 text-left items-stretch justify-start border-2 bg-card text-card-foreground hover:bg-card ${selected ? "border-[hsl(var(--onboarding-green))]" : "border-[hsl(var(--onboarding-border))]"}`}>
                        <span className="flex w-full flex-col">
                          <span className="flex items-start gap-4">
                            <span className="relative flex h-24 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[hsl(var(--onboarding-green))] shadow-md">
                              <img src="/tapaway-card-front-v2.svg" alt="" className="h-full w-full object-cover" />
                            </span>
                            <span className="min-w-0 flex-1 pt-1">
                              <span className="flex items-start justify-between gap-2">
                                <span className="text-xl font-black">{d.label}</span>
                                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${selected ? "border-[hsl(var(--onboarding-green))] bg-[hsl(var(--onboarding-green))] text-primary-foreground" : "border-[hsl(var(--onboarding-muted))]"}`}>{selected && <Check className="h-4 w-4" />}</span>
                              </span>
                              <span className="mt-1 block text-sm text-[hsl(var(--onboarding-muted))]">{plan === "solo" ? "For independent pros & small businesses" : "For storefronts, restaurants & teams"}</span>
                            </span>
                          </span>
                          <span className="my-4 block h-px bg-[hsl(var(--onboarding-border))]" />
                          <span className="flex items-end justify-between gap-4">
                            <span><strong className="block text-base">{d.cards} custom smart cards</strong><span className="text-sm text-[hsl(var(--onboarding-muted))]">Your branding · Tap + QR</span></span>
                            <span className="text-right"><strong className="block text-xl">{billingInterval === "year" ? `$${monthlyEquivalent.toFixed(2)}/mo` : `$${d.price}/mo`}</strong><span className="text-xs text-[hsl(var(--onboarding-muted))]">{billingInterval === "year" ? `$${d.yearlyPrice} billed yearly · save $${savings}` : "after your free trial"}</span></span>
                          </span>
                        </span>
                      </Button>
                    );
                  })}
                </div>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-black">Included with either plan</h2>
                <div className="grid grid-cols-2 gap-x-5 gap-y-3 text-sm text-[hsl(var(--onboarding-muted))]">
                  {["Done-for-you setup", "Free US shipping", "Custom business hub", "Cancel anytime"].map((benefit) => <div key={benefit} className="flex items-center gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--onboarding-green))] text-primary-foreground"><Check className="h-3 w-3" /></span>{benefit}</div>)}
                </div>
              </section>

              <p className="text-xs leading-relaxed text-[hsl(var(--onboarding-muted))]">Your free trial starts today and runs 14 days. We’ll place a temporary $1 hold to verify your card; it is released automatically. Unless canceled before the trial ends, your selected plan renews automatically. Yearly cancellation stops the next renewal and does not refund the current annual term. See our <a href="/terms" className="underline">Terms</a> and <a href="/refund" className="underline">Refund Policy</a>.</p>
            </motion.div>
          )}

          {/* ════════ STEP 2: Business Info + Auth ════════ */}
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

              {/* Phone number. Required for concierge follow-up */}
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
                {!logoUrl && !logoSkipped && (
                  <button
                    type="button"
                    onClick={() => setLogoSkipped(true)}
                    className="w-full text-center text-xs text-gray-400 hover:text-gray-300 transition-colors underline"
                  >
                    Don't have it on your phone? Skip for now.
                  </button>
                )}
                {logoSkipped && !logoUrl && (
                  <p className="text-center text-xs text-gray-500">
                    Skipped. You can upload your logo from your dashboard later.
                  </p>
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
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>Shipping</span>
                    <span className="text-emerald-400 font-semibold">$0.00</span>
                  </div>
                  <div className="border-t border-white/10 mt-2 pt-2 flex justify-between font-bold">
                    <span>Total Due Today</span>
                    <span className="text-emerald-400 text-lg">$0.00</span>
                  </div>
                  <p className="text-xs text-gray-500 pt-2">
                    After trial: {billingInterval === "year" ? `$${PLAN_DETAILS[selectedPlan].yearlyPrice}/year` : `$${PLAN_DETAILS[selectedPlan].price}/month`}
                  </p>
                  <p className="text-xs text-gray-600">
                    Your 14-day free trial starts today. Cards ship free while you try it.
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

              {/* Card-verification disclosure: card entry happens on Stripe's
                  hosted page, so the notice lives on our last screen before
                  the redirect. */}
              <p className="text-center text-xs text-gray-500">
                We'll place a temporary $1 hold to verify your card. It's released automatically. Never charged.
              </p>

              <button
                onClick={() => goTo("plan", -1)}
                className="w-full text-center text-xs text-gray-600 hover:text-gray-400 transition-colors"
              >
                ← Back
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Fixed mobile summary for plan step */}
      <AnimatePresence>
        {step === "plan" && selectedPlan && (
          <motion.div
            initial={false}
            className="fixed bottom-0 left-0 right-0 z-50 border-t border-[hsl(var(--onboarding-border))] bg-[hsl(var(--onboarding-bg)/0.97)] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur md:static md:mt-8 md:border-t md:bg-transparent md:p-0"
          >
            <div className="max-w-3xl mx-auto">
              <div className="mb-3 flex items-center justify-between text-sm"><strong>{PLAN_DETAILS[selectedPlan].label} · {PLAN_DETAILS[selectedPlan].cards} cards</strong><strong className="text-[hsl(var(--onboarding-green))]">$0 today</strong></div>
              <Button onClick={continueFromPlan} disabled={catalogLoading || catalogItem(selectedPlan, billingInterval)?.available === false} className="h-14 w-full bg-[hsl(var(--onboarding-fg))] text-base font-bold text-primary-foreground hover:bg-[hsl(var(--onboarding-green))]">
                Continue with {selectedPlan === "solo" ? "Solo" : "Pro"} <ArrowRight className="w-5 h-5" />
              </Button>
              <p className="mt-2 text-center text-xs text-[hsl(var(--onboarding-muted))]">Then {billingInterval === "year" ? `$${PLAN_DETAILS[selectedPlan].yearlyPrice}/year` : `$${PLAN_DETAILS[selectedPlan].price}/month`} after 14 days. Cancel anytime.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Onboarding;
