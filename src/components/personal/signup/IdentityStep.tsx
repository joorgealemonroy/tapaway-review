import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Check, X, Loader2, Eye, EyeOff, Info, LogIn, Lock } from "lucide-react";
import { toast } from "sonner";
import { SignupData } from "@/pages/personal/PersonalSignup";
import { z } from "zod";

const identitySchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Please enter a valid email").max(255),
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be 30 characters or less")
    .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, and underscores allowed"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be 72 characters or less"),
});

interface Props {
  formData: SignupData;
  updateFormData: (updates: Partial<SignupData>) => void;
  onNext: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  selectedPlan?: "free" | "monthly" | "yearly" | "vip";
  isOAuthUser: boolean;
  setIsOAuthUser: (v: boolean) => void;
}

export const IdentityStep = ({ formData, updateFormData, onNext, isLoading, setIsLoading, selectedPlan = "free", isOAuthUser, setIsOAuthUser }: Props) => {
  const navigate = useNavigate();
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [emailReadOnly, setEmailReadOnly] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  // Pre-fill from sessionStorage (card activation flow) or auth session
  useEffect(() => {
    const cardEmail = sessionStorage.getItem("tapaway_card_email");
    const cardPassword = sessionStorage.getItem("tapaway_card_password");
    const updates: Partial<SignupData> = {};

    if (cardEmail) {
      updates.email = cardEmail;
      setEmailReadOnly(true);
      sessionStorage.removeItem("tapaway_card_email");
    }
    if (cardPassword) {
      updates.password = cardPassword;
      sessionStorage.removeItem("tapaway_card_password");
    }

    if (Object.keys(updates).length > 0) {
      updateFormData(updates);
    }

    // Check if user is already authenticated (OAuth return or existing session)
    if (!cardEmail) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          const meta = user.user_metadata || {};
          const providerIsOAuth = user.app_metadata?.provider === "google" || user.app_metadata?.provider === "apple";
          if (providerIsOAuth) {
            setIsOAuthUser(true);
            setEmailReadOnly(true);
            const oauthUpdates: Partial<SignupData> = { email: user.email || "" };
            if (meta.full_name && !formData.fullName) {
              oauthUpdates.fullName = meta.full_name;
            }
            if (meta.name && !formData.fullName) {
              oauthUpdates.fullName = meta.name;
            }
            updateFormData(oauthUpdates);
          } else if (user.email && !formData.email) {
            updateFormData({ email: user.email });
            setEmailReadOnly(true);
          }
        }
      });
    }
  }, []);

  // Debounced username check
  useEffect(() => {
    if (!formData.username || formData.username.length < 3) {
      setUsernameStatus("idle");
      return;
    }

    const timer = setTimeout(async () => {
      setUsernameStatus("checking");
      try {
        const usernameToCheck = selectedPlan === "free" 
          ? `tap${formData.username.toLowerCase()}`
          : formData.username.toLowerCase();
        
        const { data, error } = await supabase.rpc("is_username_available", {
          check_username: usernameToCheck,
        });
        
        if (error) throw error;
        setUsernameStatus(data ? "available" : "taken");
      } catch (err) {
        console.error("Error checking username:", err);
        setUsernameStatus("idle");
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.username, selectedPlan]);

  const validateField = (field: keyof typeof identitySchema.shape, value: string) => {
    try {
      identitySchema.shape[field].parse(value);
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        setErrors(prev => ({ ...prev, [field]: err.errors[0].message }));
      }
      return false;
    }
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const value = field === 'password' ? formData.password : formData[field as keyof SignupData] as string;
    validateField(field as keyof typeof identitySchema.shape, value || '');
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    setOauthLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: `${window.location.origin}/personal/signup?step=1`,
      });
      if (error) {
        toast.error("Sign-in failed. Please try again.");
        console.error("OAuth error:", error);
      }
    } catch (err) {
      toast.error("Sign-in failed. Please try again.");
      console.error("OAuth error:", err);
    } finally {
      setOauthLoading(false);
    }
  };

  const handleSubmit = () => {
    const fieldsToValidate: any = {
      fullName: formData.fullName,
      email: formData.email,
      username: formData.username,
    };
    if (!isOAuthUser) {
      fieldsToValidate.password = formData.password;
    }

    // Validate only required fields
    const schema = isOAuthUser
      ? identitySchema.omit({ password: true })
      : identitySchema;

    const result = schema.safeParse(fieldsToValidate);

    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          newErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(newErrors);
      setTouched({ fullName: true, email: true, username: true, ...(!isOAuthUser ? { password: true } : {}) });
      return;
    }

    if (usernameStatus !== "available") {
      setErrors(prev => ({ ...prev, username: "This username is not available" }));
      return;
    }

    onNext();
  };

  const isFormValid = 
    formData.fullName.length >= 2 &&
    formData.email.includes('@') &&
    formData.username.length >= 3 &&
    usernameStatus === "available" &&
    (isOAuthUser || (formData.password?.length || 0) >= 8);

  return (
    <div className="space-y-6">
      {/* OAuth Buttons */}
      {!isOAuthUser && (
        <>
          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 text-base font-medium gap-3"
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
              Continue with Google
            </Button>
            <Button
              type="button"
              className="w-full h-12 text-base font-medium gap-3 bg-black text-white hover:bg-black/90"
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
              Continue with Apple
            </Button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or sign up with email</span>
            </div>
          </div>
        </>
      )}

      {isOAuthUser && (
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 border border-border px-4 py-3 text-sm text-muted-foreground">
          <Check className="h-4 w-4 text-green-500 shrink-0" />
          Signed in — just pick a username to continue
        </div>
      )}

      {/* Full Name */}
      <div className="space-y-2">
        <Label htmlFor="fullName" className="text-sm font-medium text-foreground">
          Name
        </Label>
        <Input
          id="fullName"
          type="text"
          placeholder="John Smith"
          value={formData.fullName}
          onChange={(e) => updateFormData({ fullName: e.target.value })}
          onBlur={() => handleBlur("fullName")}
          className="h-12 text-base"
          autoFocus={!isOAuthUser}
        />
        {touched.fullName && errors.fullName && (
          <p className="text-sm text-destructive">{errors.fullName}</p>
        )}
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium text-foreground">
          Email
        </Label>
        <div className="relative">
          <Input
            id="email"
            type="email"
            placeholder="john@example.com"
            value={formData.email}
            onChange={(e) => !emailReadOnly && updateFormData({ email: e.target.value })}
            onBlur={() => handleBlur("email")}
            className={`h-12 text-base ${emailReadOnly ? "bg-muted pr-10" : ""}`}
            readOnly={emailReadOnly}
          />
          {emailReadOnly && (
            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          )}
        </div>
        {emailReadOnly && !isOAuthUser && (
          <p className="text-xs text-muted-foreground">Verified via card activation</p>
        )}
        {touched.email && errors.email && (
          <p className="text-sm text-destructive">{errors.email}</p>
        )}
      </div>

      {/* Username */}
      <div className="space-y-2">
        <Label htmlFor="username" className="text-sm font-medium text-foreground">
          Username
        </Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            tapaway.co/{selectedPlan === "free" ? "tap" : ""}
          </span>
          <Input
            id="username"
            type="text"
            placeholder="yourname"
            value={formData.username}
            onChange={(e) => updateFormData({ username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })}
            onBlur={() => handleBlur("username")}
            className={`h-12 text-base ${selectedPlan === "free" ? "pl-36" : "pl-28"}`}
            autoFocus={isOAuthUser}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {usernameStatus === "checking" && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            {usernameStatus === "available" && (
              <Check className="h-4 w-4 text-green-500" />
            )}
            {usernameStatus === "taken" && (
              <X className="h-4 w-4 text-destructive" />
            )}
          </div>
        </div>
        {usernameStatus === "taken" && (
          <div className="space-y-2">
            <p className="text-sm text-destructive">This username is already taken</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate("/auth?redirect=/personal/dashboard")}
              className="text-xs"
            >
              <LogIn className="h-3 w-3 mr-1" />
              Already yours? Log in
            </Button>
          </div>
        )}
        {touched.username && errors.username && usernameStatus !== "taken" && (
          <p className="text-sm text-destructive">{errors.username}</p>
        )}
        {usernameStatus === "available" && (
          <>
            <p className="text-sm text-muted-foreground">
              You can change your username later from your dashboard
            </p>
            {selectedPlan === "free" && (
              <button
                type="button"
                onClick={() => {
                  updateFormData({ planType: "yearly" });
                  toast("Free trial selected — you can try Pro free for 7 days to remove the 'tap' prefix.");
                }}
                className="text-xs text-muted-foreground underline cursor-pointer flex items-center gap-1"
              >
                <Info className="h-3 w-3" />
                Start a free trial to remove the "tap" prefix
              </button>
            )}
          </>
        )}
      </div>

      {/* Password — hidden for OAuth users */}
      {!isOAuthUser && (
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium text-foreground">
            Create a password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="At least 8 characters"
              value={formData.password || ""}
              onChange={(e) => updateFormData({ password: e.target.value })}
              onBlur={() => handleBlur("password")}
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
            <p className="text-sm text-destructive">{errors.password}</p>
          )}
          <p className="text-sm text-muted-foreground">
            You'll use this to log in to your dashboard.
          </p>
        </div>
      )}

      {/* Continue Button */}
      <Button
        onClick={handleSubmit}
        disabled={isLoading || !isFormValid}
        className="w-full h-14 text-base font-semibold"
      >
        Continue
      </Button>
    </div>
  );
};
