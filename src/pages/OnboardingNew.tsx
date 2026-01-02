import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Upload, ArrowRight, ArrowLeft, Check, AlertCircle, Loader2, RefreshCw, Mail } from "lucide-react";
import { z } from "zod";
import { GooglePlacesAutocomplete } from "@/components/GooglePlacesAutocomplete";
import { normalizeGooglePlaceId, buildGoogleReviewUrl } from "@/lib/google";
import { motion } from "framer-motion";

// Validation schemas
const step1Schema = z.object({
  businessName: z.string().trim().min(1, "Business name is required").max(100),
  city: z.string().trim().min(1, "City is required").max(100),
  state: z.string().trim().min(1, "State is required").max(50),
  category: z.string().min(1, "Please select a category"),
});

const step3Schema = z.object({
  shippingName: z.string().trim().min(1, "Shipping name is required").max(100),
  shippingAddress: z.string().trim().min(1, "Shipping address is required").max(200),
  shippingCity: z.string().trim().min(1, "City is required").max(100),
  shippingState: z.string().trim().min(2, "State is required").max(50),
  shippingZip: z.string().trim().min(5, "ZIP code is required").max(10),
});

type OnboardingState = 
  | 'loading' 
  | 'error' 
  | 'step1' 
  | 'step2' 
  | 'step3' 
  | 'complete';

const categories = [
  "Restaurant",
  "Cafe / Coffee Shop",
  "Bar / Brewery",
  "Food Truck",
  "Bakery",
  "Fast Casual",
  "Fine Dining",
  "Other",
];

