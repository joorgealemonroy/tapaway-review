import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Loader2, AlertCircle, Mail, ShieldCheck, CheckCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { CardOnboarding } from "@/components/card/CardOnboarding";

type CardStatus = "loading" | "not_found" | "unclaimed" | "redirecting";
type ActivationStep = "idle" | "email" | "otp" | "password" | "claiming";

const STEPS = [
  { key: "email", label: "Email", icon: Mail },
  { key: "otp", label: "Verify", icon: ShieldCheck },
  { key: "done", label: "Done", icon: CheckCircle },
];

const stepIndex = (step: ActivationStep) => {
  if (step === "email") return 0;
  if (step === "otp") return 1;
  if (step === "password") return 1;
  if (step === "claiming") return 2;
  return 0;
};

const CardResolver = () => {
  const { publicCode } = useParams<{ publicCode: string }>();
  const navigate = useNavigate();
  const [cardStatus, setCardStatus] = useState<CardStatus>("loading");
  const [showOverview, setShowOverview] = useState(true);
  const [step, setStep] = useState<ActivationStep>("idle");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "apple" | null>(null);

  const handleOAuthSignIn = async (provider: "google" | "apple") => {
    setOauthLoading(provider);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: `${window.location.origin}/c/${publicCode}`,
      });
      if (result.error) {
        toast.error("Sign-in failed");
        setOauthLoading(null);
      }
    } catch {
      toast.error("Sign-in failed");
      setOauthLoading(null);
    }
  };

  useEffect(() => {
    if (!publicCode) {
      setCardStatus("not_found");
      return;
    }

    const resolveCard = async () => {
      const { data: card, error } = await supabase
        .from("nfc_cards")
        .select("status, destination_type, destination_value, card_type")
        .eq("public_code", publicCode.toUpperCase())
        .single();

      if (error || !card) {
        setCardStatus("not_found");
        return;
      }

      if (card.status === "claimed" && card.destination_value) {
        setCardStatus("redirecting");
        if (card.destination_type === "profile") {
          navigate(`/${card.destination_value}`, { replace: true, state: { type: 'personal' } });
        } else if (card.destination_type === "external_url") {
          window.location.href = card.destination_value;
        }
        return;
      }

      if (card.status === "disabled") {
        setCardStatus("not_found");
        return;
      }

      setCardStatus("unclaimed");
      
      // Set VIP flag in sessionStorage if applicable
      if (card.card_type === "vip") {
        sessionStorage.setItem("tapaway_card_vip", "true");
      } else {
        sessionStorage.removeItem("tapaway_card_vip");
      }
      
      // Defer auth check — only needed for unclaimed cards
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) {
          setShowOverview(true);
          return;
        }
        supabase
          .from("personal_profiles")
          .select("username")
          .eq("user_id", user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile) {
              setStep("claiming");
              claimCard(publicCode);
            } else {
              toast.info("Complete your profile setup to activate this card");
              sessionStorage.setItem("tapaway_card_email", user.email || "");
              navigate(`/personal/signup?card=${publicCode}`);
            }
          });
      });
    };

    resolveCard();
  }, [publicCode]);

  const claimCard = useCallback(async (code: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("claim-card", {
        body: { public_code: code },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success("Card activated! 🎉");
        navigate("/personal/dashboard?tab=cards&welcome=true");
      } else {
        throw new Error(data?.error || "Failed to activate card");
      }
    } catch (err: any) {
      console.error("Error claiming card:", err);
      toast.error(err.message || "Failed to activate card");
      setStep("email");
    }
  }, [navigate]);

  const handleSendOtp = async () => {
    if (!email.trim()) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-custom-otp", {
        body: { email: email.trim().toLowerCase() },
      });
      if (error) throw error;
      toast.success("Verification code sent!");
      setStep("otp");
    } catch (err: any) {
      toast.error(err.message || "Failed to send code");
    } finally {
      setSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return;
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-custom-otp", {
        body: { email: email.trim().toLowerCase(), code: otp },
      });

      if (error) throw error;

      if (data?.success) {
        if (data.needsPassword) {
          setStep("password");
          setVerifying(false);
          return;
        }

        if (data.existingAccount) {
          toast.info("Please sign in to activate your card");
          navigate(`/auth?redirect=/c/${publicCode}`);
          return;
        }

        if (data.tempPassword) {
          await supabase.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password: data.tempPassword,
          });
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("personal_profiles")
            .select("username")
            .eq("user_id", user.id)
            .single();

          if (profile) {
            setStep("claiming");
            await claimCard(publicCode!);
          } else {
            sessionStorage.setItem("tapaway_card_email", email.trim().toLowerCase());
            navigate(`/personal/signup?card=${publicCode}`);
          }
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Invalid code");
    } finally {
      setVerifying(false);
    }
  };

  const handlePasswordSubmit = async () => {
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-custom-otp", {
        body: { email: email.trim().toLowerCase(), code: otp, password },
      });

      if (error) throw error;

      if (data?.success && data.tempPassword) {
        await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password: data.tempPassword,
        });

        sessionStorage.setItem("tapaway_card_email", email.trim().toLowerCase());
        sessionStorage.setItem("tapaway_card_password", password);
        sessionStorage.setItem("tapaway_card_preauthed", "true");
        navigate(`/personal/signup?card=${publicCode}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setVerifying(false);
    }
  };

  // Loading / redirecting — dark to match profile theme
  if (cardStatus === "loading" || cardStatus === "redirecting") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white/60" />
      </div>
    );
  }

  // Not found
  if (cardStatus === "not_found") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <AlertCircle className="h-16 w-16 text-muted-foreground/40 mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">Invalid Card</h1>
        <p className="text-muted-foreground text-center max-w-sm">
          This card doesn't exist or has been disabled.
        </p>
        <Button variant="outline" className="mt-6" onClick={() => navigate("/")}>
          Go Home
        </Button>
      </div>
    );
  }

  // Show onboarding overview for unclaimed cards before activation
  if (cardStatus === "unclaimed" && showOverview && step === "idle") {
    return (
      <CardOnboarding
        onActivate={() => {
          setShowOverview(false);
          setStep("email");
        }}
      />
    );
  }

  // Activation UI
  const current = stepIndex(step);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}

        {/* Card Image with float animation */}
        <motion.div
          className="flex justify-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <motion.div
            className="w-64 aspect-[1.586/1] rounded-2xl shadow-2xl shadow-teal-500/20 dark:shadow-teal-400/10 flex items-center justify-center"
            animate={{
              backgroundColor: ["#10B981", "#EC4899", "#EF4444", "#9CA3AF", "#EAB308"],
              y: [0, -6, 0],
            }}
            transition={{
              backgroundColor: { duration: 12, repeat: Infinity, ease: "linear" },
              y: { duration: 3, repeat: Infinity, ease: "easeInOut" },
            }}
          >
            <span
              style={{
                fontFamily: "'League Spartan', sans-serif",
                textShadow: "0 2px 8px rgba(0,0,0,0.25)",
              }}
              className="text-white text-2xl font-bold tracking-tight select-none"
            >
              tapaway.co
            </span>
          </motion.div>
        </motion.div>

        {/* Heading */}
        <motion.div
          className="text-center space-y-1"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Activate Your Card
          </h1>
          <p className="text-sm text-muted-foreground">Around 3 minutes to set up</p>
        </motion.div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-3">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const active = i <= current;
            return (
              <div key={s.key} className="flex items-center gap-2">
                {i > 0 && (
                  <div className={`w-8 h-px ${i <= current ? "bg-teal-500" : "bg-border"} transition-colors`} />
                )}
                <div className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${active ? "text-teal-600 dark:text-teal-400" : "text-muted-foreground/40"}`}>
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          {step === "email" && (
            <motion.div
              key="email"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              {/* OAuth Buttons */}
              <Button
                variant="outline"
                onClick={() => handleOAuthSignIn("google")}
                disabled={!!oauthLoading}
                className="w-full h-12 text-base font-medium rounded-xl border-border"
              >
                {oauthLoading === "google" ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                )}
                Continue with Google
              </Button>
              <Button
                variant="outline"
                onClick={() => handleOAuthSignIn("apple")}
                disabled={!!oauthLoading}
                className="w-full h-12 text-base font-medium rounded-xl border-border"
              >
                {oauthLoading === "apple" ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                )}
                Continue with Apple
              </Button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <Input
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                className="h-12 text-base rounded-xl border-border focus:border-teal-500 focus:ring-teal-500"
                autoFocus
              />
              <Button
                onClick={handleSendOtp}
                disabled={!email.trim() || sending}
                className="w-full h-12 text-base font-semibold rounded-xl bg-teal-600 hover:bg-teal-700 text-white"
              >
                {sending ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                Send Code
              </Button>
              <button
                onClick={() => { setShowOverview(true); setStep("idle"); }}
                className="w-full text-sm text-muted-foreground hover:text-foreground text-center"
              >
                ← Back to examples
              </button>
            </motion.div>
          )}

          {step === "otp" && (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              <p className="text-sm text-center text-muted-foreground">
                Enter the 6-digit code sent to <strong>{email}</strong>
              </p>
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button
                onClick={handleVerifyOtp}
                disabled={otp.length !== 6 || verifying}
                className="w-full h-12 text-base font-semibold rounded-xl bg-teal-600 hover:bg-teal-700 text-white"
              >
                {verifying ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                Verify
              </Button>
              <button
                onClick={() => { setStep("email"); setOtp(""); }}
                className="w-full text-sm text-muted-foreground hover:text-foreground text-center"
              >
                Wrong email? Change it
              </button>
            </motion.div>
          )}

          {step === "password" && (
            <motion.div
              key="password"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              <p className="text-sm text-center text-muted-foreground">
                Create a password for your new account
              </p>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Choose a password (8+ characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()}
                  className="h-12 text-base rounded-xl border-border focus:border-teal-500 focus:ring-teal-500 pr-12"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button
                onClick={handlePasswordSubmit}
                disabled={password.length < 8 || verifying}
                className="w-full h-12 text-base font-semibold rounded-xl bg-teal-600 hover:bg-teal-700 text-white"
              >
                {verifying ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                Create Account & Activate
              </Button>
              <button
                onClick={() => { setStep("email"); setOtp(""); setPassword(""); setShowPassword(false); }}
                className="w-full text-sm text-muted-foreground hover:text-foreground text-center"
              >
                Start over
              </button>
            </motion.div>
          )}

          {step === "claiming" && (
            <motion.div
              key="claiming"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="text-center space-y-4"
            >
              <Loader2 className="h-8 w-8 animate-spin text-teal-600 dark:text-teal-400 mx-auto" />
              <p className="text-sm text-muted-foreground">Activating your card...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CardResolver;
