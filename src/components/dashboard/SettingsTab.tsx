import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface Settings {
  staff_prompts: {
    default_instructions: string;
    negative_experience_guidance: string;
    positive_experience_guidance: string;
  };
}

interface Restaurant {
  id: string;
  restaurant_name: string;
  custom_slug: string;
  google_review_url: string | null;
  yelp_review_url: string | null;
  instagram_url: string | null;
  directions_url: string | null;
  settings: Settings;
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

    try {
      const { error } = await supabase
        .from("restaurants")
        .update({
          restaurant_name: restaurant.restaurant_name,
          custom_slug: restaurant.custom_slug,
          google_review_url: restaurant.google_review_url,
          yelp_review_url: restaurant.yelp_review_url,
          instagram_url: restaurant.instagram_url,
          directions_url: restaurant.directions_url,
          settings: restaurant.settings as any
        })
        .eq("id", restaurantId);

      if (error) throw error;

      toast({ title: "Settings saved", description: "Your settings have been updated successfully." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading settings...</div>;
  }

  if (!restaurant) {
    return <div className="text-muted-foreground">Restaurant not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Restaurant Settings</h3>
        <Button onClick={saveSettings} size="sm">Save Changes</Button>
      </div>

      <Card className="p-6 space-y-4">
        <h4 className="font-semibold">Basic Information</h4>
        <div>
          <Label htmlFor="name">Restaurant Name</Label>
          <Input
            id="name"
            value={restaurant.restaurant_name}
            onChange={(e) => setRestaurant({ ...restaurant, restaurant_name: e.target.value })}
            className="mt-2"
          />
        </div>
        <div>
          <Label htmlFor="slug">Custom Slug</Label>
          <Input
            id="slug"
            value={restaurant.custom_slug || ""}
            onChange={(e) => setRestaurant({ ...restaurant, custom_slug: e.target.value })}
            className="mt-2"
            placeholder="your-restaurant-name"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Your review hub will be at: tapaway.co/{restaurant.custom_slug || "your-slug"}
          </p>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h4 className="font-semibold">Links & Social Media</h4>
        <div>
          <Label htmlFor="google">Google Review URL</Label>
          <Input
            id="google"
            value={restaurant.google_review_url || ""}
            onChange={(e) => setRestaurant({ ...restaurant, google_review_url: e.target.value })}
            className="mt-2"
            placeholder="https://..."
          />
        </div>
        <div>
          <Label htmlFor="yelp">Yelp URL</Label>
          <Input
            id="yelp"
            value={restaurant.yelp_review_url || ""}
            onChange={(e) => setRestaurant({ ...restaurant, yelp_review_url: e.target.value })}
            className="mt-2"
            placeholder="https://..."
          />
        </div>
        <div>
          <Label htmlFor="instagram">Instagram URL</Label>
          <Input
            id="instagram"
            value={restaurant.instagram_url || ""}
            onChange={(e) => setRestaurant({ ...restaurant, instagram_url: e.target.value })}
            className="mt-2"
            placeholder="https://instagram.com/..."
          />
        </div>
        <div>
          <Label htmlFor="directions">Directions URL</Label>
          <Input
            id="directions"
            value={restaurant.directions_url || ""}
            onChange={(e) => setRestaurant({ ...restaurant, directions_url: e.target.value })}
            className="mt-2"
            placeholder="https://maps.apple.com/..."
          />
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h4 className="font-semibold">Staff Guidance Prompts</h4>
        <p className="text-sm text-muted-foreground">
          These prompts guide how your staff should interact with guests. Changes sync to your public review hub in real-time.
        </p>
        <div>
          <Label htmlFor="default">Default Instructions</Label>
          <Textarea
            id="default"
            value={restaurant.settings.staff_prompts.default_instructions}
            onChange={(e) => setRestaurant({
              ...restaurant,
              settings: {
                ...restaurant.settings,
                staff_prompts: {
                  ...restaurant.settings.staff_prompts,
                  default_instructions: e.target.value
                }
              }
            })}
            className="mt-2"
          />
        </div>
        <div>
          <Label htmlFor="negative">Negative Experience Guidance</Label>
          <Textarea
            id="negative"
            value={restaurant.settings.staff_prompts.negative_experience_guidance}
            onChange={(e) => setRestaurant({
              ...restaurant,
              settings: {
                ...restaurant.settings,
                staff_prompts: {
                  ...restaurant.settings.staff_prompts,
                  negative_experience_guidance: e.target.value
                }
              }
            })}
            className="mt-2"
          />
        </div>
        <div>
          <Label htmlFor="positive">Positive Experience Guidance</Label>
          <Textarea
            id="positive"
            value={restaurant.settings.staff_prompts.positive_experience_guidance}
            onChange={(e) => setRestaurant({
              ...restaurant,
              settings: {
                ...restaurant.settings,
                staff_prompts: {
                  ...restaurant.settings.staff_prompts,
                  positive_experience_guidance: e.target.value
                }
              }
            })}
            className="mt-2"
          />
        </div>
      </Card>
    </div>
  );
};