const Onboarding = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  
  const [state, setState] = useState<OnboardingState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // User/Restaurant info from session verification
  const [userId, setUserId] = useState<string | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  
  // Step 1: Business basics
  const [step1Data, setStep1Data] = useState({
    businessName: "",
    city: "",
    state: "",
    category: "",
  });
  
  // Step 2: Review + Social setup
  const [selectedGooglePlace, setSelectedGooglePlace] = useState<{\
    placeId: string;
    name: string;
    address: string;
  } | null>(null);
  const [instagramUrl, setInstagramUrl] = useState("");
  const [yelpUrl, setYelpUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [step2Error, setStep2Error] = useState<string | null>(null);
  
  // Step 3: Shipping + Logo
  const [step3Data, setStep3Data] = useState({
    shippingName: "",
    shippingAddress: "",
    shippingCity: "",
    shippingState: "",
    shippingZip: "",
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [useUnbranded, setUseUnbranded] = useState(false);
  
  const restaurantIdRef = useRef<string | null>(null);

  // Verify session on mount
  useEffect(() => {
    const verifySession = async () => {
      if (!sessionId) {
        // No session ID - check if user is already authenticated
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Check for existing restaurant
          const { data: restaurant } = await supabase
            .from("restaurants")
            .select("id, subscription_status, onboarding_completed, onboarding_step, restaurant_name, address, google_place_id")
            .eq("owner_id", session.user.id)
            .maybeSingle();
          
          if (restaurant?.onboarding_completed) {
            navigate("/dashboard");
            return;
          }
          
          if (restaurant?.subscription_status === 'active') {
            setUserId(session.user.id);
            setRestaurantId(restaurant.id);
            restaurantIdRef.current = restaurant.id;
            setUserEmail(session.user.email || null);
            
            // Resume from saved step
            const savedStep = restaurant.onboarding_step || 1;
            setState(savedStep === 1 ? 'step1' : savedStep === 2 ? 'step2' : 'step3');
            
            // Pre-fill data if available
            if (restaurant.restaurant_name && restaurant.restaurant_name !== 'New Restaurant') {
              setStep1Data(prev => ({ ...prev, businessName: restaurant.restaurant_name }));
            }
            if (restaurant.google_place_id) {
              setSelectedGooglePlace({
                placeId: restaurant.google_place_id,
                name: restaurant.restaurant_name || '',
                address: restaurant.address || '',
              });
            }
            return;
          }
        }
        
        setError("No checkout session found. Please start from the beginning.");
        setState('error');
        return;
      }

      try {
        console.log('[Onboarding] Verifying session:', sessionId);
        
        const { data, error: fnError } = await supabase.functions.invoke('lookup-stripe-session', {
          body: { sessionId }
        });

        if (fnError || !data?.success) {
          console.error('[Onboarding] Session verification failed:', fnError || data?.error);
          setError(data?.error || 'Failed to verify payment. Please try again or contact support.');
          setState('error');
          return;
        }

        console.log('[Onboarding] Session verified:', data);
        
        setUserId(data.userId);
        setRestaurantId(data.restaurantId);
        restaurantIdRef.current = data.restaurantId;
        setUserEmail(data.email);
        setUserName(data.name);
        
        // Pre-fill name if available
        if (data.name) {
          setStep3Data(prev => ({ ...prev, shippingName: data.name }));
        }
        
        // Check onboarding state
        if (data.onboardingCompleted) {
          navigate("/dashboard");
          return;
        }
        
        // Resume from saved step
        const step = data.onboardingStep || 1;
        setState(step === 1 ? 'step1' : step === 2 ? 'step2' : 'step3');
        
      } catch (err) {
        console.error('[Onboarding] Error:', err);
        setError('Something went wrong. Please try again.');
        setState('error');
      }
    };

    verifySession();
  }, [sessionId, navigate]);

  // Keep ref in sync
  useEffect(() => {
    restaurantIdRef.current = restaurantId;
  }, [restaurantId]);

  const handleGooglePlaceSelected = useCallback(async ({ placeId, name, address }: { placeId: string; name: string; address: string }) => {
    const normalizedPlaceId = normalizeGooglePlaceId(placeId) || placeId.replace(/^places\//, '');
    setSelectedGooglePlace({ placeId: normalizedPlaceId, name, address });
    setStep2Error(null);
    
    // Also update business name if not set
    if (!step1Data.businessName) {
      setStep1Data(prev => ({ ...prev, businessName: name }));
    }
  }, [step1Data.businessName]);

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
    }
  };

  const saveStep1 = async () => {
    if (!restaurantIdRef.current) return false;
    
    try {
      const validated = step1Schema.parse(step1Data);
      
      // Generate slug from business name
      const slug = validated.businessName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 50);
      
      const { error } = await supabase
        .from("restaurants")
        .update({
          restaurant_name: validated.businessName,
          address: `${validated.city}, ${validated.state}`,
          type: validated.category.toLowerCase().replace(/\s+/g, '_'),
          custom_slug: slug,
          onboarding_step: 2,
        })
        .eq("id", restaurantIdRef.current);
      
      if (error) throw error;
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
      } else {
        toast.error("Failed to save. Please try again.");
      }
      return false;
    }
  };

  const saveStep2 = async () => {
    if (!restaurantIdRef.current) return false;
    
    if (!selectedGooglePlace?.placeId) {
      setStep2Error("Please search and select your business from Google.");
      return false;
    }
    
    try {
      const googleReviewUrl = buildGoogleReviewUrl(selectedGooglePlace.placeId);
      
      if (!googleReviewUrl) {
        setStep2Error("Invalid Google business selection. Please try again.");
        return false;
      }
      
      // Build directions URL
      const encodedAddress = encodeURIComponent(selectedGooglePlace.address || step1Data.city);
      const encodedName = encodeURIComponent(selectedGooglePlace.name || step1Data.businessName);
      const directionsUrl = `https://maps.apple.com/?q=${encodedName}&address=${encodedAddress}`;
      
      const { error } = await supabase
        .from("restaurants")
        .update({
          google_place_id: selectedGooglePlace.placeId,
          google_review_url: googleReviewUrl,
          directions_url: directionsUrl,
          instagram_url: instagramUrl || null,
          yelp_review_url: yelpUrl || null,
          onboarding_step: 3,
        })
        .eq("id", restaurantIdRef.current);
      
      if (error) throw error;
      setStep2Error(null);
      return true;
    } catch (err) {
      toast.error("Failed to save. Please try again.");
      return false;
    }
  };

  const saveStep3AndComplete = async () => {
    if (!restaurantIdRef.current || !userId) return false;
    
    try {
      const validated = step3Schema.parse(step3Data);
      
      // Upload logo if provided
      let logoUrl: string | null = null;
      if (logoFile && !useUnbranded) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${restaurantIdRef.current}/logo.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('restaurant-logos')
          .upload(fileName, logoFile, { upsert: true });
        
        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('restaurant-logos')
            .getPublicUrl(fileName);
          logoUrl = urlData.publicUrl;
        }
      }
      
      // Update restaurant
      const { error: restaurantError } = await supabase
        .from("restaurants")
        .update({
          logo_url: logoUrl,
          onboarding_step: 4,
          onboarding_completed: true,
        })
        .eq("id", restaurantIdRef.current);
      
      if (restaurantError) throw restaurantError;
      
      // Update fulfillment order with shipping info
      await supabase
        .from("fulfillment_orders")
        .update({
          shipping_name: validated.shippingName,
          shipping_address_line1: validated.shippingAddress,
          shipping_city: validated.shippingCity,
          shipping_state: validated.shippingState,
          shipping_postal_code: validated.shippingZip,
          shipping_country: 'US',
          status: 'ready_to_ship',
        })
        .eq("restaurant_id", restaurantIdRef.current);
      
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
      } else {
        toast.error("Failed to save. Please try again.");
      }
      return false;
    }
  };

  const handleNext = async () => {
    setIsSubmitting(true);
    
    try {
      if (state === 'step1') {
        const success = await saveStep1();
        if (success) setState('step2');
      } else if (state === 'step2') {
        const success = await saveStep2();
        if (success) setState('step3');
      } else if (state === 'step3') {
        const success = await saveStep3AndComplete();
        if (success) setState('complete');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (state === 'step2') setState('step1');
    else if (state === 'step3') setState('step2');
  };

  // Progress indicator
  const getStepNumber = () => {
    switch (state) {
      case 'step1': return 1;
      case 'step2': return 2;
      case 'step3': return 3;
      default: return 1;
    }
  };

  // Loading state
  if (state === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-6" />
          <h1 className="text-2xl font-bold mb-2">Setting up your TapAway trial…</h1>
          <p className="text-muted-foreground">This usually takes just a moment.</p>
        </div>
      </div>
    );
  }

  // Error state
  if (state === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-6" />
          <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <div className="flex flex-col gap-3">
            <Button onClick={() => window.location.reload()} variant="default" className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Button onClick={() => navigate('/start')} variant="outline" className="w-full">
              Start Over
            </Button>
            <a 
              href="mailto:support@tapaway.co" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Mail className="w-4 h-4 inline mr-1" />
              Contact Support
            </a>
          </div>
        </Card>
      </div>
    );
  }

  // Complete state
  if (state === 'complete') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center"
        >
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-primary" />
          </div>
          
          <h1 className="text-3xl font-black mb-2">You're all set 🎉</h1>
          <p className="text-muted-foreground text-lg mb-8">
            We're getting TapAway ready for your business.
          </p>
          
          <Card className="p-6 mb-8 text-left">
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Your free 30-day trial is active</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span>We're setting up your review + social hub</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Your NFC cards will ship in 1–2 business days</span>
              </li>
            </ul>
          </Card>
          
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">What happens next:</h3>
            <ol className="text-sm text-muted-foreground space-y-2 text-left">
              <li>1. We prepare your custom setup</li>
              <li>2. Your NFC cards ship within 1–2 business days</li>
              <li>3. We email you once everything is ready</li>
            </ol>
          </div>
          
          <p className="text-sm text-muted-foreground mt-8 mb-6">
            You don't need to do anything right now — we'll take care of the setup.
          </p>
          
          <Button onClick={() => navigate('/dashboard')} size="lg" className="w-full">
            Go to Dashboard
          </Button>
        </motion.div>
      </div>
    );
  }

  // Onboarding steps
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-xl mx-auto px-4 py-4 flex items-center justify-between">
          <span className="font-bold text-xl">TapAway</span>
          <span className="text-sm text-muted-foreground">Step {getStepNumber()} of 3</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="max-w-xl mx-auto px-4 py-4">
        <div className="flex gap-2">
          {[1, 2, 3].map((step) => (
            <div 
              key={step}
              className={`h-1 flex-1 rounded-full transition-colors ${
                step <= getStepNumber() ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 pb-12">
        {/* Step 1: Business Basics */}
        {state === 'step1' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div>
              <h1 className="text-2xl font-bold mb-2">Tell us about your business</h1>
              <p className="text-muted-foreground">We'll use this to set up your TapAway hub.</p>
            </div>

            <Card className="p-6 space-y-5">
              <div>
                <Label htmlFor="businessName">Business Name *</Label>
                <Input
                  id="businessName"
                  value={step1Data.businessName}
                  onChange={(e) => setStep1Data({ ...step1Data, businessName: e.target.value })}
                  placeholder="Taqueria Las Islas"
                  className="mt-1.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={step1Data.city}
                    onChange={(e) => setStep1Data({ ...step1Data, city: e.target.value })}
                    placeholder="San Diego"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    value={step1Data.state}
                    onChange={(e) => setStep1Data({ ...step1Data, state: e.target.value })}
                    placeholder="CA"
                    className="mt-1.5"
                  />
                </div>
              </div>

              <div>
                <Label>Business Category *</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setStep1Data({ ...step1Data, category: cat })}
                      className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                        step1Data.category === cat
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            <Button 
              onClick={handleNext} 
              disabled={isSubmitting} 
              className="w-full h-12"
            >
              {isSubmitting ? "Saving..." : "Continue"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        )}

        {/* Step 2: Review + Social Setup */}
        {state === 'step2' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div>
              <h1 className="text-2xl font-bold mb-2">Connect your review hub</h1>
              <p className="text-muted-foreground">Link your Google Business to start collecting reviews.</p>
            </div>

            <Card className="p-6 space-y-5">
              <div>
                <Label>Find Your Google Business *</Label>
                <p className="text-xs text-muted-foreground mb-2">Search for your business name and location</p>
                <GooglePlacesAutocomplete
                  onPlaceSelected={handleGooglePlaceSelected}
                  defaultValue={selectedGooglePlace?.name || step1Data.businessName}
                />
                {selectedGooglePlace && (
                  <div className="mt-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">{selectedGooglePlace.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{selectedGooglePlace.address}</p>
                  </div>
                )}
                {step2Error && (
                  <p className="text-sm text-destructive mt-2 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {step2Error}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="instagram">Instagram URL (optional)</Label>
                <Input
                  id="instagram"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  placeholder="https://instagram.com/yourbusiness"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="yelp">Yelp URL (optional)</Label>
                <Input
                  id="yelp"
                  value={yelpUrl}
                  onChange={(e) => setYelpUrl(e.target.value)}
                  placeholder="https://yelp.com/biz/yourbusiness"
                  className="mt-1.5"
                />
              </div>
            </Card>

            <div className="flex gap-3">
              <Button onClick={handleBack} variant="outline" className="flex-1">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button 
                onClick={handleNext} 
                disabled={isSubmitting} 
                className="flex-[2]"
              >
                {isSubmitting ? "Saving..." : "Continue"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Shipping + Logo */}
        {state === 'step3' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div>
              <h1 className="text-2xl font-bold mb-2">Where should we ship your cards?</h1>
              <p className="text-muted-foreground">We'll send your custom NFC cards to this address.</p>
            </div>

            <Card className="p-6 space-y-5">
              <div>
                <Label htmlFor="shippingName">Recipient Name *</Label>
                <Input
                  id="shippingName"
                  value={step3Data.shippingName}
                  onChange={(e) => setStep3Data({ ...step3Data, shippingName: e.target.value })}
                  placeholder="John Smith"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="shippingAddress">Street Address *</Label>
                <Input
                  id="shippingAddress"
                  value={step3Data.shippingAddress}
                  onChange={(e) => setStep3Data({ ...step3Data, shippingAddress: e.target.value })}
                  placeholder="123 Main St"
                  className="mt-1.5"
                />
              </div>

              <div className="grid grid-cols-6 gap-3">
                <div className="col-span-3">
                  <Label htmlFor="shippingCity">City *</Label>
                  <Input
                    id="shippingCity"
                    value={step3Data.shippingCity}
                    onChange={(e) => setStep3Data({ ...step3Data, shippingCity: e.target.value })}
                    placeholder="San Diego"
                    className="mt-1.5"
                  />
                </div>
                <div className="col-span-1">
                  <Label htmlFor="shippingState">State *</Label>
                  <Input
                    id="shippingState"
                    value={step3Data.shippingState}
                    onChange={(e) => setStep3Data({ ...step3Data, shippingState: e.target.value })}
                    placeholder="CA"
                    className="mt-1.5"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="shippingZip">ZIP *</Label>
                  <Input
                    id="shippingZip"
                    value={step3Data.shippingZip}
                    onChange={(e) => setStep3Data({ ...step3Data, shippingZip: e.target.value })}
                    placeholder="92101"
                    className="mt-1.5"
                  />
                </div>
              </div>
            </Card>

            <Card className="p-6 space-y-5">
              <div>
                <Label>Your Logo (optional)</Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Upload your logo to appear on your NFC cards and review hub.
                </p>
                
                {!useUnbranded && (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo preview" className="h-24 object-contain" />
                    ) : (
                      <div className="text-center">
                        <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground">Click to upload logo</span>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                  </label>
                )}
                
                <div className="flex items-center gap-2 mt-4">
                  <Checkbox
                    id="useUnbranded"
                    checked={useUnbranded}
                    onCheckedChange={(checked) => setUseUnbranded(checked === true)}
                  />
                  <Label htmlFor="useUnbranded" className="text-sm font-normal cursor-pointer">
                    Use unbranded cards instead
                  </Label>
                </div>
              </div>
            </Card>

            <div className="flex gap-3">
              <Button onClick={handleBack} variant="outline" className="flex-1">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button 
                onClick={handleNext} 
                disabled={isSubmitting} 
                className="flex-[2]"
              >
                {isSubmitting ? "Finishing setup..." : "Complete Setup"}
                <Check className="w-4 h-4 ml-2" />
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Cards ship in 1–2 business days • No charge today
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
