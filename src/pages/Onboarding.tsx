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
import { GooglePlacesAutocomplete } from "@/components/GooglePlacesAutocomplete";
import { urlValidationSchemas } from "@/lib/urlValidation";

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
    }
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
      // Check slug uniqueness
      if (formData.customSlug) {
        const { data: existing } = await (supabase as any)
          .from('restaurants')
          .select('id')
          .eq('custom_slug', formData.customSlug)
          .maybeSingle();
        
        if (existing) {
          toast.error('This URL is already taken. Please choose a different one.');
          setIsLoading(false);
          return;
        }
      }

      // Validate form data
      try {
        onboardingSchema.parse(formData);
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          toast.error(validationError.errors[0].message);
          setIsLoading(false);
          return;
        }
      }

      // Auto-generate Apple Maps URL from address
      let directionsUrl = formData.directionsUrl || '';
      if (!directionsUrl && formData.address) {
        const encodedAddress = encodeURIComponent(formData.address);
        const encodedName = encodeURIComponent(formData.restaurantName);
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

      // Create restaurant record
      const { error: insertError } = await supabase.from("restaurants").insert({
        owner_id: user.id,
        restaurant_name: formData.restaurantName,
        owner_name: formData.ownerName,
        custom_slug: formData.customSlug,
        slug_locked_at: new Date().toISOString(),
        instagram_url: formData.instagram ? `https://instagram.com/${formData.instagram.replace('@', '')}` : null,
        google_review_url: formData.googlePlaceId ? `https://search.google.com/local/writereview?placeid=${formData.googlePlaceId}` : null,
        google_place_id: formData.googlePlaceId || null,
        yelp_review_url: formData.yelpUrl && formData.yelpUrl.trim() ? formData.yelpUrl : null,
        directions_url: directionsUrl || null,
        address: formData.address || null,
        phone: formData.phone || null,
        email: formData.email && formData.email.trim() ? formData.email : null,
        logo_url: logoUrl,
        header_title: formData.headerTitle || "How was your visit?",
        header_subtitle: formData.headerSubtitle || "We'd love to hear about your experience!",
        menu_title: formData.menuTitle || "Our Menu",
      });

      if (insertError) throw insertError;

      toast.success("Restaurant setup complete!");
      navigate("/dashboard");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        console.error("Onboarding error:", error);
        toast.error("Failed to complete setup. Please try again.");
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
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  placeholder="123 Main Street, City, State ZIP"
                  rows={2}
                  maxLength={200}
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  placeholder="(555) 123-4567"
                  maxLength={20}
                />
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

              <div>
                <Label htmlFor="directionsUrl">Directions Link (Apple Maps)</Label>
                <Input
                  id="directionsUrl"
                  type="url"
                  value={formData.directionsUrl}
                  onChange={(e) => handleInputChange("directionsUrl", e.target.value)}
                  placeholder="Auto-generated from address or search"
                  disabled
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.directionsUrl 
                    ? "✓ Directions URL auto-generated" 
                    : "Will be generated from your address"}
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
              <p className="text-muted-foreground">Where customers can leave feedback</p>
            </div>

            <div className="space-y-4">
              <GooglePlacesAutocomplete
                onPlaceSelected={(place) => {
                  handleInputChange("googlePlaceId", place.placeId);
                  if (!formData.restaurantName) {
                    handleInputChange("restaurantName", place.name);
                  }
                  if (!formData.address) {
                    handleInputChange("address", place.address);
                  }
                  // Auto-generate Apple Maps URL
                  const encodedAddress = encodeURIComponent(place.address);
                  const encodedName = encodeURIComponent(place.name);
                  handleInputChange("directionsUrl", `https://maps.apple.com/?q=${encodedName}&address=${encodedAddress}`);
                  toast.success("Business found! Review URL will be auto-generated.");
                }}
                defaultValue={formData.restaurantName}
              />

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
