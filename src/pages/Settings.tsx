import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>({
    staff_prompts: {
      default_instructions: "Be professional and courteous at all times",
      negative_experience_guidance: "If a guest mentions concerns, empathize and offer to connect them with management",
      positive_experience_guidance: "Thank guests for positive feedback and encourage them to share their experience"
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: restaurant } = await (supabase as any)
      .from("restaurants")
      .select("id, settings")
      .eq("owner_id", user.id)
      .single();

    if (!restaurant) {
      navigate("/onboarding");
      return;
    }

    setRestaurantId(restaurant.id);
    if (restaurant.settings && typeof restaurant.settings === 'object') {
      setSettings(restaurant.settings as unknown as Settings);
    }
    
    setLoading(false);
  };

  const saveSettings = async () => {
    if (!restaurantId) return;

    try {
      const { error } = await (supabase as any)
        .from("restaurants")
        .update({ settings: settings as any })
        .eq("id", restaurantId);

      if (error) throw error;

      toast({
        title: "Settings saved",
        description: "Your settings have been updated successfully.",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground mt-1">Configure your restaurant settings and staff guidance</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </Button>
            <Button onClick={saveSettings}>Save Changes</Button>
          </div>
        </div>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Staff Guidance Prompts</h2>
          <p className="text-sm text-muted-foreground mb-6">
            These prompts guide how your staff should interact with guests based on their feedback.
            Changes sync to your public review hub in real-time.
          </p>

          <div className="space-y-6">
            <div>
              <Label htmlFor="default">Default Instructions</Label>
              <Textarea
                id="default"
                value={settings.staff_prompts.default_instructions}
                onChange={(e) => setSettings({
                  ...settings,
                  staff_prompts: {
                    ...settings.staff_prompts,
                    default_instructions: e.target.value
                  }
                })}
                placeholder="Enter default staff instructions..."
                rows={3}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                General guidance for all staff interactions
              </p>
            </div>

            <div>
              <Label htmlFor="negative">Handling Negative Feedback</Label>
              <Textarea
                id="negative"
                value={settings.staff_prompts.negative_experience_guidance}
                onChange={(e) => setSettings({
                  ...settings,
                  staff_prompts: {
                    ...settings.staff_prompts,
                    negative_experience_guidance: e.target.value
                  }
                })}
                placeholder="Enter guidance for handling concerns..."
                rows={3}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                How to respond when guests express concerns or dissatisfaction
              </p>
            </div>

            <div>
              <Label htmlFor="positive">Handling Positive Feedback</Label>
              <Textarea
                id="positive"
                value={settings.staff_prompts.positive_experience_guidance}
                onChange={(e) => setSettings({
                  ...settings,
                  staff_prompts: {
                    ...settings.staff_prompts,
                    positive_experience_guidance: e.target.value
                  }
                })}
                placeholder="Enter guidance for positive interactions..."
                rows={3}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                How to respond to and encourage positive guest experiences
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
