import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { z } from "zod";
import { urlValidationSchemas } from "@/lib/urlValidation";
import { GooglePlacesAutocomplete } from "@/components/GooglePlacesAutocomplete";

const onboardingSchema = z.object({
  restaurantName: z.string().trim().min(1, "Restaurant name is required").max(100),
  ownerName: z.string().trim().min(1, "Owner/contact name is required").max(100),
  customSlug: z.string().trim().min(1, "Custom URL is required").max(50).regex(/^[a-z0-9-]+$/, "Custom URL must contain only lowercase letters, numbers, and hyphens"),
  instagram: urlValidationSchemas.instagram,
  googlePlaceId: z.string().trim().optional(),
  yelpUrl: urlValidationSchemas.yelp,
  directionsUrl: urlValidationSchemas.directions,
  address: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(20).optional(),
  email: z.string().email("Please enter a valid email").optional().or(z.literal("")),
  headerTitle: z.string().trim().max(100).optional(),
  headerSubtitle: z.string().trim().max(200).optional(),
  menuTitle: z.string().trim().max(50).optional(),
});

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    restaurantName: "",
    ownerName: "",
    customSlug: "",
    instagram: "",
    googlePlaceId: "",
    yelpUrl: "",
    directionsUrl: "",
    address: "",
    phone: "",
    email: "",
    headerTitle: "How was your visit?",
    headerSubtitle: "We'd love to hear about your experience!",
    menuTitle: "Our Menu",
  });

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    // Check if user has an active subscription, if not redirect to paywall
    const checkSubscription = async () => {
      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("subscription_status, plan_type")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (!restaurant || !restaurant.subscription_status || restaurant.subscription_status !== 'active') {
        navigate("/paywall");
      }
    };

    checkSubscription();
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

  const handleInputChange = (field: string, value: string) => {
    // Format phone number as user types
    if (field === "phone") {
      const digits = value.replace(/\D/g, "").slice(0, 10);
      if (digits.length <= 10) {
        let formatted = digits;
        if (digits.length > 6) {
          formatted = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
        } else if (digits.length > 3) {
          formatted = `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
        } else if (digits.length > 0) {
          formatted = `(${digits}`;
        }
        setFormData((prev) => ({ ...prev, [field]: formatted }));
        return;
      }
      return;
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (step === 1 && (!formData.restaurantName || !formData.ownerName || !formData.customSlug)) {
      toast.error("Please complete all required fields");
      return;
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

      // Lookup Google Place ID server-side if address is provided
      let placeId = formData.googlePlaceId;
      if (validatedData.address && !placeId) {
        console.log('[Onboarding] Looking up Place ID for address:', validatedData.address);
        try {
          const { data: lookupData, error: lookupError } = await supabase.functions.invoke('lookup-place-id', {
            body: { address: validatedData.address }
          });

          if (lookupError) {
            console.error('[Onboarding] Place ID lookup error:', lookupError);
            toast.error('Could not verify business address with Google. Please check the address.');
            setIsLoading(false);
            return;
          }

          if (lookupData?.placeId) {
            placeId = lookupData.placeId;
            console.log('[Onboarding] Found Place ID:', placeId);
            
            // Update restaurant name if not set
            if (!formData.restaurantName && lookupData.name) {
              handleInputChange("restaurantName", lookupData.name);
            }
          }
        } catch (error) {
          console.error('[Onboarding] Place ID lookup failed:', error);
          // Continue without place ID - it's optional
        }
      }

      // Determine target restaurant for UPSERT based on slug and owner
      const slugToUse = validatedData.customSlug.toLowerCase().trim();

      // Check for an existing restaurant with this slug (may be limited by RLS)
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

      // Check if the current user already has a restaurant
      const { data: userRestaurant, error: userCheckError } = await supabase
        .from("restaurants")
        .select("id, custom_slug")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (userCheckError && userCheckError.code !== "PGRST116") {
        console.error("[Onboarding] Error checking user restaurant:", userCheckError);
        toast.error("Failed to verify account. Please try again.");
        setIsLoading(false);
        return;
      }

      let targetRestaurantId: string | null = null;
      let shouldInsert = false;

      if (existingSlugRestaurant) {
        // Slug exists: allow if it's unclaimed or already belongs to this user
        if (!existingSlugRestaurant.owner_id || existingSlugRestaurant.owner_id === user.id) {
          targetRestaurantId = existingSlugRestaurant.id;
        } else {
          toast.error(
            `The custom link (tapaway.co/${slugToUse}) is already taken. Please choose a unique name.`,
          );
          setIsLoading(false);
          return;
        }
      } else if (userRestaurant) {
        // No existing slug match, but user already has a restaurant: update that
        targetRestaurantId = userRestaurant.id;
      } else {
        // No existing restaurant or slug: perform insert
        shouldInsert = true;
      }

      // Strip "places/" prefix from Place ID for legacy Google Review URL compatibility
      const legacyPlaceId = placeId ? placeId.replace(/^places\//, '') : null;

      // Auto-generate Apple Maps URL from address
      let directionsUrl = validatedData.directionsUrl || '';
      if (!directionsUrl && validatedData.address) {
        const encodedAddress = encodeURIComponent(validatedData.address);
        const encodedName = encodeURIComponent(validatedData.restaurantName);
        directionsUrl = `https://maps.apple.com/?q=${encodedName}&address=${encodedAddress}`;
      }

      let logoUrl = null;
      if (logoFile) {
        const fileExt = logoFile.name.split(".").pop();
        const fileName = `${user.id}/logo.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("restaurant-logos")
          .upload(fileName, logoFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("restaurant-logos")
          .getPublicUrl(fileName);
        logoUrl = urlData.publicUrl;
      }

      // Create or update restaurant record (UPSERT)
      const restaurantData = {
        owner_id: user.id,
        restaurant_name: validatedData.restaurantName,
        owner_name: validatedData.ownerName,
        greeting_name: validatedData.ownerName, // Use owner name as greeting name
        custom_slug: validatedData.customSlug,
        slug_locked_at: new Date().toISOString(),
        instagram_url: validatedData.instagram || null,
        google_review_url: legacyPlaceId ? `https://search.google.com/local/writereview?placeid=${legacyPlaceId}` : null,
        google_place_id: legacyPlaceId || null,
        yelp_review_url: validatedData.yelpUrl && validatedData.yelpUrl.trim() ? validatedData.yelpUrl : null,
        directions_url: directionsUrl || null,
        address: validatedData.address || null,
        phone: validatedData.phone || null,
        email: validatedData.email && validatedData.email.trim() ? validatedData.email : null,
        logo_url: logoUrl,
        header_title: validatedData.headerTitle || "How was your visit?",
        header_subtitle: validatedData.headerSubtitle || "We'd love to hear about your experience!",
        menu_title: validatedData.menuTitle || "Our Menu",
      };

      if (targetRestaurantId) {
        // Update existing restaurant (either by slug or by owner)
        const { error: updateError } = await supabase
          .from("restaurants")
          .update(restaurantData)
          .eq("id", targetRestaurantId);

        if (updateError) {
          if ((updateError as any).code === "23505") {
            toast.error(
              `The custom link (tapaway.co/${slugToUse}) is already taken. Please choose a unique name.`,
            );
            setIsLoading(false);
            return;
          }
          throw updateError;
        }
      } else if (shouldInsert) {
        // Insert new restaurant
        const { error: insertError } = await supabase.from("restaurants").insert(restaurantData);

        if (insertError) {
          if ((insertError as any).code === "23505") {
            toast.error(
              `The custom link (tapaway.co/${slugToUse}) is already taken. Please choose a unique name.`,
            );
            setIsLoading(false);
            return;
          }
          throw insertError;
        }
      }

      toast.success("Restaurant setup complete!");
      navigate("/dashboard");
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        // Show actual Supabase error message to help debug
        const errorMessage = error?.message || "Failed to complete setup. Please try again.";
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

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
                  onPlaceSelected={({ placeId, name, address }) => {
                    handleInputChange("googlePlaceId", placeId);
                    handleInputChange("address", address);
                    if (!formData.restaurantName && name) {
                      handleInputChange("restaurantName", name);
                    }
                  }}
                  defaultValue={formData.address}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Start typing to search your business, then select it from the dropdown
                </p>
              </div>

              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  placeholder="(555) 123-4567"
                  maxLength={14}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter 10 digits (auto-formatted)
                </p>
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="contact@restaurant.com"
                  maxLength={255}
                />
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
              <div>
                <Label htmlFor="yelpUrl">Yelp Review URL (Optional)</Label>
                <Input
                  id="yelpUrl"
                  type="url"
                  value={formData.yelpUrl}
                  onChange={(e) => handleInputChange("yelpUrl", e.target.value)}
                  placeholder="https://www.yelp.com/biz/your-restaurant"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave blank if you don't have a Yelp page
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
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Onboarding;
