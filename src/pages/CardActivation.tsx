import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, CreditCard, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ClaimCodeInput from "@/components/card/ClaimCodeInput";
import { ConfettiEffect } from "@/components/personal/ConfettiEffect";
import { CheckCircle, XCircle } from "lucide-react";

interface CardActivationProps {
  card: {
    id: string;
    public_code: string;
    status: string;
  };
}

type Step = "claim" | "auth" | "username" | "done";

const CardActivation = ({ card }: CardActivationProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("claim");
  const [loading, setLoading] = useState(false);

  // Claim step
  const [claimCode, setClaimCode] = useState("");
  const [claimError, setClaimError] = useState(false);
  const [claimVerified, setClaimVerified] = useState(false);

  // Auth step
  const [email, setEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Username step
  const [username, setUsername] = useState("");
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [existingProfile, setExistingProfile] = useState<any>(null);
  const [useExisting, setUseExisting] = useState(false);

  // Done
  const [finalUsername, setFinalUsername] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);

  // Check if already logged in
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        setEmail(session.user.email || "");
      }
    };
    checkAuth();
  }, []);

  // ─── Step 1: Verify Claim Code ───
  const handleVerifyClaim = async () => {
    if (claimCode.length !== 6) return;
    setLoading(true);
    setClaimError(false);

    try {
      // We'll verify via the edge function to keep hash logic server-side
      const { data, error } = await supabase.functions.invoke("claim-nfc-card", {
        body: { publicCode: card.public_code, claimCode, action: "verify" },
      });

      if (error || !data?.valid) {
        setClaimError(true);
        setLoading(false);
        return;
      }

      setClaimVerified(true);
      // If already logged in, skip to username
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        setEmail(session.user.email || "");
        // Check if they already have a profile
        const { data: profile } = await supabase
          .from("personal_profiles")
          .select("id, username, full_name")
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (profile) {
          setExistingProfile(profile);
        }
        setStep("username");
      } else {
        setStep("auth");
      }
    } catch {
      setClaimError(true);
    } finally {
      setLoading(false);
    }
  };

  // ─── Step 2: Auth ───
  const handleSendOtp = async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("send-custom-otp", {
        body: { email: email.trim().toLowerCase() },
      });
      if (error) throw error;
      setOtpSent(true);
      toast({ title: "Code sent!", description: "Check your email for the verification code." });
    } catch {
      toast({ title: "Error", description: "Failed to send code. Try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-custom-otp", {
        body: { email: email.trim().toLowerCase(), code: otp, password: password || undefined },
      });
      if (error || !data?.success) {
        toast({ title: "Invalid code", description: "Please check and try again.", variant: "destructive" });
        setLoading(false);
        return;
      }

      setIsNewUser(data.isNewUser);
      setUserId(data.userId);

      // Sign in
      const signInPassword = data.tempPassword || password;
      if (signInPassword) {
        await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password: signInPassword,
        });
      }

      // Check existing profile
      const { data: profile } = await supabase
        .from("personal_profiles")
        .select("id, username, full_name")
        .eq("user_id", data.userId)
        .maybeSingle();

      if (profile) {
        setExistingProfile(profile);
      }

      setStep("username");
    } catch {
      toast({ title: "Error", description: "Verification failed.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // ─── Step 3: Username ───
  useEffect(() => {
    if (step !== "username" || !username || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingUsername(true);
      const { data } = await supabase.rpc("is_username_available", {
        check_username: username.toLowerCase(),
      });
      setUsernameAvailable(data === true);
      setCheckingUsername(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [username, step]);

  const handleClaimCard = async () => {
    setLoading(true);
    try {
      const chosenUsername = useExisting && existingProfile
        ? existingProfile.username
        : username.toLowerCase();

      const { data, error } = await supabase.functions.invoke("claim-nfc-card", {
        body: {
          publicCode: card.public_code,
          claimCode,
          action: "claim",
          username: chosenUsername,
        },
      });

      if (error || !data?.success) {
        toast({
          title: "Failed to activate",
          description: data?.error || "Something went wrong. Please try again.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      setFinalUsername(data.username);
      setShowConfetti(true);
      setStep("done");
    } catch {
      toast({ title: "Error", description: "Failed to activate card.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ───
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {showConfetti && <ConfettiEffect />}
      <div className="w-full max-w-md">

        {/* Step 1: Claim Code */}
        {step === "claim" && (
          <div className="bg-card rounded-2xl border p-6 shadow-sm space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <CreditCard className="w-7 h-7 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Activate your TapAway card</h1>
              <p className="text-muted-foreground text-sm">
                Enter the 6-character claim code from your card packaging.
              </p>
            </div>

            <ClaimCodeInput
              value={claimCode}
              onChange={(v) => { setClaimCode(v.toUpperCase()); setClaimError(false); }}
              disabled={loading}
              error={claimError}
            />

            <Button
              onClick={handleVerifyClaim}
              disabled={claimCode.length !== 6 || loading}
              className="w-full"
              size="lg"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Verify Code
            </Button>
          </div>
        )}

        {/* Step 2: Auth */}
        {step === "auth" && (
          <div className="bg-card rounded-2xl border p-6 shadow-sm space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                {otpSent ? "Verify your email" : "Create your account"}
              </h1>
              <p className="text-muted-foreground text-sm">
                {otpSent
                  ? `We sent a code to ${email}`
                  : "Enter your email to get started."}
              </p>
            </div>

            {!otpSent ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <Button onClick={handleSendOtp} disabled={!email.trim() || loading} className="w-full" size="lg">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Send Verification Code
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="otp">Verification Code</Label>
                  <Input
                    id="otp"
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6}
                    disabled={loading}
                  />
                </div>
                <div>
                  <Label htmlFor="password">Create a Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Min 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                  {password.length > 0 && (
                    <p className={`text-xs mt-1 ${password.length >= 8 ? "text-green-600" : "text-muted-foreground"}`}>
                      {password.length >= 8 ? "✓" : "○"} At least 8 characters
                    </p>
                  )}
                </div>
                <Button
                  onClick={handleVerifyOtp}
                  disabled={otp.length !== 6 || password.length < 8 || loading}
                  className="w-full"
                  size="lg"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Verify & Continue
                </Button>
                <button
                  onClick={() => { setOtpSent(false); setOtp(""); }}
                  className="text-sm text-muted-foreground underline w-full text-center"
                >
                  Use a different email
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Username */}
        {step === "username" && (
          <div className="bg-card rounded-2xl border p-6 shadow-sm space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold text-foreground">Choose your username</h1>
              <p className="text-muted-foreground text-sm">
                This will be your public profile link.
              </p>
            </div>

            {existingProfile && (
              <div className="bg-muted rounded-xl p-4 space-y-3">
                <p className="text-sm font-medium text-foreground">
                  You already have a profile: <span className="text-primary">@{existingProfile.username}</span>
                </p>
                <div className="flex gap-2">
                  <Button
                    variant={useExisting ? "default" : "outline"}
                    size="sm"
                    onClick={() => setUseExisting(true)}
                  >
                    Link to @{existingProfile.username}
                  </Button>
                  <Button
                    variant={!useExisting ? "default" : "outline"}
                    size="sm"
                    onClick={() => setUseExisting(false)}
                  >
                    New username
                  </Button>
                </div>
              </div>
            )}

            {(!existingProfile || !useExisting) && (
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    tapaway.co/
                  </span>
                  <Input
                    id="username"
                    className="pl-[90px]"
                    placeholder="yourname"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ""))}
                    disabled={loading}
                    maxLength={30}
                  />
                </div>
                {checkingUsername && (
                  <p className="text-xs text-muted-foreground">Checking availability...</p>
                )}
                {usernameAvailable === true && username.length >= 3 && (
                  <p className="text-xs text-primary flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> @{username} is available!
                  </p>
                )}
                {usernameAvailable === false && (
                  <p className="text-xs text-destructive">@{username} is taken. Try another.</p>
                )}
              </div>
            )}

            <Button
              onClick={handleClaimCard}
              disabled={
                loading ||
                (useExisting && existingProfile ? false : (!usernameAvailable || username.length < 3))
              }
              className="w-full"
              size="lg"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Activate Card
            </Button>
          </div>
        )}

        {/* Step 4: Done */}
        {step === "done" && (
          <div className="bg-card rounded-2xl border p-6 shadow-sm space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Your card is live! 🎉</h1>
            <div className="bg-muted rounded-xl p-4">
              <p className="text-sm text-muted-foreground mb-1">Your profile link</p>
              <p className="text-lg font-bold text-primary">tapaway.co/{finalUsername}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Tap your card to try it out — it will redirect to your profile instantly.
            </p>
            <div className="space-y-2">
              <Button onClick={() => navigate("/personal/dashboard")} className="w-full" size="lg">
                Go to Dashboard
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(`/${finalUsername}`)}
                className="w-full"
                size="lg"
              >
                View My Profile
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CardActivation;
