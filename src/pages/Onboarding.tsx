import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
import { Upload, ArrowRight, ArrowLeft, Check, AlertCircle, Loader2 } from "lucide-react";
import { z } from "zod";
import { motion } from "framer-motion";
import { GooglePlacesAutocomplete } from "@/components/GooglePlacesAutocomplete";
import { isSuperAdmin } from "@/lib/grandfatheredUsers";
import { normalizeGooglePlaceId, buildGoogleReviewUrl } from "@/lib/google";
import { 
  getOnboardingData, 
  saveOnboardingData, 
  clearOnboardingData, 
  generateSlug,
  setEmailVerified,
  isEmailVerified,
  setPendingSetup,
} from "@/lib/onboardingData";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";

// Validation schemas
const step1Schema = z.object({
  email: z.string().trim().email("Please enter a valid email").max(255),
  businessName: z.string().trim().min(1, "Business name is required").max(100),
  city: z.string().trim().min(1, "City is required").max(100),
  state: z.string().trim().min(2, "State is required").max(50),
  businessType: z.string().min(1, "Please select a business type"),
  shippingAddress: z.string().trim().min(1, "Shipping address is required").max(200),
});

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password is too long")
  .regex(/[A-Za-z]/, "Password must include a letter")
  .regex(/[0-9]/, "Password must include a number");

