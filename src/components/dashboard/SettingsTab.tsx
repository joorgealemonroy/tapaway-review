import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Settings, Lock, ExternalLink } from "lucide-react";
import { validateAllUrls } from "@/lib/urlValidation";

interface Restaurant {
  id: string;
  restaurant_name: string;
  custom_slug: string;
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