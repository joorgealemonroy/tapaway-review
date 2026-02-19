import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Check, X, Loader2, Eye, EyeOff, Info, LogIn } from "lucide-react";
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
  selectedPlan?: "free" | "monthly" | "yearly";
}

export const IdentityStep = ({ formData, updateFormData, onNext, isLoading, setIsLoading, selectedPlan = "free" }: Props) => {
  const navigate = useNavigate();
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [emailFromCard, setEmailFromCard] = useState(false);

  // Pre-fill from card activation flow (sessionStorage)
  useEffect(() => {
    const cardEmail = sessionStorage.getItem("tapaway_card_email");
    const cardPassword = sessionStorage.getItem("tapaway_card_password");
    if (cardEmail || cardPassword) {
      const updates: Partial<SignupData> = {};
      if (cardEmail) {
        updates.email = cardEmail;
        setEmailFromCard(true);
      }
      if (cardPassword) updates.password = cardPassword;
      updateFormData(updates);
      sessionStorage.removeItem("tapaway_card_email");
      sessionStorage.removeItem("tapaway_card_password");
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
        // For free users, also check with "tap" prefix to ensure both are available
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

  const handleSubmit = () => {
    const result = identitySchema.safeParse({
      fullName: formData.fullName,
      email: formData.email,
      username: formData.username,
      password: formData.password,
    });

    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          newErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(newErrors);
      setTouched({ fullName: true, email: true, username: true, password: true });
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
    (formData.password?.length || 0) >= 8 &&
    usernameStatus === "available";

  return (
    <div className="space-y-6">
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
          autoFocus
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
        <Input
          id="email"
          type="email"
          placeholder="john@example.com"
          value={formData.email}
          onChange={(e) => updateFormData({ email: e.target.value })}
          onBlur={() => handleBlur("email")}
          className="h-12 text-base"
          readOnly={emailFromCard}
          disabled={emailFromCard}
        />
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
            <p className="text-sm text-amber-600">
              ⚠️ Your username cannot be changed after signup
            </p>
            {selectedPlan === "free" && (
              <button
                type="button"
                onClick={() => {
                  updateFormData({ planType: "yearly" });
                  toast("Switched to Pro plan — complete checkout to remove the 'tap' prefix.");
                }}
                className="text-xs text-muted-foreground underline cursor-pointer flex items-center gap-1"
              >
                <Info className="h-3 w-3" />
                Upgrade to Pro to remove the "tap" prefix
              </button>
            )}
          </>
        )}
      </div>

      {/* Password */}
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