const BUSINESS_TYPES = [
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
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

const ONBOARDING_STEPS = ["Your info", "Connect Google", "Finish"];

type ViewState = "form" | "google" | "finishing" | "success";

const Onboarding = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const source = searchParams.get("source");
  
  const [viewState, setViewState] = useState<ViewState>("form");
  const [isLoading, setIsLoading] = useState(false);
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    email: "",
    businessName: "",
    city: "",
    state: "",
    businessType: "",
    shippingAddress: "",
    ownerName: "",
    customSlug: "",
    instagram: "",
    phone: "",
  });
  
  // Password state (collected at Step 1)
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  
  // Logo state
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [useUnbranded, setUseUnbranded] = useState(false);
  
  // Google state
  const [selectedGooglePlace, setSelectedGooglePlace] = useState<{
    placeId: string;
    name: string;
    address: string;
  } | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [googleWidgetFailed, setGoogleWidgetFailed] = useState(false);
  const [isManualSearching, setIsManualSearching] = useState(false);
  const [addYelp, setAddYelp] = useState(true);
  
  // User/restaurant IDs (set after auth)
  const [userId, setUserId] = useState<string | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  // Initial setup - check for existing session and pre-fill data
  useEffect(() => {
    const init = async () => {
      // Set pending setup flag
      setPendingSetup(true);
      
      // Pre-fill from saved onboarding data
      const savedData = getOnboardingData();

      // Also allow prefill from query param (used by post-checkout recovery flows)
      const emailFromQuery = searchParams.get("email");
      if (emailFromQuery && !savedData.email) {
        setFormData((prev) => ({ ...prev, email: emailFromQuery.toLowerCase().trim() }));
      }

      if (savedData.email || savedData.businessName) {
        setFormData(prev => ({
          ...prev,
          email: savedData.email || prev.email,
          businessName: savedData.businessName || prev.businessName,
          city: savedData.city || prev.city,
          state: savedData.state || prev.state,
          businessType: savedData.businessType || prev.businessType,
          shippingAddress: savedData.shippingAddress || prev.shippingAddress,
          ownerName: savedData.ownerName || prev.ownerName,
          customSlug: savedData.customSlug || generateSlug(savedData.businessName || ""),
          instagram: savedData.instagram || prev.instagram,
          phone: savedData.phone || prev.phone,
        }));
        setUseUnbranded(savedData.unbrandedCards || false);
      }

      // Check for existing session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Super admin bypass
        if (isSuperAdmin(session.user.email)) {
          navigate("/admin");
          return;
        }
        
        setUserId(session.user.id);
        
        // Check for existing restaurant
        const { data: restaurant } = await supabase
          .from("restaurants")
          .select("id, onboarding_completed, google_place_id, restaurant_name, owner_name, custom_slug")
          .eq("owner_id", session.user.id)
          .maybeSingle();
        
        if (restaurant?.onboarding_completed) {
          navigate("/dashboard");
          return;
        }
        
        if (restaurant) {
          setRestaurantId(restaurant.id);
          
          // Pre-fill from restaurant data
          if (restaurant.restaurant_name) {
            setFormData(prev => ({
              ...prev,
              businessName: restaurant.restaurant_name || prev.businessName,
              ownerName: restaurant.owner_name || prev.ownerName,
              customSlug: restaurant.custom_slug || prev.customSlug,
            }));
          }
          
          // If Google is already connected, skip to finishing step
          if (restaurant.google_place_id) {
            setViewState("finishing");
          } else if (isEmailVerified()) {
            // Email already verified, go to Google step
            setViewState("google");
          }
        } else if (isEmailVerified()) {
          // Has session but no restaurant, email verified - go to Google step
          setViewState("google");
        }
        
        // Pre-fill email from session
        if (!formData.email && session.user.email) {
          setFormData(prev => ({ ...prev, email: session.user.email! }));
        }
      }
      
      setInitialCheckDone(true);
    };
    
    init();
  }, [navigate]);

  // Fail-fast guard: onboarding must never trigger default auth email flows
  useEffect(() => {
    const blockedMethods = ["signInWithOtp", "signUp", "resetPasswordForEmail", "verifyOtp"] as const;
    const originals: Partial<Record<(typeof blockedMethods)[number], unknown>> = {};

    blockedMethods.forEach((method) => {
      const authAny = supabase.auth as any;
      if (typeof authAny[method] !== "function") return;

      originals[method] = authAny[method];
      authAny[method] = () => {
        console.error(`[Onboarding][AUTH_GUARD] Blocked supabase.auth.${method}`, {
          ts: new Date().toISOString(),
        });
        throw new Error("Default OTP/verification email flow is disabled in onboarding.");
      };
    });

    return () => {
      const authAny = supabase.auth as any;
      blockedMethods.forEach((method) => {
        if (originals[method]) authAny[method] = originals[method];
      });
    };
  }, []);

  // Form handlers
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-generate slug from business name
    if (field === "businessName") {
      setFormData(prev => ({ ...prev, customSlug: generateSlug(value) }));
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be less than 2MB");
      return;
    }

    setLogoFile(file);
    setUseUnbranded(false);

    const reader = new FileReader();
    reader.onloadend = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    let formatted = digits;
    if (digits.length > 6) {
      formatted = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else if (digits.length > 3) {
      formatted = `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    } else if (digits.length > 0) {
      formatted = `(${digits}`;
    }
    setFormData(prev => ({ ...prev, phone: formatted }));
  };

  // Step 1: Submit form, create account, sign in, skip to Google
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      step1Schema.parse(formData);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    // Validate password
    const pwResult = passwordSchema.safeParse(password);
    if (!pwResult.success) {
      setPasswordError(pwResult.error.errors[0].message);
      return;
    }
    setPasswordError(null);

    setIsLoading(true);
    const email = formData.email.toLowerCase().trim();

    try {
      // Check if already logged in with this email
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user && session.user.email?.toLowerCase() === email) {
        setUserId(session.user.id);
        await saveFormDataAndCreateRestaurant(session.user.id);
        setEmailVerified();
        setViewState("google");
        return;
      }

      // Save form data to localStorage
      saveOnboardingData({
        email,
        businessName: formData.businessName.trim(),
        city: formData.city.trim(),
        state: formData.state,
        businessType: formData.businessType,
        shippingAddress: formData.shippingAddress.trim(),
        ownerName: formData.ownerName.trim(),
        customSlug: formData.customSlug || generateSlug(formData.businessName),
        instagram: formData.instagram,
        phone: formData.phone,
        unbrandedCards: useUnbranded,
        logoUploaded: !!logoFile,
      });

      // Create account via edge function (no OTP needed)
      const { data: accountData, error: accountError } = await supabase.functions.invoke('create-trial-account', {
        body: { email, password },
      });

      if (accountError || accountData?.error) {
        throw new Error(accountData?.error || accountError?.message || "Failed to create account");
      }

      // Sign in with the new account
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error("[Onboarding] Sign in error:", signInError);
        throw new Error("Account created but couldn't log you in. Please try again.");
      }

      // Wait for session
      await new Promise(resolve => setTimeout(resolve, 500));

      const { data: { session: newSession } } = await supabase.auth.getSession();
      const currentUserId = newSession?.user?.id || accountData.userId;

      if (!currentUserId) {
        throw new Error("Could not verify your account. Please try again.");
      }

      setUserId(currentUserId);
      setEmailVerified();

      // Create or update restaurant
      await saveFormDataAndCreateRestaurant(currentUserId);

      // Move to Google step
      setViewState("google");
      toast.success("Account created! Let's connect your Google Business.");
    } catch (err: any) {
      console.error('[Onboarding] Step 1 error:', err);
      toast.error(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };




  // Helper: Save form data and create/update restaurant
  const saveFormDataAndCreateRestaurant = async (uid: string) => {
    const slug = formData.customSlug || generateSlug(formData.businessName);
    
    // Check for existing restaurant
    const { data: existing } = await supabase
      .from("restaurants")
      .select("id")
      .eq("owner_id", uid)
      .maybeSingle();

    if (existing?.id) {
      // Update existing
      await supabase
        .from("restaurants")
        .update({
          restaurant_name: formData.businessName.trim(),
          owner_name: formData.ownerName.trim() || null,
          address: `${formData.city.trim()}, ${formData.state}`,
          type: formData.businessType.toLowerCase().replace(/\s+/g, "_"),
          custom_slug: slug,
          email: formData.email.toLowerCase().trim(),
          instagram_url: formData.instagram || null,
          phone: formData.phone || null,
          onboarding_step: 2,
        })
        .eq("id", existing.id);
      
      setRestaurantId(existing.id);
    } else {
      // Create new
      const { data: created, error } = await supabase
        .from("restaurants")
        .insert({
          owner_id: uid,
          restaurant_name: formData.businessName.trim(),
          owner_name: formData.ownerName.trim() || null,
          address: `${formData.city.trim()}, ${formData.state}`,
          type: formData.businessType.toLowerCase().replace(/\s+/g, "_"),
          custom_slug: slug,
          email: formData.email.toLowerCase().trim(),
          instagram_url: formData.instagram || null,
          phone: formData.phone || null,
          subscription_status: 'trialing',
          onboarding_step: 2,
        })
        .select("id")
        .single();

      if (!error && created) {
        setRestaurantId(created.id);
      }
    }
  };

  // Step 3: Google place selection
  const handleGooglePlaceSelected = useCallback(async ({ placeId, name, address }: { placeId: string; name: string; address: string }) => {
    if (!placeId) {
      setGoogleError("Invalid place selected. Please try again.");
      return;
    }
    
    const normalizedPlaceId = normalizeGooglePlaceId(placeId) || placeId.replace(/^places\//, '');
    
    setSelectedGooglePlace({ placeId: normalizedPlaceId, name, address });
    setGoogleError(null);
    
    // Update business name if not set
    if (!formData.businessName && name) {
      setFormData(prev => ({ ...prev, businessName: name }));
    }
  }, [formData.businessName]);

  // Manual Google search fallback via edge function
  const handleManualGoogleSearch = async () => {
    const searchQuery = `${formData.businessName} ${formData.city} ${formData.state}`.trim();
    if (!searchQuery) {
      setGoogleError("Please fill in your business name and city first.");
      return;
    }
    setIsManualSearching(true);
    setGoogleError(null);
    try {
      const { data, error } = await supabase.functions.invoke("lookup-place-id", {
        body: { address: searchQuery },
      });
      if (error || !data?.placeId) {
        setGoogleError(data?.error || "Could not find your business. Please try a different search or contact support.");
        return;
      }
      handleGooglePlaceSelected({
        placeId: data.placeId,
        name: data.name || formData.businessName,
        address: data.formattedAddress || `${formData.city}, ${formData.state}`,
      });
    } catch (err) {
      setGoogleError("Search failed. Please try again.");
    } finally {
      setIsManualSearching(false);
    }
  };

  // Step 3: Save Google and proceed
  const handleGoogleSubmit = async () => {
    if (!selectedGooglePlace) {
      setGoogleError("Please search and select your business from Google.");
      return;
    }

    if (!restaurantId) {
      setGoogleError("No restaurant found. Please refresh and try again.");
      return;
    }

    setIsLoading(true);
    setGoogleError(null);

    try {
      const normalizedPlaceId = normalizeGooglePlaceId(selectedGooglePlace.placeId);
      const googleReviewUrl = buildGoogleReviewUrl(normalizedPlaceId);
      
      if (!googleReviewUrl) {
        setGoogleError("Invalid Google place. Please try again.");
        setIsLoading(false);
        return;
      }

      // Build directions URL
      const encodedAddress = encodeURIComponent(selectedGooglePlace.address || formData.city);
      const encodedName = encodeURIComponent(selectedGooglePlace.name || formData.businessName);
      const directionsUrl = `https://maps.apple.com/?q=${encodedName}&address=${encodedAddress}`;

      // Save to database
      const { error } = await supabase
        .from("restaurants")
        .update({
          google_place_id: normalizedPlaceId,
          google_review_url: googleReviewUrl,
          address: selectedGooglePlace.address || `${formData.city}, ${formData.state}`,
          directions_url: directionsUrl,
          onboarding_step: 3,
        })
        .eq("id", restaurantId);

      if (error) {
        console.error('[Onboarding] Google save error:', error);
        setGoogleError("Failed to save. Please try again.");
        setIsLoading(false);
        return;
      }

      toast.success("Google Business connected!");
      setViewState("finishing");
    } catch (err: any) {
      console.error('[Onboarding] Google submit error:', err);
      setGoogleError(err.message || "Failed to connect Google. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Final step: Complete onboarding
  const handleComplete = async () => {
    if (!restaurantId || !userId) {
      toast.error("Setup error. Please refresh and try again.");
      return;
    }

    setIsLoading(true);

    try {
      // Upload logo if provided
      if (logoFile && !useUnbranded) {
        try {
          const fileExt = logoFile.name.split(".").pop();
          const fileName = `${restaurantId}/logo.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from("restaurant-logos")
            .upload(fileName, logoFile, { upsert: true });

          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from("restaurant-logos")
              .getPublicUrl(fileName);
            
            await supabase
              .from("restaurants")
              .update({ logo_url: urlData.publicUrl })
              .eq("id", restaurantId);
          }
        } catch (logoErr) {
          console.error('[Onboarding] Logo upload failed:', logoErr);
        }
      }

      // Auto-detect Yelp if checkbox is checked
      if (addYelp) {
        try {
          await supabase.functions.invoke('auto-yelp-from-place', {
            body: { restaurantId }
          });
        } catch (yelpErr) {
          console.log('[Onboarding] Yelp auto-detect skipped:', yelpErr);
        }
      }

      // Mark onboarding as complete
      await supabase
        .from("restaurants")
        .update({
          onboarding_completed: true,
          onboarding_step: 4,
        })
        .eq("id", restaurantId);

      // Create fulfillment order
      await supabase
        .from("fulfillment_orders")
        .upsert({
          user_id: userId,
          restaurant_id: restaurantId,
          plan: 'trial',
          shipping_name: formData.ownerName || formData.businessName,
          shipping_address_line1: formData.shippingAddress,
          shipping_city: formData.city,
          shipping_state: formData.state,
          shipping_country: 'US',
          status: 'ready_to_ship',
        }, { onConflict: 'user_id,restaurant_id' });

      // Call finalize-onboarding
      try {
        await supabase.functions.invoke('finalize-onboarding', {
          body: { restaurantId }
        });
      } catch (finalizeErr) {
        console.error('[Onboarding] finalize-onboarding error:', finalizeErr);
      }

      // Clear localStorage
      clearOnboardingData();

      // Show success
      setViewState("success");
    } catch (err: any) {
      console.error('[Onboarding] Complete error:', err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };




  // Loading state
  if (!initialCheckDone) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Success state
  if (viewState === "success") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-black mb-2">You're all set 🎉</h1>
          <div className="space-y-2 text-muted-foreground mb-8">
            <p className="text-lg">Your 30-day trial is now active.</p>
            <p>Cards are being prepared and will ship in 1–2 business days.</p>
            <p>We'll email you tracking info when they're on the way.</p>
          </div>
          <Button 
            size="lg" 
            className="w-full max-w-xs"
            onClick={() => navigate("/dashboard")}
          >
            Go to Dashboard
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>
      </div>
    );
  }

  // Get current step number for progress indicator
  const getStepNumber = () => {
    switch (viewState) {
      case "form": return 1;
      case "google": return 2;
      case "finishing": return 3;
      default: return 1;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="sticky top-0 z-50 bg-background/90 backdrop-blur-lg border-b border-border">
        <div className="max-w-lg mx-auto px-4">
          <div className="flex justify-between items-center py-3">
            <a href="/" className="font-black text-xl tracking-tight text-foreground">
              TapAway
            </a>
          </div>
        </div>
      </nav>

      <main className="max-w-lg mx-auto px-4 py-8">
        {/* Progress */}
        <div className="mb-8">
          <OnboardingProgress 
            currentStep={getStepNumber()} 
            totalSteps={4}
            steps={ONBOARDING_STEPS}
          />
        </div>

        {/* Header copy */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-black mb-2">You're almost there</h1>
          <p className="text-muted-foreground text-lg">
            Just a couple quick steps and we'll ship your TapAway cards.
          </p>
        </motion.div>

        {/* Step 1: Form */}
        {viewState === "form" && (
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleStep1Submit}
            className="space-y-5"
          >
            <Card className="p-6 space-y-5">
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="you@business.com"
                  required
                />
              </div>

              <div>
                <Label htmlFor="businessName">Business Name *</Label>
                <Input
                  id="businessName"
                  value={formData.businessName}
                  onChange={(e) => handleInputChange("businessName", e.target.value)}
                  placeholder="e.g. Joe's Pizza"
                  required
                />
              </div>

              <div>
                <Label htmlFor="ownerName">Your Name</Label>
                <Input
                  id="ownerName"
                  value={formData.ownerName}
                  onChange={(e) => handleInputChange("ownerName", e.target.value)}
                  placeholder="Your name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                    placeholder="City"
                    required
                  />
                </div>
                <div>
                  <Label>State *</Label>
                  <Select 
                    value={formData.state} 
                    onValueChange={(v) => handleInputChange("state", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {US_STATES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Business Type *</Label>
                <Select
                  value={formData.businessType}
                  onValueChange={(v) => handleInputChange("businessType", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your business type" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUSINESS_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="shippingAddress">Shipping Address *</Label>
                <Input
                  id="shippingAddress"
                  value={formData.shippingAddress}
                  onChange={(e) => handleInputChange("shippingAddress", e.target.value)}
                  placeholder="Street address for card delivery"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  We'll ship your NFC cards to this address.
                </p>
              </div>

              {/* Logo upload */}
              <div className="space-y-3 pt-2 border-t border-border">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="unbranded"
                    checked={useUnbranded}
                    onCheckedChange={(v) => {
                      setUseUnbranded(v === true);
                      if (v === true) {
                        setLogoFile(null);
                        setLogoPreview(null);
                      }
                    }}
                  />
                  <div>
                    <Label htmlFor="unbranded">Send unbranded cards</Label>
                    <p className="text-xs text-muted-foreground">You can upload a logo later.</p>
                  </div>
                </div>

                {!useUnbranded && (
                  <div>
                    <Label>Logo (optional)</Label>
                    {logoPreview ? (
                      <div className="relative w-20 h-20 mt-2 border border-border rounded-lg overflow-hidden">
                        <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => { setLogoFile(null); setLogoPreview(null); }}
                          className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-20 h-20 mt-2 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors">
                        <Upload className="w-5 h-5 text-muted-foreground" />
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleLogoChange}
                        />
                      </label>
                    )}
                  </div>
                )}
              </div>
            </Card>

            <Button type="submit" disabled={isLoading || password.length < 8} className="w-full h-12 text-lg">
              {isLoading ? (
                <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Creating account...</>
              ) : (
                <>Continue <ArrowRight className="w-5 h-5 ml-2" /></>
              )}
            </Button>
          </motion.form>
        )}




        {/* Step 3: Google Business */}
        {viewState === "google" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Card className="p-6 space-y-5">
              <div>
                <h2 className="text-xl font-bold mb-1">Connect your Google Business</h2>
                <p className="text-sm text-muted-foreground">
                  This powers your review link and helps customers find you.
                </p>
              </div>

              <div>
                <GooglePlacesAutocomplete
                  onPlaceSelected={handleGooglePlaceSelected}
                  defaultValue={`${formData.businessName} ${formData.city} ${formData.state}`.trim()}
                  disabled={isLoading}
                  onError={() => setGoogleWidgetFailed(true)}
                />
                {!selectedGooglePlace && (
                  <div className="mt-2">
                    {googleWidgetFailed ? (
                      <button
                        type="button"
                        disabled={isManualSearching}
                        onClick={handleManualGoogleSearch}
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        {isManualSearching ? (
                          <><Loader2 className="w-3 h-3 animate-spin" /> Searching...</>
                        ) : (
                          "Search failed — click here to search manually"
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isManualSearching}
                        onClick={handleManualGoogleSearch}
                        className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                      >
                        {isManualSearching ? (
                          <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Searching...</span>
                        ) : (
                          "Can't find your business? Search manually"
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {selectedGooglePlace && (
                <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                    <Check className="w-4 h-4" /> 
                    <span><strong>Connected:</strong> {selectedGooglePlace.name}</span>
                  </p>
                  {selectedGooglePlace.address && (
                    <p className="text-xs text-green-600 dark:text-green-500 mt-1 ml-6">
                      {selectedGooglePlace.address}
                    </p>
                  )}
                </div>
              )}

              {googleError && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                  <p className="text-sm text-destructive flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {googleError}
                  </p>
                </div>
              )}

              {/* Yelp option */}
              <div className="flex items-start gap-3 pt-2 border-t border-border">
                <Checkbox
                  id="addYelp"
                  checked={addYelp}
                  onCheckedChange={(v) => setAddYelp(v === true)}
                />
                <div>
                  <Label htmlFor="addYelp">Also add Yelp (recommended)</Label>
                  <p className="text-xs text-muted-foreground">
                    We'll auto-find your Yelp page.
                  </p>
                </div>
              </div>

              {/* Phone (optional) */}
              <div>
                <Label htmlFor="phone">Phone Number (optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="(555) 123-4567"
                  maxLength={14}
                />
              </div>
            </Card>

            <Button 
              onClick={handleGoogleSubmit} 
              disabled={isLoading || !selectedGooglePlace} 
              className="w-full h-12 text-lg"
            >
              {isLoading ? (
                <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Saving...</>
              ) : (
                <>Continue <ArrowRight className="w-5 h-5 ml-2" /></>
              )}
            </Button>
          </motion.div>
        )}

        {/* Step 4: Finishing */}
        {viewState === "finishing" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Card className="p-6 space-y-4">
              <div>
                <h2 className="text-xl font-bold mb-1">Almost done!</h2>
                <p className="text-sm text-muted-foreground">
                  Review your details and we'll get your cards shipped.
                </p>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Business</span>
                  <span className="font-medium">{formData.businessName}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Location</span>
                  <span className="font-medium">{formData.city}, {formData.state}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Ship to</span>
                  <span className="font-medium text-right max-w-[200px]">{formData.shippingAddress}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Google Business</span>
                  <span className="font-medium text-green-600 flex items-center gap-1">
                    <Check className="w-4 h-4" /> Connected
                  </span>
                </div>
                {logoPreview && !useUnbranded && (
                  <div className="flex justify-between py-2 border-b border-border items-center">
                    <span className="text-muted-foreground">Logo</span>
                    <img src={logoPreview} alt="Logo" className="w-10 h-10 rounded object-cover" />
                  </div>
                )}
              </div>
            </Card>

            <Button 
              onClick={handleComplete} 
              disabled={isLoading} 
              className="w-full h-12 text-lg"
            >
              {isLoading ? (
                <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Finishing setup...</>
              ) : (
                <>Complete Setup <Check className="w-5 h-5 ml-2" /></>
              )}
            </Button>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default Onboarding;
