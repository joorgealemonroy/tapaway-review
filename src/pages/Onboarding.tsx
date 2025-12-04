import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Upload, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { z } from "zod";
import { urlValidationSchemas } from "@/lib/urlValidation";
import { GooglePlacesAutocomplete } from "@/components/GooglePlacesAutocomplete";
import { isGrandfatheredUser, isSuperAdmin } from "@/lib/grandfatheredUsers";

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
  
  // Separate state for selected Google place - completely decoupled from phone input
  const [selectedGooglePlace, setSelectedGooglePlace] = useState<{
    placeId: string;
    name: string;
    address: string;
  } | null>(null);
  const [googleSavedToDb, setGoogleSavedToDb] = useState(false);
  
  const { user } = useAuth();
  const navigate = useNavigate();

  // Form data - phone is now completely independent
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

  useEffect(() => {
    if (!user) {
      navigate("/auth?redirect=/onboarding");
      return;
    }

    // Super admin should never see onboarding - redirect to admin
    if (isSuperAdmin(user.email)) {
      console.log('[Onboarding] Super admin detected, redirecting to /admin');
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
        
        // Track if Google is already connected in DB
        if (restaurant.google_place_id) {
          setGoogleSavedToDb(true);
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
          console.log('[Onboarding] User already onboarded, redirecting to dashboard');
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

  // Memoized callback for Google place selection - saves immediately to DB
  const handleGooglePlaceSelected = useCallback(async ({ placeId, name, address }: { placeId: string; name: string; address: string }) => {
    console.log('[Onboarding] Google place selected:', { placeId, name, address });
    
    // Strip "places/" prefix for legacy compatibility
    const legacyPlaceId = placeId.replace(/^places\//, '');
    
    // Update local state immediately
    setSelectedGooglePlace({ placeId: legacyPlaceId, name, address });
    
    // Update form data for address and name (if not already set)
    setFormData(prev => ({
      ...prev,
      address: address || prev.address,
      restaurantName: prev.restaurantName || name || prev.restaurantName,
    }));

    // Immediately persist to database if we have a restaurant ID
    if (existingRestaurantId) {
      try {
        const googleReviewUrl = `https://search.google.com/local/writereview?placeid=${legacyPlaceId}`;
        
        // Build Apple Maps URL from address
        const encodedAddress = encodeURIComponent(address);
        const encodedName = encodeURIComponent(name);
        const directionsUrl = `https://maps.apple.com/?q=${encodedName}&address=${encodedAddress}`;
        
        const { error } = await supabase
          .from("restaurants")
          .update({
            google_place_id: legacyPlaceId,
            google_review_url: googleReviewUrl,
            address: address,
            directions_url: directionsUrl,
          })
          .eq("id", existingRestaurantId);

        if (error) {
          console.error('[Onboarding] Failed to save Google place:', error);
          toast.error("Failed to save Google business. Please try again.");
        } else {
          console.log('[Onboarding] Google place saved to DB:', legacyPlaceId);
          setGoogleSavedToDb(true);
          setFormData(prev => ({ ...prev, directionsUrl }));
          toast.success("Google Business connected!");
        }
      } catch (err) {
        console.error('[Onboarding] Error saving Google place:', err);
      }
    }
  }, [existingRestaurantId]);

  const handleNext = async () => {
    if (step === 1 && (!formData.restaurantName || !formData.ownerName || !formData.customSlug)) {
      toast.error("Please complete all required fields");
      return;
    }
    
    // On Step 2 completion, save phone to DB if we have a restaurant
    if (step === 2 && existingRestaurantId) {
      try {
        const updateData: Record<string, string | null> = {
          phone: formData.phone || null,
        };
        
        // Only update address if we have one and Google wasn't selected
        if (formData.address && !googleSavedToDb) {
          updateData.address = formData.address;
        }

        const { error } = await supabase
          .from("restaurants")
          .update(updateData)
          .eq("id", existingRestaurantId);

        if (error) {
          console.error('[Onboarding] Failed to save Step 2 data:', error);
        }
      } catch (err) {
        console.error('[Onboarding] Error saving Step 2:', err);
      }
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

      // Refresh the restaurant from DB to get the most current google_place_id
      let currentRestaurant = null;
      if (existingRestaurantId) {
        const { data } = await supabase
          .from("restaurants")
          .select("id, google_place_id, directions_url")
          .eq("id", existingRestaurantId)
          .maybeSingle();
        currentRestaurant = data;
      }

      // Use DB value if available, fall back to local state
      const placeId = currentRestaurant?.google_place_id || selectedGooglePlace?.placeId || null;

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
        google_review_url: placeId ? `https://search.google.com/local/writereview?placeid=${placeId}` : null,
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
        console.log('[Onboarding] Updating existing restaurant:', existingRestaurantId);
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
          console.log('[Onboarding] Found existing restaurant by owner_id:', userRestaurant.id);
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
          console.log('[Onboarding] Inserting new restaurant');
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
        console.log('[Onboarding] Attempting auto-detect Yelp for restaurant:', restaurantId);
        try {
          const { data: yelpData, error: yelpError } = await supabase.functions.invoke('auto-yelp-from-place', {
            body: { restaurantId }
          });

          if (yelpError) {
            console.log('[Onboarding] Yelp auto-detect failed (non-blocking):', yelpError);
            toast.info("Couldn't auto-find Yelp, you can add it later in Settings.");
          } else if (yelpData?.success && yelpData?.restaurant?.yelp_review_url) {
            console.log('[Onboarding] Auto-detected Yelp URL:', yelpData.restaurant.yelp_review_url);
            toast.success("Yelp page found automatically!");
          } else if (yelpData?.success === false) {
            console.log('[Onboarding] Yelp auto-detect returned no match');
            toast.info("Couldn't auto-find Yelp, you can add it later in Settings.");
          }
        } catch (error) {
          console.log('[Onboarding] Yelp auto-detect error (non-blocking):', error);
        }
      } else if (addYelp && !placeId) {
        toast.info("We'll add Yelp once you connect Google in Settings.");
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

  // Check if Google is connected (either saved to DB or selected locally)
  const isGoogleConnected = googleSavedToDb || !!selectedGooglePlace;

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
              <h2 className="text-2xl font-bold text-foreground mb-2">Contact & Location</h2>
              <p className="text-muted-foreground">Help customers find you</p>
            </div>

            <div className="space-y-4">
              <div>
                <GooglePlacesAutocomplete
                  onPlaceSelected={handleGooglePlaceSelected}
                  defaultValue={selectedGooglePlace?.address || ""}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Start typing to search your business, then select it from the dropdown
                </p>
                {isGoogleConnected && (
                  <div className="mt-2 p-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                    <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                      <Check className="w-3 h-3" /> 
                      Google Business connected: {selectedGooglePlace?.name || "Connected"}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="phone">Phone Number</Label>
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

              {/* Email is auto-filled from auth - show read-only info */}
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
              <h2 className="text-2xl font-bold text-foreground mb-2">Review Links</h2>
              <p className="text-muted-foreground">Additional review platforms</p>
            </div>

            <div className="space-y-4">
              {/* Google status - based on actual state */}
              {isGoogleConnected ? (
                <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm text-green-800 dark:text-green-200 flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    Google Business connected: {selectedGooglePlace?.name || "Connected"}
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    No Google Business selected yet. You can go back to Step 2 to add it, or continue without it.
                  </p>
                </div>
              )}

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
                    {isGoogleConnected
                      ? "We'll automatically find your Yelp page using your Google listing."
                      : "Connect Google first, then we can auto-detect your Yelp page."
                    }
                  </p>
                </div>
              </div>

              {/* Directions info */}
              {isGoogleConnected && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200 flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    Apple Maps directions will be auto-created from your Google address
                  </p>
                </div>
              )}
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
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Onboarding;
