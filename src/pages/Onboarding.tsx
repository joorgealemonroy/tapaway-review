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

const onboardingSchema = z.object({
  restaurantName: z.string().trim().min(1, "Restaurant name is required").max(100),
  instagram: z.string().trim().max(50).optional(),
  googlePlaceId: z.string().trim().optional(),
  yelpUrl: z.string().trim().url("Invalid Yelp URL").optional().or(z.literal("")),
  directionsUrl: z.string().trim().url("Invalid directions URL").optional().or(z.literal("")),
  address: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(20).optional(),
  email: z.string().trim().email("Invalid email").max(255).optional().or(z.literal("")),
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
    if (step === 1 && !formData.restaurantName) {
      toast.error("Please enter your restaurant name");
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
      const validatedData = onboardingSchema.parse(formData);

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
        restaurant_name: validatedData.restaurantName,
        instagram_url: validatedData.instagram ? `https://instagram.com/${validatedData.instagram.replace('@', '')}` : null,
        google_review_url: validatedData.googlePlaceId ? `https://search.google.com/local/writereview?placeid=${validatedData.googlePlaceId}` : null,
        yelp_review_url: validatedData.yelpUrl || null,
        directions_url: validatedData.directionsUrl || null,
        address: validatedData.address || null,
        phone: validatedData.phone || null,
        email: validatedData.email || null,
        logo_url: logoUrl,
        header_title: validatedData.headerTitle || "How was your visit?",
        header_subtitle: validatedData.headerSubtitle || "We'd love to hear about your experience!",
        menu_title: validatedData.menuTitle || "Our Menu",
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
                  placeholder="https://maps.apple.com/..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Get link from Apple Maps: Share → Copy Link
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
              <div>
                <Label htmlFor="googlePlaceId">Google Place ID</Label>
                <Input
                  id="googlePlaceId"
                  value={formData.googlePlaceId}
                  onChange={(e) => handleInputChange("googlePlaceId", e.target.value)}
                  placeholder="ChIJN1t_tDeuEmsRUsoyG83frY4"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Find your Place ID at{" "}
                  <a
                    href="https://developers.google.com/maps/documentation/places/web-service/place-id"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Google Place ID Finder
                  </a>
                </p>
              </div>

              <div>
                <Label htmlFor="yelpUrl">Yelp Review URL</Label>
                <Input
                  id="yelpUrl"
                  type="url"
                  value={formData.yelpUrl}
                  onChange={(e) => handleInputChange("yelpUrl", e.target.value)}
                  placeholder="https://www.yelp.com/biz/your-restaurant"
                />
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
