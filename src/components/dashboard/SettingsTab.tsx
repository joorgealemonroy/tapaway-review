import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Settings, Lock, ExternalLink, Upload, Palette } from "lucide-react";
import { validateAllUrls } from "@/lib/urlValidation";
import { useState as useReactState } from "react";

interface Restaurant {
  id: string;
  restaurant_name: string;
  custom_slug: string;
  logo_url: string | null;
  hub_background_style: string | null;
  custom_background_url: string | null;
  google_review_url: string | null;
  yelp_review_url: string | null;
  instagram_url: string | null;
  directions_url: string | null;
}

interface SettingsTabProps {
  restaurantId: string;
}

export const SettingsTab = ({ restaurantId }: SettingsTabProps) => {
  const { toast } = useToast();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useReactState(false);

  useEffect(() => {
    fetchSettings();
  }, [restaurantId]);

  const fetchSettings = async () => {
    const { data } = await supabase
      .from("restaurants")
      .select("*")
      .eq("id", restaurantId)
      .single();

    if (data) {
      setRestaurant(data as any);
    }
    
    setLoading(false);
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const randomUuid = crypto.randomUUID();
      const filePath = `${restaurantId}/${randomUuid}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('restaurant-logos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('restaurant-logos')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('restaurants')
        .update({ logo_url: publicUrl })
        .eq('id', restaurantId);

      if (updateError) throw updateError;

      setRestaurant(prev => prev ? { ...prev, logo_url: publicUrl } : null);
      toast({ title: "Logo updated", description: "Your logo has been updated successfully." });
    } catch (error: any) {
      toast({ title: "Error", description: `Upload failed: ${error.message}`, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleBackgroundUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const randomUuid = crypto.randomUUID();
      const filePath = `${restaurantId}/bg-${randomUuid}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('restaurant-logos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('restaurant-logos')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('restaurants')
        .update({ custom_background_url: publicUrl })
        .eq('id', restaurantId);

      if (updateError) throw updateError;

      setRestaurant(prev => prev ? { ...prev, custom_background_url: publicUrl } : null);
      toast({ title: "Background updated", description: "Your custom background has been updated." });
    } catch (error: any) {
      toast({ title: "Error", description: `Upload failed: ${error.message}`, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const saveSettings = async () => {
    if (!restaurant) return;

    // Validate URLs before saving
    const validation = validateAllUrls({
      google: restaurant.google_review_url,
      yelp: restaurant.yelp_review_url,
      instagram: restaurant.instagram_url,
      directions: restaurant.directions_url,
    });

    if (!validation.valid) {
      const errorMessages = Object.entries(validation.errors)
        .map(([field, message]) => `${field}: ${message}`)
        .join("\n");
      toast({ 
        title: "Invalid URLs", 
        description: errorMessages,
        variant: "destructive" 
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("restaurants")
        .update({
          restaurant_name: restaurant.restaurant_name,
          hub_background_style: restaurant.hub_background_style,
          custom_background_url: restaurant.custom_background_url,
          google_review_url: restaurant.google_review_url,
          yelp_review_url: restaurant.yelp_review_url,
          instagram_url: restaurant.instagram_url,
          directions_url: restaurant.directions_url,
        })
        .eq("id", restaurantId);

      if (error) throw error;

      toast({ title: "Settings saved", description: "Your settings have been updated successfully." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!restaurant) {
    return <div className="text-muted-foreground">Restaurant not found.</div>;
  }

  return (
    <div className="space-y-6 pb-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-2 flex items-center gap-2">
            <Settings className="w-7 h-7 text-primary" />
            Settings
          </h2>
          <p className="text-muted-foreground">Manage your restaurant information and links</p>
        </div>
        <Button onClick={saveSettings} className="gradient-primary text-white w-full sm:w-auto">
          Save Changes
        </Button>
      </div>

      {/* Logo Upload Section */}
      <Card className="p-6 card-elevated">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5 text-primary" />
          Restaurant Logo
        </h3>
        <div className="space-y-4">
          <div>
            <Label>Current Logo</Label>
            {restaurant.logo_url ? (
              <div className="mt-2">
                <img src={restaurant.logo_url} alt="Logo" className="w-32 h-32 object-cover rounded-lg border-2 border-border" />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">No logo uploaded</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="logo-upload">Upload New Logo</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="logo-upload"
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={uploading}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              This logo will appear in your review hub and dashboard
            </p>
          </div>
        </div>
      </Card>

      {/* Hub Background Style */}
      <Card className="p-6 card-elevated">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Palette className="w-5 h-5 text-primary" />
          Hub Background Style
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Choose how your review hub looks to customers
        </p>
        <div className="grid grid-cols-2 gap-4">
          {[
            { value: 'classic', label: 'Classic', desc: 'Clean white background' },
            { value: 'soft-gradient', label: 'Soft Gradient', desc: 'Subtle color gradient' },
            { value: 'photo-blur', label: 'Photo Blur', desc: 'Blurred photo backdrop' },
            { value: 'dark', label: 'Dark', desc: 'Dark theme with contrast' }
          ].map(style => (
            <div
              key={style.value}
              onClick={() => setRestaurant(prev => prev ? { ...prev, hub_background_style: style.value } : null)}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                restaurant.hub_background_style === style.value 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className={`w-full h-16 rounded mb-2 ${
                style.value === 'classic' ? 'bg-background' :
                style.value === 'soft-gradient' ? 'bg-gradient-to-br from-blue-50 to-purple-50' :
                style.value === 'photo-blur' ? 'bg-gradient-to-br from-gray-200 to-gray-300' :
                'bg-gray-900'
              }`} />
              <h4 className="font-semibold text-sm">{style.label}</h4>
              <p className="text-xs text-muted-foreground">{style.desc}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Custom Background Upload */}
      <Card className="p-6 card-elevated">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5 text-primary" />
          Custom Background Image
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Upload a custom background image for your hub (overrides style selection)
        </p>
        <div className="space-y-4">
          {restaurant.custom_background_url && (
            <div>
              <Label>Current Background</Label>
              <div className="mt-2 relative h-32 rounded-lg overflow-hidden border-2 border-border">
                <img 
                  src={restaurant.custom_background_url} 
                  alt="Background" 
                  className="w-full h-full object-cover" 
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={async () => {
                  await supabase
                    .from('restaurants')
                    .update({ custom_background_url: null })
                    .eq('id', restaurantId);
                  setRestaurant(prev => prev ? { ...prev, custom_background_url: null } : null);
                  toast({ title: "Background removed" });
                }}
              >
                Remove Custom Background
              </Button>
            </div>
          )}
          
          <div>
            <Label htmlFor="bg-upload">Upload Background Image</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="bg-upload"
                type="file"
                accept="image/*"
                onChange={handleBackgroundUpload}
                disabled={uploading}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Recommended: 1920x1080px or larger for best quality
            </p>
          </div>

          {/* Preview */}
          <div>
            <Label>Preview Hub Style</Label>
            <div 
              className="mt-2 h-40 rounded-lg border-2 border-border overflow-hidden relative"
              style={{
                background: restaurant.custom_background_url 
                  ? `url(${restaurant.custom_background_url}) center/cover`
                  : restaurant.hub_background_style === 'soft-gradient'
                  ? 'linear-gradient(135deg, #00f5ff 0%, #ff00ea 100%)'
                  : restaurant.hub_background_style === 'photo-blur'
                  ? 'linear-gradient(135deg, #39ff14 0%, #ffff00 100%)'
                  : restaurant.hub_background_style === 'dark'
                  ? '#000000'
                  : '#ffffff'
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-white/90 dark:bg-black/90 backdrop-blur-sm p-6 rounded-lg shadow-lg">
                  <p className="text-sm font-semibold">Hub Preview</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {restaurant.custom_background_url ? 'Custom Image' : restaurant.hub_background_style || 'Classic'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6 card-elevated">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          Basic Information
        </h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-sm font-semibold">Restaurant Name</Label>
            <Input
              id="name"
              value={restaurant.restaurant_name}
              onChange={(e) => setRestaurant({ ...restaurant, restaurant_name: e.target.value })}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="slug" className="text-sm font-semibold flex items-center gap-2">
              Custom Slug
              <Lock className="w-4 h-4 text-muted-foreground" />
            </Label>
            <Input
              id="slug"
              value={restaurant.custom_slug || ""}
              disabled
              className="mt-2 bg-muted cursor-not-allowed"
            />
            <div className="mt-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-sm text-amber-900">
                <strong>Your Review Hub:</strong> tapaway.co/{restaurant.custom_slug || "your-slug"}
              </p>
              <p className="text-xs text-amber-700 mt-1">
                ⚠️ Slug cannot be changed after creation. Contact TapAway support if needed.
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6 card-elevated">
        <h3 className="text-lg font-bold mb-4">Links & Social Media</h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="google" className="text-sm font-semibold">Google Review URL</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="google"
                value={restaurant.google_review_url || ""}
                onChange={(e) => setRestaurant({ ...restaurant, google_review_url: e.target.value })}
                placeholder="https://search.google.com/local/writereview?placeid=..."
              />
              {restaurant.google_review_url && (
                <Button variant="outline" size="sm" asChild>
                  <a href={restaurant.google_review_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>
          <div>
            <Label htmlFor="yelp" className="text-sm font-semibold">Yelp URL (Optional)</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="yelp"
                value={restaurant.yelp_review_url || ""}
                onChange={(e) => setRestaurant({ ...restaurant, yelp_review_url: e.target.value })}
                placeholder="https://www.yelp.com/biz/..."
              />
              {restaurant.yelp_review_url && (
                <Button variant="outline" size="sm" asChild>
                  <a href={restaurant.yelp_review_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Leave blank to hide Yelp button from your Review Hub
            </p>
          </div>
          <div>
            <Label htmlFor="instagram" className="text-sm font-semibold">Instagram URL</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="instagram"
                value={restaurant.instagram_url || ""}
                onChange={(e) => setRestaurant({ ...restaurant, instagram_url: e.target.value })}
                placeholder="https://instagram.com/..."
              />
              {restaurant.instagram_url && (
                <Button variant="outline" size="sm" asChild>
                  <a href={restaurant.instagram_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>
          <div>
            <Label htmlFor="directions" className="text-sm font-semibold">Directions URL</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="directions"
                value={restaurant.directions_url || ""}
                onChange={(e) => setRestaurant({ ...restaurant, directions_url: e.target.value })}
                placeholder="https://maps.apple.com/?q=..."
              />
              {restaurant.directions_url && (
                <Button variant="outline" size="sm" asChild>
                  <a href={restaurant.directions_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};