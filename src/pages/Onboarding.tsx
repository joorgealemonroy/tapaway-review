import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Check, Loader2, Shield, ArrowRight, User, Building2, CloudUpload, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
import TapAwayCard3D from "@/components/TapAwayCard3D";

type Plan = "solo" | "venue";
type Step = "plan" | "protection" | "info";

const PLAN_DETAILS = {
  solo: { label: "Solo Pro", subtitle: "For Barbers & Personal Brands.", price: 15, cards: 3, icon: User, refill: "3-card", badge: null, trialDays: 7, totalTrialDays: 14 },
  venue: { label: "Venue Pack", subtitle: "For Restaurants & Retail.", price: 39, cards: 15, icon: Building2, refill: "10-card", badge: "Most Popular", trialDays: 14, totalTrialDays: 21 },
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

  const [step, setStep] = useState<Step>("plan");
  const [direction, setDirection] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  // Plan state
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [hasProtection, setHasProtection] = useState(false);

  // Business info state
  const [businessName, setBusinessName] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [selectedGooglePlace, setSelectedGooglePlace] = useState<{
    placeId: string; name: string; address: string;
  } | null>(null);

  // Auth / restaurant IDs
  const [userId, setUserId] = useState<string | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  // Success
  const [showSuccess, setShowSuccess] = useState(false);

  const totalPrice = selectedPlan ? PLAN_DETAILS[selectedPlan].price + (hasProtection ? PROTECTION_PRICE : 0) : 0;
  const stepNumber = step === "plan" ? 1 : step === "protection" ? 2 : 3;

  // ── Init: check session, prefill ──
  useEffect(() => {
    const init = async () => {
      setPendingSetup(true);
      const savedData = getOnboardingData();
      const emailFromQuery = searchParams.get("email");

      if (savedData.businessName) setBusinessName(savedData.businessName);
      if (savedData.shippingAddress) setShippingAddress(savedData.shippingAddress);

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        if (isSuperAdmin(session.user.email)) { navigate("/admin"); return; }
        setUserId(session.user.id);
        const { data: restaurant } = await supabase
          .from("restaurants")
          .select("id, onboarding_completed")
          .eq("owner_id", session.user.id)
          .maybeSingle();
        if (restaurant?.onboarding_completed) { navigate("/dashboard"); return; }
        if (restaurant) setRestaurantId(restaurant.id);
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
  }, []);

  // ── Auth + complete ──
  const handleOAuth = async (provider: "google" | "apple") => {
    if (!businessName.trim()) { toast.error("Please enter your business name"); return; }
    setIsLoading(true);

    try {
      // Save data before redirect
      saveOnboardingData({
        businessName: businessName.trim(),
        shippingAddress: shippingAddress.trim(),
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

  // Post-auth: create restaurant + complete
  useEffect(() => {
    if (!initialCheckDone) return;
    const completeSetup = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const uid = session.user.id;
      setUserId(uid);

      const savedData = getOnboardingData();
      const bName = businessName || savedData.businessName;
      if (!bName) return;

      // Already completed?
      const { data: existing } = await supabase
        .from("restaurants")
        .select("id, onboarding_completed, google_place_id")
        .eq("owner_id", uid)
        .maybeSingle();
      if (existing?.onboarding_completed) { navigate("/dashboard"); return; }

      setIsLoading(true);
      const slug = generateSlug(bName);

      const plan = selectedPlan || "venue";
      const totalTrialDays = PLAN_DETAILS[plan].totalTrialDays;
      const trialEndsAt = new Date(Date.now() + totalTrialDays * 86400000).toISOString();

      let rId = existing?.id || restaurantId;
      if (rId) {
        await supabase.from("restaurants").update({
          restaurant_name: bName,
          custom_slug: slug,
          email: session.user.email,
          subscription_status: "trialing",
          onboarding_step: 3,
          plan_type: plan,
          has_loss_protection: hasProtection,
          trial_ends_at: trialEndsAt,
        }).eq("id", rId);
      } else {
        const { data: created } = await supabase.from("restaurants").insert({
          owner_id: uid,
          restaurant_name: bName,
          custom_slug: slug,
          email: session.user.email,
          subscription_status: "trialing",
          onboarding_step: 3,
          plan_type: plan,
          has_loss_protection: hasProtection,
          trial_ends_at: trialEndsAt,
        }).select("id").single();
        rId = created?.id;
      }
      if (!rId) { toast.error("Failed to create account"); setIsLoading(false); return; }
      setRestaurantId(rId);

      // Save Google place if selected
      if (selectedGooglePlace) {
        const reviewUrl = buildGoogleReviewUrl(selectedGooglePlace.placeId);
        const encodedAddr = encodeURIComponent(selectedGooglePlace.address || "");
        const encodedName = encodeURIComponent(selectedGooglePlace.name || bName);
        await supabase.from("restaurants").update({
          google_place_id: selectedGooglePlace.placeId,
          google_review_url: reviewUrl,
          address: selectedGooglePlace.address,
          directions_url: `https://maps.apple.com/?q=${encodedName}&address=${encodedAddr}`,
        }).eq("id", rId);
      }

      // Yelp auto
      try { await supabase.functions.invoke("auto-yelp-from-place", { body: { restaurantId: rId } }); } catch {}

      // Mark complete
      await supabase.from("restaurants").update({ onboarding_completed: true, onboarding_step: 4 }).eq("id", rId);

      // Fulfillment
      await supabase.from("fulfillment_orders").upsert({
        user_id: uid,
        restaurant_id: rId,
        plan: selectedPlan || "venue",
        shipping_name: bName,
        shipping_address_line1: shippingAddress || savedData.shippingAddress || "",
        shipping_country: "US",
        status: "ready_to_ship",
      }, { onConflict: "user_id,restaurant_id" });

      // Finalize
      try { await supabase.functions.invoke("finalize-onboarding", { body: { restaurantId: rId } }); } catch {}

      clearOnboardingData();
      setShowSuccess(true);
      setIsLoading(false);
    };

    // Only run post-auth completion if we came back from OAuth (session exists, step is info)
    if (step === "info" || step === "plan") {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_IN") {
          completeSetup();
          subscription.unsubscribe();
        }
      });
      // Also check immediately
      completeSetup();
      return () => subscription.unsubscribe();
    }
  }, [initialCheckDone, step]);

  // ── Loading ──
  if (!initialCheckDone) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // ── Success ──
  if (showSuccess) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex flex-col items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-md">
          <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-3xl font-black text-white mb-3">You're all set 🎉</h1>
          <p className="text-gray-400 mb-2">Your cards are being prepared and will ship in 1–2 business days.</p>
          <p className="text-gray-500 text-sm mb-8">We'll email you tracking info when they're on the way.</p>
          <button onClick={() => navigate("/dashboard")} className="w-full max-w-xs mx-auto h-14 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-lg transition-colors flex items-center justify-center gap-2">
            Go to Dashboard <ArrowRight className="w-5 h-5" />
          </button>
        </motion.div>
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
                      onClick={() => setSelectedPlan(plan)}
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
                      {selected && (
                        <div className="absolute top-4 right-4 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                      <div className="flex items-start gap-4 mt-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selected ? "bg-blue-500/20" : "bg-white/5"}`}>
                          <Icon className={`w-6 h-6 ${selected ? "text-blue-400" : "text-gray-400"}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-lg font-bold">{d.label}</span>
                            <span className="text-2xl font-black text-[#3B82F6]">${d.price}<span className="text-sm font-normal text-gray-500">/mo</span></span>
                          </div>
                          <p className="text-sm text-gray-400 mb-1">{d.subtitle}</p>
                          <p className="text-xs text-gray-500">Includes <span className="font-bold text-gray-400">{d.cards} Smart Cards</span>.</p>
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
            <motion.div key="info" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }} className="space-y-6">
              <div className="text-center">
                <h1 className="text-2xl font-black mb-2">Let's brand your cards</h1>
                <p className="text-gray-400 text-sm">Tell us about your business and we'll handle the rest.</p>
              </div>

              {/* Business name + 3D preview */}
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-300 text-sm">Business Name</Label>
                  <Input
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g., Joe's Pizza"
                    className="mt-1 h-12 bg-[#111827] border-white/10 text-white placeholder:text-gray-600 rounded-xl focus:border-blue-500 focus:ring-blue-500/20"
                  />
                </div>

                {/* 3D card preview */}
                {businessName.trim() && (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex justify-center relative">
                    <div className="scale-75">
                      <TapAwayCard3D />
                    </div>
                    {/* Overlay business name on card */}
                    <div className="absolute inset-0 flex items-end justify-center pointer-events-none pb-8">
                      <span className="text-[10px] font-bold text-white/80 bg-black/40 px-2 py-0.5 rounded backdrop-blur-sm truncate max-w-[140px]">
                        {businessName}
                      </span>
                    </div>
                  </motion.div>
                )}

                {/* Shipping / Address */}
                <div>
                  <Label className="text-gray-300 text-sm">Shipping Address</Label>
                  <div className="mt-1 [&_input]:!bg-[#111827] [&_input]:!border-white/10 [&_input]:!text-white [&_input]:!h-12 [&_input]:!rounded-xl [&_gmp-internal-content-container]:!bg-[#111827] [&_label]:!text-gray-300">
                    <GooglePlacesAutocomplete
                      onPlaceSelected={handleGooglePlaceSelected}
                      defaultValue={shippingAddress}
                    />
                  </div>
                </div>
              </div>

              {/* Due Today breakdown */}
              {selectedPlan && (
                <div className="bg-[#111827] border border-white/10 rounded-xl p-4 space-y-1">
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

              {/* Auth buttons */}
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
              </div>

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
