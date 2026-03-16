import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Check, X, Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { SignupData } from "@/pages/personal/PersonalSignup";
import { z } from "zod";

interface VibeMetadata {
  name: string;
  glowColor: string;
  accentColor: string;
}

interface Props {
  formData: SignupData;
  updateFormData: (updates: Partial<SignupData>) => void;
  onNext: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  selectedPlan?: "free" | "monthly" | "yearly" | "vip" | "founding_pro";
  isOAuthUser: boolean;
  setIsOAuthUser: (v: boolean) => void;
  vibeMetadata?: VibeMetadata | null;
}

const PLACEHOLDERS = ["paul", "sophia", "justin", "chloe", "blake", "maya", "jake", "isabella"];

export const ClaimStep = ({
  formData,
  updateFormData,
  onNext,
  isLoading,
  setIsLoading,
  selectedPlan = "free",
  isOAuthUser,
  setIsOAuthUser,
  vibeMetadata,
}: Props) => {
  const navigate = useNavigate();
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [oauthLoading, setOauthLoading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [showPulse, setShowPulse] = useState(false);

  const prefix = selectedPlan === "free" ? "tap" : "";
  const accentColor = vibeMetadata?.accentColor || "#22c55e";
  const glowColor = vibeMetadata?.glowColor || "transparent";

  // Cycling placeholder — 1.5s interval
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIdx((prev) => (prev + 1) % PLACEHOLDERS.length);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  // Check for existing OAuth session on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const providerIsOAuth = user.app_metadata?.provider === "google" || user.app_metadata?.provider === "apple";
        if (providerIsOAuth) {
          setIsOAuthUser(true);
          const meta = user.user_metadata || {};
          const updates: Partial<SignupData> = { email: user.email || "" };
          if (meta.full_name || meta.name) {
            updates.fullName = meta.full_name || meta.name;
          }
          updateFormData(updates);
        }
      }
    });
  }, []);

  // Debounced username availability check
  useEffect(() => {
    if (!formData.username || formData.username.length < 3) {
      setUsernameStatus("idle");
      return;
    }

    const timer = setTimeout(async () => {
      setUsernameStatus("checking");
      try {
        const usernameToCheck = `${prefix}${formData.username.toLowerCase()}`;
        const { data, error } = await supabase.rpc("is_username_available", {
          check_username: usernameToCheck,
        });
        if (error) throw error;
        if (data) {
          setUsernameStatus("available");
          setShowPulse(true);
          setTimeout(() => setShowPulse(false), 600);
        } else {
          setUsernameStatus("taken");
        }
      } catch {
        setUsernameStatus("idle");
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [formData.username, prefix]);

  const handleOAuth = async (provider: "google" | "apple") => {
    if (!formData.username || formData.username.length < 3 || usernameStatus !== "available") {
      toast.error("Pick an available username first");
      return;
    }
    setOauthLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: `${window.location.origin}/personal/signup?vibe=true&step=1`,
      });
      if (error) {
        toast.error("Sign-in failed. Please try again.");
      }
    } catch {
      toast.error("Sign-in failed. Please try again.");
    } finally {
      setOauthLoading(false);
    }
  };

  const handleEmailSubmit = () => {
    const schema = z.object({
      fullName: z.string().min(2, "Name must be at least 2 characters"),
      email: z.string().email("Enter a valid email"),
      password: z.string().min(8, "At least 8 characters"),
    });

    const result = schema.safeParse({
      fullName: formData.fullName,
      email: formData.email,
      password: formData.password,
    });

    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.errors.forEach((e) => {
        if (e.path[0]) newErrors[e.path[0] as string] = e.message;
      });
      setErrors(newErrors);
      setTouched({ fullName: true, email: true, password: true });
      return;
    }

    if (usernameStatus !== "available") {
      toast.error("Pick an available username first");
      return;
    }

    onNext();
  };

  const handleOAuthContinue = () => {
    if (usernameStatus !== "available") {
      toast.error("Pick an available username first");
      return;
    }
    onNext();
  };

  const handleChangeVibe = () => {
    sessionStorage.removeItem("tapaway_selected_vibe");
    navigate("/personal/vibe");
  };

  const usernameReady = formData.username.length >= 3 && usernameStatus === "available";
  const emailFormValid = usernameReady && formData.fullName.length >= 2 && formData.email.includes("@") && (formData.password?.length || 0) >= 8;

  return (
    <div className="relative pt-2">
      {/* Vibe glow background */}
      {vibeMetadata && (
        <div
          className="fixed inset-0 pointer-events-none z-0"
          style={{
            background: `radial-gradient(ellipse 60% 50% at 50% 40%, ${vibeMetadata.glowColor}26 0%, transparent 70%)`,
          }}
        />
      )}

      <div className="relative z-10 max-w-[400px] mx-auto space-y-4">
        {/* Vibe indicator row — compact inline */}
        {vibeMetadata && (
          <div className="flex items-center justify-between text-xs opacity-60">
            <button
              onClick={handleChangeVibe}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              Change Vibe
            </button>
            <span className="text-muted-foreground tracking-wide uppercase">
              Style: {vibeMetadata.name}
            </span>
          </div>
        )}

        {/* Title */}
        <h2 className="text-xl font-bold text-foreground">Create your TapAway</h2>

        {/* Username — front and center */}
        <div className="space-y-3">
          <Label htmlFor="username" className="text-base font-semibold text-foreground">
            Claim your link
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              tapaway.co/{prefix}
            </span>
            <Input
              id="username"
              type="text"
              placeholder={PLACEHOLDERS[placeholderIdx]}
              value={formData.username}
              onChange={(e) =>
                updateFormData({ username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })
              }
              className={`h-14 text-lg font-medium ${prefix ? "pl-[8.5rem]" : "pl-[7.25rem]"} transition-shadow duration-300`}
              style={{
                boxShadow: showPulse
                  ? `0 0 0 2px ${accentColor}`
                  : `0 0 20px ${glowColor}33`,
              }}
              autoFocus
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {usernameStatus === "checking" && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
              {usernameStatus === "available" && <Check className="h-5 w-5" style={{ color: accentColor }} />}
              {usernameStatus === "taken" && <X className="h-5 w-5 text-destructive" />}
            </div>
          </div>

          {/* Micro-win celebratory message */}
          <AnimatePresence>
            {usernameStatus === "available" && formData.username.length >= 3 && (
              <motion.p
                initial={{ opacity: 0, scale: 0.9, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="text-sm font-medium"
                style={{ color: "#22c55e" }}
              >
                ✓ tapaway.co/{prefix}{formData.username} is available!
              </motion.p>
            )}
          </AnimatePresence>

          {usernameStatus === "taken" && (
            <p className="text-sm text-destructive">That one's taken — try another!</p>
          )}
        </div>

        {/* Auth section — only show once username is ready */}
        <AnimatePresence>
          {usernameReady && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="space-y-4"
            >
              {isOAuthUser ? (
                <>
                  <div className="flex items-center gap-2 rounded-lg bg-muted/50 border border-border px-4 py-3 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    Signed in — tap continue to finish
                  </div>
                  <Button onClick={handleOAuthContinue} className="w-full h-14 text-base font-semibold">
                    Continue
                  </Button>
                </>
              ) : (
                <>
                  {/* OAuth buttons */}
                  <div className="space-y-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-14 text-base font-medium gap-3"
                      onClick={() => handleOAuth("google")}
                      disabled={oauthLoading}
                    >
                      {oauthLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                      )}
                      Save My Hub with Google
                    </Button>
                    <Button
                      type="button"
                      className="w-full h-14 text-base font-medium gap-3 bg-black text-white hover:bg-black/90"
                      onClick={() => handleOAuth("apple")}
                      disabled={oauthLoading}
                    >
                      {oauthLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                        </svg>
                      )}
                      Save My Hub with Apple
                    </Button>
                  </div>

                  {/* Divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">or use email</span>
                    </div>
                  </div>

                  {/* Email expand toggle */}
                  {!showEmailForm ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full text-sm text-muted-foreground"
                      onClick={() => setShowEmailForm(true)}
                    >
                      Continue with Email
                    </Button>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="space-y-4 overflow-hidden"
                    >
                      {/* Name */}
                      <div className="space-y-1.5">
                        <Label htmlFor="claim-name" className="text-sm font-medium text-foreground">Name</Label>
                        <Input
                          id="claim-name"
                          placeholder="John Smith"
                          value={formData.fullName}
                          onChange={(e) => updateFormData({ fullName: e.target.value })}
                          onBlur={() => setTouched((p) => ({ ...p, fullName: true }))}
                          className="h-12 text-base"
                        />
                        {touched.fullName && errors.fullName && (
                          <p className="text-xs text-destructive">{errors.fullName}</p>
                        )}
                      </div>

                      {/* Email */}
                      <div className="space-y-1.5">
                        <Label htmlFor="claim-email" className="text-sm font-medium text-foreground">Email</Label>
                        <Input
                          id="claim-email"
                          type="email"
                          placeholder="john@example.com"
                          value={formData.email}
                          onChange={(e) => updateFormData({ email: e.target.value })}
                          onBlur={() => setTouched((p) => ({ ...p, email: true }))}
                          className="h-12 text-base"
                        />
                        {touched.email && errors.email && (
                          <p className="text-xs text-destructive">{errors.email}</p>
                        )}
                      </div>

                      {/* Password */}
                      <div className="space-y-1.5">
                        <Label htmlFor="claim-password" className="text-sm font-medium text-foreground">Password</Label>
                        <div className="relative">
                          <Input
                            id="claim-password"
                            type={showPassword ? "text" : "password"}
                            placeholder="At least 8 characters"
                            value={formData.password || ""}
                            onChange={(e) => updateFormData({ password: e.target.value })}
                            onBlur={() => setTouched((p) => ({ ...p, password: true }))}
                            className="h-12 text-base pr-12"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {touched.password && errors.password && (
                          <p className="text-xs text-destructive">{errors.password}</p>
                        )}
                      </div>

                      <Button
                        onClick={handleEmailSubmit}
                        disabled={isLoading || !emailFormValid}
                        className="w-full h-14 text-base font-semibold"
                      >
                        Continue
                      </Button>
                    </motion.div>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
