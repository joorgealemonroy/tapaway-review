import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CreditCard, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";

type CardStatus = "loading" | "not_found" | "unclaimed" | "redirecting";
type ActivationStep = "idle" | "email" | "otp" | "password" | "claiming";

const CardResolver = () => {
  const { publicCode } = useParams<{ publicCode: string }>();
  const navigate = useNavigate();
  const [cardStatus, setCardStatus] = useState<CardStatus>("loading");
  const [step, setStep] = useState<ActivationStep>("idle");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  // Resolve card on mount
  useEffect(() => {
    if (!publicCode) {
      setCardStatus("not_found");
      return;
    }

    const resolveCard = async () => {
      const { data: card, error } = await supabase
        .from("nfc_cards")
        .select("status, destination_type, destination_value")
        .eq("public_code", publicCode.toUpperCase())
        .single();

      if (error || !card) {
        setCardStatus("not_found");
        return;
      }

      if (card.status === "claimed" && card.destination_value) {
        setCardStatus("redirecting");
        if (card.destination_type === "profile") {
          window.location.href = `/${card.destination_value}`;
        } else if (card.destination_type === "external_url") {
          window.location.href = card.destination_value;
        }
        return;
      }

      if (card.status === "disabled") {
        setCardStatus("not_found");
        return;
      }

      // Card is unclaimed - check if user is already logged in
      setCardStatus("unclaimed");
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Check if they have a profile
        const { data: profile } = await supabase
          .from("personal_profiles")
          .select("username")
          .eq("user_id", user.id)
          .single();

        if (profile) {
          // Auto-claim
          setStep("claiming");
          await claimCard(publicCode);
        } else {
          // Has account but no profile - need to sign up first
          toast.info("Complete your profile setup to activate this card");
          navigate(`/personal/signup?card=${publicCode}`);
        }
      } else {
        setStep("email");
      }
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
        navigate("/personal/dashboard?tab=cards");
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
        body: { email: email.trim().toLowerCase(), code: otp, password: isNewUser ? password : undefined },
      });

      if (error) throw error;

      if (data?.success) {
        if (data.isNewUser && !password) {
          // Need password for new user
          setIsNewUser(true);
          setStep("password");
          setVerifying(false);
          return;
        }

        // Sign in
        const signInPassword = data.tempPassword || password;
        if (signInPassword) {
          await supabase.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password: signInPassword,
          });
        } else if (data.existingAccount) {
          // Existing user without password flow - redirect to auth
          toast.info("Please sign in to activate your card");
          navigate(`/auth?redirect=/c/${publicCode}`);
          return;
        }

        // Check if user has a profile
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
    // Re-send OTP and verify with password
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

        // New user needs profile - redirect to signup with card param
        navigate(`/personal/signup?card=${publicCode}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setVerifying(false);
    }
  };

  // Loading state
  if (cardStatus === "loading" || cardStatus === "redirecting") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not found
  if (cardStatus === "not_found") {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <AlertCircle className="h-16 w-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">Invalid Card</h1>
        <p className="text-muted-foreground text-center max-w-sm">
          This card doesn't exist or has been disabled. Please check the URL and try again.
        </p>
        <Button variant="outline" className="mt-6" onClick={() => navigate("/")}>
          Go Home
        </Button>
      </div>
    );
  }

  // Activation UI
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center">
          <a href="/" className="font-black text-2xl tracking-tight text-foreground">
            TapAway
          </a>
        </div>

        {/* Card Icon */}
        <div className="flex justify-center">
          <div className="h-24 w-24 rounded-2xl bg-primary/10 flex items-center justify-center">
            <CreditCard className="h-12 w-12 text-primary" />
          </div>
        </div>

        {/* Heading */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            Activate Your TapAway Card
          </h1>
          <p className="text-sm text-muted-foreground">
            Link this card to your profile in seconds
          </p>
        </div>

        {/* Step: Email Input */}
        {step === "email" && (
          <div className="space-y-4">
            <Input
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
              className="h-12 text-base"
              autoFocus
            />
            <Button
              onClick={handleSendOtp}
              disabled={!email.trim() || sending}
              className="w-full h-12 text-base font-semibold"
            >
              {sending ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
              Send Code
            </Button>
          </div>
        )}

        {/* Step: OTP Input */}
        {step === "otp" && (
          <div className="space-y-4">
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
              className="w-full h-12 text-base font-semibold"
            >
              {verifying ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
              Verify & Activate
            </Button>
            <button
              onClick={() => { setStep("email"); setOtp(""); }}
              className="w-full text-sm text-muted-foreground hover:text-foreground text-center"
            >
              Use a different email
            </button>
          </div>
        )}

        {/* Step: Password (new users) */}
        {step === "password" && (
          <div className="space-y-4">
            <p className="text-sm text-center text-muted-foreground">
              Create a password for your new account
            </p>
            <Input
              type="password"
              placeholder="Choose a password (8+ characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()}
              className="h-12 text-base"
              autoFocus
            />
            <Button
              onClick={handlePasswordSubmit}
              disabled={password.length < 8 || verifying}
              className="w-full h-12 text-base font-semibold"
            >
              {verifying ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
              Create Account & Activate
            </Button>
          </div>
        )}

        {/* Step: Claiming */}
        {step === "claiming" && (
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Activating your card...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CardResolver;
