import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Check, Loader2, ArrowRight, AlertCircle, Upload, Mail } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

// Validation schema
const formSchema = z.object({
  email: z.string().trim().email("Please enter a valid email").max(255),
  businessName: z.string().trim().min(1, "Business name is required").max(100),
  city: z.string().trim().min(1, "City is required").max(100),
  state: z.string().trim().min(1, "State is required").max(50),
  businessType: z.string().min(1, "Please select a business type"),
  shippingName: z.string().trim().min(1, "Shipping name is required").max(100),
  shippingAddress: z.string().trim().min(1, "Shipping address is required").max(200),
  shippingCity: z.string().trim().min(1, "Shipping city is required").max(100),
  shippingState: z.string().trim().min(1, "Shipping state is required").max(50),
  shippingZip: z.string().trim().min(5, "ZIP code is required").max(10),
});

const businessTypes = [
  "Restaurant",
  "Cafe / Coffee Shop",
  "Bar / Brewery",
  "Barber / Salon",
  "Food Truck",
  "Bakery",
  "Fast Casual",
  "Fine Dining",
  "Spa / Wellness",
  "Auto / Detailing",
  "Other",
];

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

type ViewState = 'form' | 'otp' | 'completing' | 'success';

const OnboardingStart = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const source = searchParams.get('source');
  const canceled = searchParams.get('canceled') === 'true';
  
  const [viewState, setViewState] = useState<ViewState>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // OTP state
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  
  // Logo state
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [useUnbranded, setUseUnbranded] = useState(false);
  
  const [formData, setFormData] = useState({
    email: "",
    businessName: "",
    city: "",
    state: "",
    businessType: "",
    shippingName: "",
    shippingAddress: "",
    shippingCity: "",
    shippingState: "",
    shippingZip: "",
  });

  // Pre-fill from localStorage (pending trial data from /start)
  useEffect(() => {
    const pendingEmail = localStorage.getItem('tapaway_pending_email');
    const pendingBusiness = localStorage.getItem('tapaway_pending_business');
    const pendingCity = localStorage.getItem('tapaway_pending_city');
    const pendingState = localStorage.getItem('tapaway_pending_state');
    const pendingType = localStorage.getItem('tapaway_pending_type');
    
    if (pendingEmail || pendingBusiness) {
      setFormData(prev => ({
        ...prev,
        email: pendingEmail || prev.email,
        businessName: pendingBusiness || prev.businessName,
        city: pendingCity || prev.city,
        state: pendingState || prev.state,
        businessType: pendingType || prev.businessType,
        shippingCity: pendingCity || prev.shippingCity,
        shippingState: pendingState || prev.shippingState,
      }));
    }

    // Check if already logged in
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Check for restaurant
        const { data: restaurant } = await supabase
          .from("restaurants")
          .select("id, onboarding_completed")
          .eq("owner_id", session.user.id)
          .maybeSingle();
        
        if (restaurant?.onboarding_completed) {
          navigate("/dashboard");
          return;
        }
        
        // Pre-fill email
        setFormData(prev => ({
          ...prev,
          email: session.user.email || prev.email,
        }));
      }
    };
    
    checkSession();
  }, [navigate]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2097152) {
        toast.error("Logo must be less than 2MB");
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setUseUnbranded(false);
    }
  };

  const validateForm = () => {
    try {
      formSchema.parse(formData);
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.errors.forEach((e) => {
          if (e.path[0]) {
            newErrors[e.path[0] as string] = e.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    const email = formData.email.toLowerCase().trim();

    try {
      // Check if already logged in
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user && session.user.email?.toLowerCase() === email) {
        // Already authenticated with same email - skip OTP
        await completeOnboarding(session.user.id);
        return;
      }

      // Send custom OTP via our branded email
      const { data: otpResponse, error: otpError } = await supabase.functions.invoke('send-custom-otp', {
        body: { email },
      });

      if (otpError || otpResponse?.error) {
        throw new Error(otpResponse?.error || otpError?.message || "Failed to send verification code");
      }

      // Save form data to localStorage for resumption
      localStorage.setItem('tapaway_onboarding_form', JSON.stringify(formData));
      if (logoFile) {
        // Can't store file in localStorage, user will need to re-upload
        localStorage.setItem('tapaway_onboarding_logo_pending', 'true');
      }
      
      setViewState('otp');
      toast.success("Check your email for a verification code");
    } catch (err: any) {
      console.error('[OnboardingStart] Error:', err);
      toast.error(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode.trim() || otpCode.length < 6) {
      setOtpError("Please enter the 6-digit code from your email");
      return;
    }

    setIsVerifyingOtp(true);
    setOtpError(null);

    try {
      const email = formData.email.toLowerCase().trim();
      
      // Verify OTP via our custom function
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-custom-otp', {
        body: { email, code: otpCode.trim() },
      });

      if (verifyError || verifyData?.error) {
        setOtpError(verifyData?.error || verifyError?.message || "Invalid code. Please try again.");
        return;
      }

      // If new user, sign them in with the temp password
      if (verifyData.isNewUser && verifyData.tempPassword) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password: verifyData.tempPassword,
        });

        if (signInError) {
          console.error('[OnboardingStart] Sign in error:', signInError);
          // Try magic link as fallback
          await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
          setOtpError("Account created! Check your email for a login link.");
          return;
        }
      } else {
        // Existing user - use magic link to sign in
        const { error: magicError } = await supabase.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: false },
        });

        if (magicError) {
          console.error('[OnboardingStart] Magic link error:', magicError);
        }
        
        // For existing users, we'll proceed with onboarding anyway
        // They're verified via our custom OTP
      }

      // Wait a moment for session to be established
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        await completeOnboarding(session.user.id);
      } else {
        // If no session yet, use the userId from verify response
        await completeOnboarding(verifyData.userId);
      }
    } catch (err: any) {
      setOtpError(err.message || "Invalid code. Please try again.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const completeOnboarding = async (userId: string) => {
    setViewState('completing');

    try {
      // Check for existing restaurant
      const { data: existingRestaurant } = await supabase
        .from("restaurants")
        .select("id, onboarding_completed")
        .eq("owner_id", userId)
        .maybeSingle();

      let restaurantId = existingRestaurant?.id;

      if (existingRestaurant?.onboarding_completed) {
        // Already done - redirect
        clearOnboardingData();
        navigate("/dashboard");
        return;
      }

      // Generate slug
      const slug = formData.businessName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 50);

      if (existingRestaurant) {
        // Update existing restaurant
        const { error: updateError } = await supabase
          .from("restaurants")
          .update({
            restaurant_name: formData.businessName.trim(),
            address: `${formData.city.trim()}, ${formData.state}`,
            type: formData.businessType.toLowerCase().replace(/\s+/g, '_'),
            custom_slug: slug,
            onboarding_step: 4,
            onboarding_completed: true,
          })
          .eq("id", existingRestaurant.id);

        if (updateError) throw updateError;
      } else {
        // Create new restaurant
        const { data: newRestaurant, error: insertError } = await supabase
          .from("restaurants")
          .insert({
            owner_id: userId,
            restaurant_name: formData.businessName.trim(),
            address: `${formData.city.trim()}, ${formData.state}`,
            type: formData.businessType.toLowerCase().replace(/\s+/g, '_'),
            custom_slug: slug,
            email: formData.email.toLowerCase().trim(),
            subscription_status: 'trialing',
            onboarding_step: 4,
            onboarding_completed: true,
          })
          .select("id")
          .single();

        if (insertError) throw insertError;
        restaurantId = newRestaurant.id;
      }

      // Upload logo if provided
      if (logoFile && restaurantId && !useUnbranded) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${restaurantId}/logo.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('restaurant-logos')
          .upload(fileName, logoFile, { upsert: true });
        
        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('restaurant-logos')
            .getPublicUrl(fileName);
          
          await supabase
            .from("restaurants")
            .update({ logo_url: urlData.publicUrl })
            .eq("id", restaurantId);
        }
      }

      // Update or create fulfillment order
      if (restaurantId) {
        await supabase
          .from("fulfillment_orders")
          .upsert({
            user_id: userId,
            restaurant_id: restaurantId,
            plan: 'trial',
            shipping_name: formData.shippingName.trim(),
            shipping_address_line1: formData.shippingAddress.trim(),
            shipping_city: formData.shippingCity.trim(),
            shipping_state: formData.shippingState,
            shipping_postal_code: formData.shippingZip.trim(),
            shipping_country: 'US',
            status: 'ready_to_ship',
          }, { onConflict: 'user_id,restaurant_id' });

        // Update pending trial if exists
        await supabase
          .from("pending_trials")
          .update({
            status: 'activated',
            linked_restaurant_id: restaurantId,
            updated_at: new Date().toISOString(),
          })
          .eq("email", formData.email.toLowerCase().trim());
      }

      clearOnboardingData();
      setViewState('success');
      
      // Redirect after brief pause
      setTimeout(() => {
        navigate("/dashboard");
      }, 3000);

    } catch (err: any) {
      console.error('[OnboardingStart] Complete error:', err);
      toast.error("Something went wrong. Please try again.");
      setViewState('form');
    }
  };

  const clearOnboardingData = () => {
    localStorage.removeItem('tapaway_pending_trial');
    localStorage.removeItem('tapaway_pending_email');
    localStorage.removeItem('tapaway_pending_business');
    localStorage.removeItem('tapaway_pending_city');
    localStorage.removeItem('tapaway_pending_state');
    localStorage.removeItem('tapaway_pending_type');
    localStorage.removeItem('tapaway_pending_setup');
    localStorage.removeItem('tapaway_trial_intent');
    localStorage.removeItem('tapaway_onboarding_form');
    localStorage.removeItem('tapaway_onboarding_logo_pending');
    localStorage.setItem('tapaway_onboarding_complete', 'true');
    
    // Clear cookies
    document.cookie = 'tapaway_pending_trial=; path=/; max-age=0';
    document.cookie = 'tapaway_pending_email=; path=/; max-age=0';
    document.cookie = 'tapaway_pending_setup=; path=/; max-age=0';
  };

  // Success state
  if (viewState === 'success') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-black mb-2">You're set 🎉</h1>
          <p className="text-muted-foreground text-lg mb-2">
            Cards ship in 1–2 business days.
          </p>
          <p className="text-muted-foreground">
            We'll email you when your hub is ready.
          </p>
          <div className="mt-8">
            <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-2">Taking you to your dashboard...</p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Completing state
  if (viewState === 'completing') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-6" />
          <h1 className="text-2xl font-bold mb-2">Setting up your TapAway account…</h1>
          <p className="text-muted-foreground">This just takes a moment.</p>
        </motion.div>
      </div>
    );
  }

  // OTP verification state
  if (viewState === 'otp') {
    return (
      <div className="min-h-screen bg-background">
        <nav className="sticky top-0 z-50 bg-background/90 backdrop-blur-lg border-b border-border">
          <div className="max-w-lg mx-auto px-4">
            <div className="flex justify-between items-center py-3">
              <a href="/" className="font-black text-xl tracking-tight text-foreground">
                TapAway
              </a>
            </div>
          </div>
        </nav>

        <div className="max-w-lg mx-auto px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-8">
              <div className="text-center mb-8">
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-7 h-7 text-primary" />
                </div>
                <h1 className="text-2xl font-bold mb-2">Check your email</h1>
                <p className="text-muted-foreground">
                  We sent a 6-digit code to <span className="font-medium text-foreground">{formData.email}</span>
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="otp">Verification code</Label>
                  <Input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className={`text-center text-2xl tracking-widest ${otpError ? 'border-destructive' : ''}`}
                  />
                  {otpError && (
                    <p className="text-sm text-destructive mt-1">{otpError}</p>
                  )}
                </div>

                <Button
                  onClick={handleVerifyOtp}
                  disabled={isVerifyingOtp || otpCode.length < 6}
                  className="w-full h-12"
                >
                  {isVerifyingOtp ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Verify & Continue"
                  )}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Didn't get the email?{" "}
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="text-primary hover:underline"
                  >
                    Resend code
                  </button>
                </p>

                <button
                  type="button"
                  onClick={() => setViewState('form')}
                  className="w-full text-sm text-muted-foreground hover:text-foreground"
                >
                  ← Back to form
                </button>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  // Main form
  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 bg-background/90 backdrop-blur-lg border-b border-border">
        <div className="max-w-lg mx-auto px-4">
          <div className="flex justify-between items-center py-3">
            <a href="/" className="font-black text-xl tracking-tight text-foreground">
              TapAway
            </a>
          </div>
        </div>
      </nav>

      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Source indicator */}
        {source === 'stripe' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-primary/5 rounded-lg border border-primary/20"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <Check className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-primary">Payment confirmed!</p>
                <p className="text-sm text-muted-foreground">Now let's finish setting up your account.</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-black mb-2">Let's finish setting up TapAway</h1>
          <p className="text-muted-foreground text-lg">
            Your trial is active — we just need a few details to ship your cards.
          </p>
        </motion.div>

        {/* Form */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          {/* Email */}
          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="you@business.com"
              className={errors.email ? "border-destructive" : ""}
            />
            {errors.email && (
              <p className="text-sm text-destructive mt-1">{errors.email}</p>
            )}
          </div>

          {/* Business Info Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Business Info</h3>
            
            <div>
              <Label htmlFor="businessName">Business Name *</Label>
              <Input
                id="businessName"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                placeholder="e.g. Joe's Pizza"
                className={errors.businessName ? "border-destructive" : ""}
              />
              {errors.businessName && (
                <p className="text-sm text-destructive mt-1">{errors.businessName}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="e.g. Austin"
                  className={errors.city ? "border-destructive" : ""}
                />
              </div>
              <div>
                <Label htmlFor="state">State *</Label>
                <Select
                  value={formData.state}
                  onValueChange={(value) => setFormData({ ...formData, state: value })}
                >
                  <SelectTrigger className={errors.state ? "border-destructive" : ""}>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {US_STATES.map((state) => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="businessType">Business Type *</Label>
              <Select
                value={formData.businessType}
                onValueChange={(value) => setFormData({ ...formData, businessType: value })}
              >
                <SelectTrigger className={errors.businessType ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select your business type" />
                </SelectTrigger>
                <SelectContent>
                  {businessTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Shipping Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Shipping Address</h3>
            
            <div>
              <Label htmlFor="shippingName">Recipient Name *</Label>
              <Input
                id="shippingName"
                value={formData.shippingName}
                onChange={(e) => setFormData({ ...formData, shippingName: e.target.value })}
                placeholder="Full name"
                className={errors.shippingName ? "border-destructive" : ""}
              />
            </div>

            <div>
              <Label htmlFor="shippingAddress">Street Address *</Label>
              <Input
                id="shippingAddress"
                value={formData.shippingAddress}
                onChange={(e) => setFormData({ ...formData, shippingAddress: e.target.value })}
                placeholder="123 Main St"
                className={errors.shippingAddress ? "border-destructive" : ""}
              />
            </div>

            <div className="grid grid-cols-5 gap-3">
              <div className="col-span-2">
                <Label htmlFor="shippingCity">City *</Label>
                <Input
                  id="shippingCity"
                  value={formData.shippingCity}
                  onChange={(e) => setFormData({ ...formData, shippingCity: e.target.value })}
                  placeholder="City"
                  className={errors.shippingCity ? "border-destructive" : ""}
                />
              </div>
              <div>
                <Label htmlFor="shippingState">State *</Label>
                <Select
                  value={formData.shippingState}
                  onValueChange={(value) => setFormData({ ...formData, shippingState: value })}
                >
                  <SelectTrigger className={errors.shippingState ? "border-destructive" : ""}>
                    <SelectValue placeholder="ST" />
                  </SelectTrigger>
                  <SelectContent>
                    {US_STATES.map((state) => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label htmlFor="shippingZip">ZIP *</Label>
                <Input
                  id="shippingZip"
                  value={formData.shippingZip}
                  onChange={(e) => setFormData({ ...formData, shippingZip: e.target.value })}
                  placeholder="12345"
                  className={errors.shippingZip ? "border-destructive" : ""}
                />
              </div>
            </div>
          </div>

          {/* Logo Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Logo (Optional)</h3>
            
            {!useUnbranded && (
              <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  id="logo"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                />
                <label htmlFor="logo" className="cursor-pointer">
                  {logoPreview ? (
                    <div className="space-y-3">
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="w-24 h-24 object-contain mx-auto rounded-lg"
                      />
                      <p className="text-sm text-muted-foreground">Click to change</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-8 h-8 text-muted-foreground mx-auto" />
                      <p className="text-sm font-medium">Upload your logo</p>
                      <p className="text-xs text-muted-foreground">PNG or JPG, max 2MB</p>
                    </div>
                  )}
                </label>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="unbranded"
                checked={useUnbranded}
                onCheckedChange={(checked) => {
                  setUseUnbranded(checked === true);
                  if (checked) {
                    setLogoFile(null);
                    setLogoPreview(null);
                  }
                }}
              />
              <label htmlFor="unbranded" className="text-sm cursor-pointer">
                Send unbranded cards (no logo)
              </label>
            </div>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-14 text-lg font-bold"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Please wait...
              </>
            ) : (
              <>
                Continue Setup
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            We'll send a quick verification code to your email.
          </p>
        </motion.form>
      </div>
    </div>
  );
};

export default OnboardingStart;
