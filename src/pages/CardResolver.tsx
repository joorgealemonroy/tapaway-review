import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col items-center justify-center px-6">
        <AlertCircle className="h-16 w-16 text-gray-300 mb-4" />
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
    <div className="min-h-screen bg-gradient-to-b from-teal-50 via-white to-white flex flex-col items-center justify-center px-6 py-12">
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
            className="w-64 aspect-[1.586/1] rounded-2xl shadow-2xl shadow-teal-200/50 flex items-center justify-center"
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
                  <div className={`w-8 h-px ${i <= current ? "bg-teal-500" : "bg-gray-200"} transition-colors`} />
                )}
                <div className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${active ? "text-teal-600" : "text-gray-300"}`}>
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
              <Input
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                className="h-12 text-base rounded-xl border-gray-200 focus:border-teal-400 focus:ring-teal-400"
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
                  className="h-12 text-base rounded-xl border-gray-200 focus:border-teal-400 focus:ring-teal-400 pr-12"
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
              <Loader2 className="h-8 w-8 animate-spin text-teal-600 mx-auto" />
              <p className="text-sm text-muted-foreground">Activating your card...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CardResolver;
