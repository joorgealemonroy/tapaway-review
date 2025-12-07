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
      // Fetch ALL restaurants for this user (they may have multiple locations)
      const { data: restaurants } = await supabase
        .from("restaurants")
        .select("id, subscription_status, plan_type, custom_slug, restaurant_name, owner_name, address, phone, greeting_name, google_place_id, google_review_url, directions_url, instagram_url, onboarding_step, onboarding_completed")
        .eq("owner_id", user.id);

      // Grandfathered users bypass subscription check
      const isGrandfathered = isGrandfatheredUser(user.email);

      // Check if ANY restaurant has completed onboarding - if so, redirect to dashboard
      const completedRestaurant = restaurants?.find(r => r.onboarding_completed === true);
      if (completedRestaurant) {
        navigate("/dashboard");
        return;
      }

      // Check if ANY restaurant has active subscription
      let activeRestaurant = restaurants?.find(r => r.subscription_status === 'active');

      // FALLBACK: If no restaurant exists but we have a session_id, the webhook may have failed
      // Call verify-checkout to create the restaurant from the Stripe session
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('session_id');
      
      if (!activeRestaurant && sessionId && !isGrandfathered) {
        console.log('[Onboarding] No restaurant found but session_id present - calling verify-checkout fallback');
        
        try {
          const { data, error } = await supabase.functions.invoke('verify-checkout', {
            body: { sessionId, userId: user.id }
          });
          
          if (error) {
            console.error('[Onboarding] verify-checkout error:', error);
          } else if (data?.success && data?.restaurantId) {
            console.log('[Onboarding] verify-checkout created restaurant:', data.restaurantId);
            toast.success("Payment verified! Let's set up your account.");
            
            // Re-fetch restaurants after fallback creation
            const { data: refreshedRestaurants } = await supabase
              .from("restaurants")
              .select("id, subscription_status, plan_type, custom_slug, restaurant_name, owner_name, address, phone, greeting_name, google_place_id, google_review_url, directions_url, instagram_url, onboarding_step, onboarding_completed")
              .eq("owner_id", user.id);
            
            activeRestaurant = refreshedRestaurants?.find(r => r.subscription_status === 'active');
          }
        } catch (fallbackError) {
          console.error('[Onboarding] Fallback verify-checkout failed:', fallbackError);
        }
      }

      // If no active subscription and not grandfathered, send to paywall
      if (!isGrandfathered && !activeRestaurant) {
        navigate("/paywall");
        return;
      }

      // Use the first incomplete restaurant for onboarding, or the active one
      const restaurant = restaurants?.find(r => !r.onboarding_completed) || activeRestaurant;

      // If user has an existing restaurant (created by paywall), store its ID for update
      if (restaurant) {
        setExistingRestaurantId(restaurant.id);
        restaurantIdRef.current = restaurant.id;
        
        // Resume from saved step (default to 1)
        const savedStep = restaurant.onboarding_step || 1;
        setStep(savedStep);
        
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
          instagram: restaurant.instagram_url || prev.instagram,
        }));
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

  // Save Google place data to DB - this is the ONLY place we persist Google data
  const saveGooglePlaceToDb = async (placeId: string, name: string, address: string): Promise<boolean> => {
    const currentRestaurantId = restaurantIdRef.current;
    
    console.log('[Onboarding] saveGooglePlaceToDb called:', { 
      placeId, 
      name, 
      address, 
      currentRestaurantId,
      refValue: restaurantIdRef.current 
    });
    
    if (!currentRestaurantId) {
      console.warn('[Onboarding] No restaurant ID available yet - data will be saved on Next click');
      return false;
    }

    if (!placeId) {
      console.error('[Onboarding] No place ID provided');
      return false;
    }

    try {
      // Normalize the place ID (handle both "places/ChIJ..." and bare "ChIJ..." formats)
      const normalizedPlaceId = normalizeGooglePlaceId(placeId) || placeId.replace(/^places\//, '');
      const googleReviewUrl = buildGoogleReviewUrl(normalizedPlaceId);
      
      if (!googleReviewUrl) {
        console.error('[Onboarding] Could not build Google review URL from:', normalizedPlaceId);
        return false;
      }
      
      // Build Apple Maps URL from address
      let directionsUrl: string | null = null;
      if (address) {
        const encodedAddress = encodeURIComponent(address);
        const encodedName = encodeURIComponent(name || 'Business');
        directionsUrl = `https://maps.apple.com/?q=${encodedName}&address=${encodedAddress}`;
      }
      
      const updatePayload: Record<string, any> = {
        google_place_id: normalizedPlaceId,
        google_review_url: googleReviewUrl,
      };
      
      if (address) updatePayload.address = address;
      if (directionsUrl) updatePayload.directions_url = directionsUrl;
      
      console.log('[Onboarding] Saving Google data to restaurants:', {
        ...updatePayload,
        restaurant_id: currentRestaurantId
      });
      
      const { error } = await supabase
        .from("restaurants")
        .update(updatePayload)
        .eq("id", currentRestaurantId);

      if (error) {
        console.error('[Onboarding] Error saving Google place:', error);
        return false;
      }
      
      console.log('[Onboarding] Google place saved successfully!');
      
      // Update form data with the directions URL
      if (directionsUrl) {
        setFormData(prev => ({ ...prev, directionsUrl, address: address || prev.address }));
      }
      
      return true;
    } catch (err) {
      console.error('[Onboarding] Exception saving Google place:', err);
      return false;
    }
  };

  // Memoized callback for Google place selection - ONLY source of Google data from autocomplete
  const handleGooglePlaceSelected = useCallback(async ({ placeId, name, address }: { placeId: string; name: string; address: string }) => {
    console.log('[Onboarding] handleGooglePlaceSelected received from Google API:', { 
      placeId, 
      name, 
      address,
      hasRestaurantId: !!restaurantIdRef.current 
    });
    
    if (!placeId) {
      console.error('[Onboarding] handleGooglePlaceSelected called with empty placeId');
      setStep2Error('Invalid place selected. Please try again.');
      return;
    }
    
    // Normalize the place ID immediately
    const normalizedPlaceId = normalizeGooglePlaceId(placeId) || placeId.replace(/^places\//, '');
    
    console.log('[Onboarding] Normalized place ID:', normalizedPlaceId);
    
    // Update local state immediately - this is our source of truth until saved
    setSelectedGooglePlace({ placeId: normalizedPlaceId, name, address });
    setStep2Error(null);
    setManualGoogleInput(""); // Clear manual input since we have autocomplete selection
    
    // Update form data with name/address from Google
    setFormData(prev => ({
      ...prev,
      address: address || prev.address,
      restaurantName: prev.restaurantName || name || '',
    }));

    // Try to save to DB immediately if we have a restaurant ID
    if (restaurantIdRef.current) {
      const saved = await saveGooglePlaceToDb(normalizedPlaceId, name, address);
      if (saved) {
        toast.success("Google Business connected!");
      } else {
        // Not a fatal error - will try again on Next click
        console.log('[Onboarding] Could not save immediately, will save on Next');
      }
    } else {
      console.log('[Onboarding] No restaurant ID yet - will save Google data on Next click');
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
    // Step 1 validation and save
    if (step === 1) {
      if (!formData.restaurantName || !formData.ownerName || !formData.customSlug) {
        toast.error("Please complete all required fields");
        return;
      }
      
      // Save Step 1 data to DB
      if (restaurantIdRef.current) {
        const { error } = await supabase
          .from("restaurants")
          .update({
            restaurant_name: formData.restaurantName,
            owner_name: formData.ownerName,
            greeting_name: formData.ownerName,
            custom_slug: formData.customSlug.toLowerCase().trim(),
            instagram_url: formData.instagram || null,
            onboarding_step: 2, // Save progress
          })
          .eq("id", restaurantIdRef.current);
        
        if (error) {
          console.error('[Onboarding] Failed to save Step 1:', error);
          toast.error("Failed to save. Please try again.");
          return;
        }
        console.log('[Onboarding] Step 1 saved, moving to step 2');
      }
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
      
      // Save to DB
      if (restaurantIdRef.current) {
        try {
          // Build directions URL
          const encodedAddress = encodeURIComponent(selection.address || formData.address || "");
          const encodedName = encodeURIComponent(selection.name || formData.restaurantName);
          const directionsUrl = `https://maps.apple.com/?q=${encodedName}&address=${encodedAddress}`;
          
          console.log('[Onboarding] Step 2 saving to DB:', {
            google_place_id: normalizedPlaceId,
            google_review_url: googleReviewUrl,
            address: selection.address || formData.address,
            directions_url: directionsUrl,
            phone: formData.phone,
            restaurant_id: restaurantIdRef.current
          });
          
          const { error } = await supabase
            .from("restaurants")
            .update({
              google_place_id: normalizedPlaceId,
              google_review_url: googleReviewUrl,
              phone: formData.phone || null,
              address: selection.address || formData.address || null,
              directions_url: directionsUrl,
              onboarding_step: 3, // Save progress
            })
            .eq("id", restaurantIdRef.current);

          if (error) {
            console.error('[Onboarding] Failed to save Step 2 data:', error);
            setStep2Error("There was a problem saving your Google business. Please try again.");
            return;
          }
          
          // VERIFY the save by reading back the data
          const { data: verifyData, error: verifyError } = await supabase
            .from("restaurants")
            .select("id, google_place_id, google_review_url")
            .eq("id", restaurantIdRef.current)
            .single();
          
          if (verifyError || !verifyData?.google_place_id || !verifyData?.google_review_url) {
            console.error('[Onboarding] Verification failed:', { verifyError, verifyData });
            setStep2Error("Failed to verify Google connection. Please try again.");
            return;
          }
          
          console.log('[Onboarding] Step 2 save VERIFIED:', verifyData);
          
          // Update local state to match what we saved
          setSelectedGooglePlace({
            placeId: normalizedPlaceId,
            name: selection.name,
            address: selection.address
          });
          
          setFormData(prev => ({ ...prev, directionsUrl }));
          
        } catch (err) {
          console.error('[Onboarding] Error saving Step 2:', err);
          setStep2Error("Failed to save. Please try again.");
          return;
        }
      } else {
        console.error('[Onboarding] No restaurant ID available for Step 2 save');
        setStep2Error("Setup error - no restaurant found. Please refresh and try again.");
        return;
      }
      
      setStep2Error(null);
    }
    
    // Step 3 - just save progress (Yelp checkbox preference)
    if (step === 3 && restaurantIdRef.current) {
      await supabase
        .from("restaurants")
        .update({ onboarding_step: 4 })
        .eq("id", restaurantIdRef.current);
      console.log('[Onboarding] Step 3 saved, moving to step 4');
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
        onboarding_completed: true, // Mark as complete
        onboarding_step: 4, // Final step
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

      // Call finalize-onboarding to send emails and update fulfillment status
      // CRITICAL: We await this to ensure emails are sent before redirecting
      if (restaurantId) {
        try {
          console.log('[Onboarding] Calling finalize-onboarding for restaurant:', restaurantId);
          const { data: finalizeResult, error: finalizeError } = await supabase.functions.invoke('finalize-onboarding', {
            body: { restaurantId }
          });
          
          if (finalizeError) {
            console.error('[Onboarding] finalize-onboarding error:', finalizeError);
            // Still continue to dashboard, but log the error
          } else {
            console.log('[Onboarding] finalize-onboarding result:', finalizeResult);
            
            // Warn if emails weren't sent
            if (finalizeResult && !finalizeResult.customerEmailSent) {
              console.warn('[Onboarding] WARNING: Customer email was NOT sent!');
            }
            if (finalizeResult && !finalizeResult.internalEmailSent) {
              console.warn('[Onboarding] WARNING: Internal notification was NOT sent!');
            }
            if (finalizeResult && !finalizeResult.hasShippingAddress) {
              console.warn('[Onboarding] WARNING: No shipping address on file!');
            }
          }
        } catch (finalizeErr) {
          console.error('[Onboarding] finalize-onboarding exception:', finalizeErr);
          // Still continue to dashboard even if this fails
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
