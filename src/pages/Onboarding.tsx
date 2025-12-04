import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Upload, ArrowRight, ArrowLeft, Check, AlertCircle } from "lucide-react";
import { z } from "zod";
import { urlValidationSchemas } from "@/lib/urlValidation";
import { GooglePlacesAutocomplete } from "@/components/GooglePlacesAutocomplete";
import { isGrandfatheredUser, isSuperAdmin } from "@/lib/grandfatheredUsers";
import { normalizeGooglePlaceId, buildGoogleReviewUrl } from "@/lib/google";

const onboardingSchema = z.object({
  restaurantName: z.string().trim().min(1, "Restaurant name is required").max(100),
  ownerName: z.string().trim().min(1, "Owner/contact name is required").max(100),
  customSlug: z.string().trim().min(1, "Custom URL is required").max(50).regex(/^[a-z0-9-]+$/, "Custom URL must contain only lowercase letters, numbers, and hyphens"),
  instagram: urlValidationSchemas.instagram,
  directionsUrl: urlValidationSchemas.directions,
  address: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(20).optional(),
  headerTitle: z.string().trim().max(100).optional(),
  headerSubtitle: z.string().trim().max(200).optional(),
  menuTitle: z.string().trim().max(50).optional(),
});

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [addYelp, setAddYelp] = useState(true);
  const [existingRestaurantId, setExistingRestaurantId] = useState<string | null>(null);
  
  // Use ref to always have the latest restaurantId in callbacks
  const restaurantIdRef = useRef<string | null>(null);
  
  // Selected Google place - single source of truth for Google connection
  const [selectedGooglePlace, setSelectedGooglePlace] = useState<{
    placeId: string;
    name: string;
    address: string;
  } | null>(null);
  
  // Step 2 validation error
  const [step2Error, setStep2Error] = useState<string | null>(null);
  
  // Manual Google input for edge cases
  const [manualGoogleInput, setManualGoogleInput] = useState("");
  
  const { user } = useAuth();
  const navigate = useNavigate();

  // Form data - phone is completely independent from Google selection
  const [formData, setFormData] = useState({
    restaurantName: "",
    ownerName: "",
    customSlug: "",
    instagram: "",
    directionsUrl: "",
    address: "",
    phone: "",
    headerTitle: "How was your visit?",
    headerSubtitle: "We'd love to hear about your experience!",
    menuTitle: "Our Menu",
  });

  // Keep ref in sync with state
  useEffect(() => {
    restaurantIdRef.current = existingRestaurantId;
  }, [existingRestaurantId]);

  useEffect(() => {
    if (!user) {
      navigate("/auth?redirect=/onboarding");
      return;
    }

    // Super admin should never see onboarding - redirect to admin
    if (isSuperAdmin(user.email)) {
      navigate("/admin");
      return;
    }

    // Check if user has an active subscription and if they're already fully onboarded
    const checkOnboardingStatus = async () => {
      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("id, subscription_status, plan_type, custom_slug, restaurant_name, owner_name, address, phone, greeting_name, google_place_id, google_review_url, directions_url")
        .eq("owner_id", user.id)
        .maybeSingle();

      // Grandfathered users bypass subscription check
      const isGrandfathered = isGrandfatheredUser(user.email);

      // If no active subscription and not grandfathered, send to paywall
      if (!isGrandfathered && (!restaurant || !restaurant.subscription_status || restaurant.subscription_status !== 'active')) {
        navigate("/paywall");
        return;
      }

      // If user has an existing restaurant (created by paywall), store its ID for update
      if (restaurant) {
        setExistingRestaurantId(restaurant.id);
        restaurantIdRef.current = restaurant.id;
        
        // Track if Google is already connected in DB
        if (restaurant.google_place_id) {
          setSelectedGooglePlace({
            placeId: restaurant.google_place_id,
            name: restaurant.restaurant_name || "",
            address: restaurant.address || "",
          });
        }
        
        // Pre-fill form with any existing data
        setFormData(prev => ({
          ...prev,
          restaurantName: (restaurant.restaurant_name && restaurant.restaurant_name !== "New Restaurant") ? restaurant.restaurant_name : prev.restaurantName,
          ownerName: restaurant.owner_name || restaurant.greeting_name || prev.ownerName,
          address: restaurant.address || prev.address,
          phone: restaurant.phone || prev.phone,
          directionsUrl: restaurant.directions_url || prev.directionsUrl,
        }));
        
        // If user already has a fully configured restaurant (has slug and name), redirect to dashboard
        if (restaurant.custom_slug && restaurant.restaurant_name && restaurant.restaurant_name !== "New Restaurant") {
          navigate("/dashboard");
        }
      }
    };

    checkOnboardingStatus();
  }, [user, navigate]);

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

  // Phone handler is completely separate - won't affect Google selection
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
    setFormData((prev) => ({ ...prev, phone: formatted }));
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Save Google place data to DB
  const saveGooglePlaceToDb = async (placeId: string, name: string, address: string) => {
    const currentRestaurantId = restaurantIdRef.current;
    
    console.log('[Onboarding] saveGooglePlaceToDb called:', { placeId, name, address, currentRestaurantId });
    
    if (!currentRestaurantId) {
      console.warn('[Onboarding] No restaurant ID available - will save on Next click');
      return false;
    }

    try {
      const normalizedPlaceId = normalizeGooglePlaceId(placeId) || placeId.replace(/^places\//, '');
      const googleReviewUrl = buildGoogleReviewUrl(normalizedPlaceId);
      
      // Build Apple Maps URL from address
      const encodedAddress = encodeURIComponent(address);
      const encodedName = encodeURIComponent(name);
      const directionsUrl = `https://maps.apple.com/?q=${encodedName}&address=${encodedAddress}`;
      
      console.log('[Onboarding] Saving Google data:', {
        google_place_id: normalizedPlaceId,
        google_review_url: googleReviewUrl,
        address,
        directions_url: directionsUrl,
        restaurant_id: currentRestaurantId
      });
      
      const { error } = await supabase
        .from("restaurants")
        .update({
          google_place_id: normalizedPlaceId,
          google_review_url: googleReviewUrl,
          address: address,
          directions_url: directionsUrl,
        })
        .eq("id", currentRestaurantId);

      if (error) {
        console.error('[Onboarding] Error saving Google place:', error);
        return false;
      }
      
      console.log('[Onboarding] Google place saved successfully!');
      setFormData(prev => ({ ...prev, directionsUrl, address }));
      return true;
    } catch (err) {
      console.error('[Onboarding] Exception saving Google place:', err);
      return false;
    }
  };

  // Memoized callback for Google place selection
  const handleGooglePlaceSelected = useCallback(async ({ placeId, name, address }: { placeId: string; name: string; address: string }) => {
    console.log('[Onboarding] handleGooglePlaceSelected called:', { placeId, name, address });
    
    // Normalize the place ID
    const normalizedPlaceId = normalizeGooglePlaceId(placeId) || placeId.replace(/^places\//, '');
    
    // Update local state immediately
    setSelectedGooglePlace({ placeId: normalizedPlaceId, name, address });
    setStep2Error(null); // Clear any error
    setManualGoogleInput(""); // Clear manual input since we have autocomplete selection
    
    // Update form data
    setFormData(prev => ({
      ...prev,
      address: address || prev.address,
      restaurantName: prev.restaurantName || name || prev.restaurantName,
    }));

    // Try to save to DB immediately
    const saved = await saveGooglePlaceToDb(normalizedPlaceId, name, address);
    if (saved) {
      toast.success("Google Business connected!");
    }
  }, []);

  // Compute if we have a valid Google selection
  const computeGoogleSelection = (): { source: 'place' | 'manual'; placeId: string; name: string; address: string } | null => {
    // Priority 1: Autocomplete selection
    if (selectedGooglePlace && selectedGooglePlace.placeId) {
      return {
        source: 'place',
        placeId: selectedGooglePlace.placeId,
        name: selectedGooglePlace.name,
        address: selectedGooglePlace.address
      };
    }
    
    // Priority 2: Manual input (URL or bare Place ID)
    if (manualGoogleInput.trim()) {
      const normalized = normalizeGooglePlaceId(manualGoogleInput.trim());
      if (normalized) {
        return {
          source: 'manual',
          placeId: normalized,
          name: formData.restaurantName || "Business",
          address: formData.address || ""
        };
      }
    }
    
    return null;
  };

  const handleNext = async () => {
    // Step 1 validation
    if (step === 1 && (!formData.restaurantName || !formData.ownerName || !formData.customSlug)) {
      toast.error("Please complete all required fields");
      return;
    }
    
    // Step 2 validation - GOOGLE IS MANDATORY
    if (step === 2) {
      const selection = computeGoogleSelection();
      
      if (!selection) {
        setStep2Error("Please search and select your business from Google to continue.");
        return;
      }
      
      // Validate the selection
      const normalizedPlaceId = normalizeGooglePlaceId(selection.placeId);
      const googleReviewUrl = buildGoogleReviewUrl(normalizedPlaceId);
      
      if (!normalizedPlaceId || !googleReviewUrl) {
        setStep2Error("The Google link/ID you provided is invalid. Please try again.");
        return;
      }
      
      // Save to DB if not already saved
      if (restaurantIdRef.current) {
        try {
          const { error } = await supabase
            .from("restaurants")
            .update({
              google_place_id: normalizedPlaceId,
              google_review_url: googleReviewUrl,
              phone: formData.phone || null,
              address: selection.address || formData.address || null,
            })
            .eq("id", restaurantIdRef.current);

          if (error) {
            console.error('[Onboarding] Failed to save Step 2 data:', error);
            setStep2Error("There was a problem saving your Google business. Please try again.");
            return;
          }
          
          // Update local state to match what we saved
          setSelectedGooglePlace({
            placeId: normalizedPlaceId,
            name: selection.name,
            address: selection.address
          });
          
          // Build directions URL
          const encodedAddress = encodeURIComponent(selection.address || formData.address || "");
          const encodedName = encodeURIComponent(selection.name || formData.restaurantName);
          const directionsUrl = `https://maps.apple.com/?q=${encodedName}&address=${encodedAddress}`;
          
          await supabase
            .from("restaurants")
            .update({ directions_url: directionsUrl })
            .eq("id", restaurantIdRef.current);
            
          setFormData(prev => ({ ...prev, directionsUrl }));
          
        } catch (err) {
          console.error('[Onboarding] Error saving Step 2:', err);
          setStep2Error("Failed to save. Please try again.");
          return;
        }
      }
      
      setStep2Error(null);
    }
    
    setStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Validate and transform form data first
      let validatedData;
      try {
        validatedData = onboardingSchema.parse(formData);
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          toast.error(validationError.errors[0].message);
          setIsLoading(false);
          return;
        }
      }

      // CRITICAL: Verify Google is connected before allowing completion
      // Refresh the restaurant from DB to get the most current google_place_id
      let currentRestaurant = null;
      if (existingRestaurantId) {
        const { data } = await supabase
          .from("restaurants")
          .select("id, google_place_id, google_review_url, directions_url")
          .eq("id", existingRestaurantId)
          .maybeSingle();
        currentRestaurant = data;
      }

      // Check if Google is connected
      const hasGoogleInDb = currentRestaurant?.google_place_id && currentRestaurant?.google_review_url;
      const hasGoogleInState = selectedGooglePlace?.placeId;
      
      if (!hasGoogleInDb && !hasGoogleInState) {
        toast.error("You must connect your Google Business before finishing setup. Please go back to Step 2.");
        setIsLoading(false);
        return;
      }

      // Use DB value if available, fall back to local state
      const placeId = currentRestaurant?.google_place_id || selectedGooglePlace?.placeId || null;

      // Check slug uniqueness (excluding current user's restaurant)
      const slugToUse = validatedData.customSlug.toLowerCase().trim();
      
      const { data: existingSlugRestaurant, error: slugCheckError } = await supabase
        .from("restaurants")
        .select("id, owner_id")
        .eq("custom_slug", slugToUse)
        .maybeSingle();

      if (slugCheckError && slugCheckError.code !== "PGRST116") {
        console.error("[Onboarding] Error checking slug uniqueness:", slugCheckError);
        toast.error("Failed to verify URL availability. Please try again.");
        setIsLoading(false);
        return;
      }

      // If slug exists and belongs to someone else, block
      if (existingSlugRestaurant && existingSlugRestaurant.owner_id !== user.id) {
        toast.error(`The custom link (tapaway.co/${slugToUse}) is already taken. Please choose a unique name.`);
        setIsLoading(false);
        return;
      }

      // Auto-generate Apple Maps URL from address if not already set
      let directionsUrl = currentRestaurant?.directions_url || validatedData.directionsUrl || '';
      if (!directionsUrl && (selectedGooglePlace?.address || validatedData.address)) {
        const addr = selectedGooglePlace?.address || validatedData.address || '';
        const name = selectedGooglePlace?.name || validatedData.restaurantName;
        const encodedAddress = encodeURIComponent(addr);
        const encodedName = encodeURIComponent(name);
        directionsUrl = `https://maps.apple.com/?q=${encodedName}&address=${encodedAddress}`;
      }

      // Build restaurant data - use auth email as contact email
      const restaurantData = {
        owner_id: user.id,
        restaurant_name: validatedData.restaurantName,
        owner_name: validatedData.ownerName,
        greeting_name: validatedData.ownerName,
        custom_slug: slugToUse,
        slug_locked_at: new Date().toISOString(),
        instagram_url: validatedData.instagram || null,
        google_review_url: placeId ? buildGoogleReviewUrl(placeId) : null,
        google_place_id: placeId || null,
        directions_url: directionsUrl || null,
        address: selectedGooglePlace?.address || validatedData.address || null,
        phone: validatedData.phone || null,
        email: user.email || null,
        header_title: validatedData.headerTitle || "How was your visit?",
        header_subtitle: validatedData.headerSubtitle || "We'd love to hear about your experience!",
        menu_title: validatedData.menuTitle || "Our Menu",
      };

      let restaurantId: string | null = existingRestaurantId;

      // Always try UPDATE first if we have an existing restaurant ID
      if (existingRestaurantId) {
        const { error: updateError } = await supabase
          .from("restaurants")
          .update(restaurantData)
          .eq("id", existingRestaurantId)
          .eq("owner_id", user.id);

        if (updateError) {
          console.error('[Onboarding] Update error:', updateError);
          if ((updateError as any).code === "23505") {
            toast.error(`The custom link (tapaway.co/${slugToUse}) is already taken. Please choose a unique name.`);
            setIsLoading(false);
            return;
          }
          throw updateError;
        }
      } else {
        // No existing restaurant - try to find one by owner_id first
        const { data: userRestaurant } = await supabase
          .from("restaurants")
          .select("id")
          .eq("owner_id", user.id)
          .maybeSingle();

        if (userRestaurant) {
          restaurantId = userRestaurant.id;
          const { error: updateError } = await supabase
            .from("restaurants")
            .update(restaurantData)
            .eq("id", userRestaurant.id);

          if (updateError) {
            console.error('[Onboarding] Update error:', updateError);
            throw updateError;
          }
        } else {
          const { data: newRestaurant, error: insertError } = await supabase
            .from("restaurants")
            .insert(restaurantData)
            .select("id")
            .single();

          if (insertError) {
            console.error('[Onboarding] Insert error:', insertError);
            if ((insertError as any).code === "23505") {
              toast.error(`The custom link (tapaway.co/${slugToUse}) is already taken. Please choose a unique name.`);
              setIsLoading(false);
              return;
            }
            throw insertError;
          }
          restaurantId = newRestaurant?.id || null;
        }
      }

      // Upload logo AFTER we have a restaurant ID (use restaurant ID as folder name)
      if (logoFile && restaurantId) {
        try {
          const fileExt = logoFile.name.split(".").pop();
          const fileName = `${restaurantId}/logo.${fileExt}`;
          const { error: uploadError } = await supabase.storage
            .from("restaurant-logos")
            .upload(fileName, logoFile, { upsert: true });

          if (uploadError) {
            console.error('[Onboarding] Logo upload error:', uploadError);
            // Don't block onboarding for logo upload failure
          } else {
            const { data: urlData } = supabase.storage
              .from("restaurant-logos")
              .getPublicUrl(fileName);
            
            // Update restaurant with logo URL
            await supabase
              .from("restaurants")
              .update({ logo_url: urlData.publicUrl })
              .eq("id", restaurantId);
          }
        } catch (logoError) {
          console.error('[Onboarding] Logo upload failed:', logoError);
          // Continue without logo
        }
      }

      // Auto-detect Yelp if checkbox is checked and we have a Google Place ID
      if (addYelp && placeId && restaurantId) {
        try {
          const { data: yelpData, error: yelpError } = await supabase.functions.invoke('auto-yelp-from-place', {
            body: { restaurantId }
          });

          if (yelpError) {
            toast.info("Couldn't auto-find Yelp, you can add it later in Settings.");
          } else if (yelpData?.success && yelpData?.restaurant?.yelp_review_url) {
            toast.success("Yelp page found automatically!");
          } else if (yelpData?.success === false) {
            toast.info("Couldn't auto-find Yelp, you can add it later in Settings.");
          }
        } catch (error) {
          // Non-blocking - just log it
          console.log('[Onboarding] Yelp auto-detect error (non-blocking):', error);
        }
      }

      toast.success("Restaurant setup complete!");
      navigate("/dashboard");
    } catch (error: any) {
      console.error('[Onboarding] Submit error:', error);
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        const errorMessage = error?.message || "Failed to complete setup. Please try again.";
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Check if Google is connected
  const isGoogleConnected = !!selectedGooglePlace || !!manualGoogleInput.trim();

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Basic Information</h2>
              <p className="text-muted-foreground">Let's start with the essentials</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="restaurantName">Restaurant Name *</Label>
                <Input
                  id="restaurantName"
                  value={formData.restaurantName}
                  onChange={(e) => handleInputChange("restaurantName", e.target.value)}
                  placeholder="Your Restaurant Name"
                  maxLength={100}
                />
              </div>

              <div>
                <Label htmlFor="ownerName">Owner / Contact Name *</Label>
                <Input
                  id="ownerName"
                  value={formData.ownerName}
                  onChange={(e) => handleInputChange("ownerName", e.target.value)}
                  placeholder="Your Name"
                  maxLength={100}
                />
              </div>

              <div>
                <Label htmlFor="customSlug">Custom Page URL *</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">tapaway.co/</span>
                  <Input
                    id="customSlug"
                    value={formData.customSlug}
                    onChange={(e) => {
                      const slug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                      handleInputChange("customSlug", slug);
                    }}
                    placeholder="your-restaurant"
                    maxLength={50}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  This will be your unique review page URL
                </p>
              </div>

              <div>
                <Label htmlFor="logo">Restaurant Logo</Label>
                <div className="mt-2">
                  {logoPreview ? (
                    <div className="relative w-32 h-32 border-2 border-border rounded-lg overflow-hidden">
                      <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          setLogoFile(null);
                          setLogoPreview(null);
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors">
                      <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">Upload</span>
                      <input
                        type="file"
                        id="logo"
                        className="hidden"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={handleLogoChange}
                      />
                    </label>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Max 2MB. JPG, PNG, WEBP, or GIF</p>
              </div>

              <div>
                <Label htmlFor="instagram">Instagram Handle</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">@</span>
                  <Input
                    id="instagram"
                    value={formData.instagram}
                    onChange={(e) => handleInputChange("instagram", e.target.value)}
                    placeholder="yourrestaurant"
                    maxLength={50}
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Search Your Business on Google *</h2>
              <p className="text-muted-foreground">This is required to set up your review hub</p>
            </div>

            <div className="space-y-4">
              {/* Google Places Autocomplete */}
              <div>
                <GooglePlacesAutocomplete
                  onPlaceSelected={handleGooglePlaceSelected}
                  defaultValue={selectedGooglePlace?.address || ""}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Start typing to search your business, then select it from the dropdown
                </p>
                
                {/* Success state */}
                {selectedGooglePlace && (
                  <div className="mt-2 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
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
              </div>

              {/* Manual input fallback */}
              {!selectedGooglePlace && (
                <div className="pt-4 border-t border-border">
                  <Label htmlFor="manualGoogle" className="text-sm">
                    Or paste your Google Review URL / Place ID
                  </Label>
                  <Input
                    id="manualGoogle"
                    value={manualGoogleInput}
                    onChange={(e) => {
                      setManualGoogleInput(e.target.value);
                      setStep2Error(null);
                    }}
                    placeholder="https://search.google.com/local/writereview?placeid=... or ChIJ..."
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Can't find your business? Paste your Google Review URL or Place ID directly.
                  </p>
                </div>
              )}

              {/* Error message */}
              {step2Error && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                  <p className="text-sm text-destructive flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {step2Error}
                  </p>
                </div>
              )}

              {/* Phone number - secondary */}
              <div className="pt-4 border-t border-border">
                <Label htmlFor="phone">Phone Number (optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="(555) 123-4567"
                  maxLength={14}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter 10 digits (auto-formatted)
                </p>
              </div>

              {/* Email info */}
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Contact email:</span>{" "}
                  <span className="text-foreground">{user?.email}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  We'll use your account email. You can change this later in Settings.
                </p>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Review Platforms</h2>
              <p className="text-muted-foreground">Set up your review collection</p>
            </div>

            <div className="space-y-4">
              {/* Google status - always show positive since it's mandatory */}
              <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm text-green-800 dark:text-green-200 flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Google Business connected: {selectedGooglePlace?.name || "Connected"}
                </p>
              </div>

              {/* Yelp checkbox - auto-detect */}
              <div className="flex items-start space-x-3 p-4 border border-border rounded-lg">
                <Checkbox
                  id="addYelp"
                  checked={addYelp}
                  onCheckedChange={(checked) => setAddYelp(checked === true)}
                />
                <div className="space-y-1">
                  <Label htmlFor="addYelp" className="text-base font-medium cursor-pointer">
                    Add Yelp (recommended)
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    We'll automatically find your Yelp page using your Google listing.
                  </p>
                </div>
              </div>

              {/* Directions info */}
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200 flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Apple Maps directions will be auto-created from your address
                </p>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Customize Messages</h2>
              <p className="text-muted-foreground">Personalize your customer experience</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="headerTitle">Review Page Header</Label>
                <Input
                  id="headerTitle"
                  value={formData.headerTitle}
                  onChange={(e) => handleInputChange("headerTitle", e.target.value)}
                  placeholder="How was your visit?"
                  maxLength={100}
                />
              </div>

              <div>
                <Label htmlFor="headerSubtitle">Review Page Subtitle</Label>
                <Input
                  id="headerSubtitle"
                  value={formData.headerSubtitle}
                  onChange={(e) => handleInputChange("headerSubtitle", e.target.value)}
                  placeholder="We'd love to hear about your experience!"
                  maxLength={200}
                />
              </div>

              <div>
                <Label htmlFor="menuTitle">Menu Section Title</Label>
                <Input
                  id="menuTitle"
                  value={formData.menuTitle}
                  onChange={(e) => handleInputChange("menuTitle", e.target.value)}
                  placeholder="Our Menu"
                  maxLength={50}
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-8">
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-lg bg-gradient-primary"></div>
            <span className="text-2xl font-bold">TapAway</span>
          </div>
          
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    i <= step
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i < step ? <Check className="w-4 h-4" /> : i}
                </div>
                {i < 4 && (
                  <div
                    className={`h-0.5 w-16 ${
                      i < step ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {renderStep()}

        <div className="flex justify-between mt-8">
          {step > 1 ? (
            <Button variant="outline" onClick={handleBack} disabled={isLoading}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <Button onClick={handleNext} disabled={isLoading}>
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? "Setting up..." : "Complete Setup"}
              <Check className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Onboarding;
