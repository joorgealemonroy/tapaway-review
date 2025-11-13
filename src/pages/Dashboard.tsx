import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Restaurant {
  id: string;
  restaurant_name: string;
  header_subtitle: string;
  menu_title: string;
  google_review_url: string | null;
  yelp_review_url: string | null;
  directions_url: string | null;
  instagram_url: string | null;
  stripe_portal_url: string | null;
}

const Dashboard = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [headerSubtitle, setHeaderSubtitle] = useState("");
  const [menuTitle, setMenuTitle] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchRestaurant();
    }
  }, [user]);

  const fetchRestaurant = async () => {
    const { data, error } = await supabase
      .from("restaurants")
      .select("*")
      .eq("owner_id", user?.id)
      .single();

    if (data) {
      setRestaurant(data);
      setHeaderSubtitle(data.header_subtitle);
      setMenuTitle(data.menu_title);
    }
  };

  const handleSave = async () => {
    if (!restaurant) return;

    setSaving(true);
    const { error } = await supabase
      .from("restaurants")
      .update({
        header_subtitle: headerSubtitle,
        menu_title: menuTitle,
      })
      .eq("id", restaurant.id);

    if (error) {
      toast.error("Failed to save changes");
    } else {
      toast.success("Changes saved successfully!");
      fetchRestaurant();
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="border-b border-border bg-background/95 backdrop-blur">
          <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary"></div>
              <span className="font-bold text-xl">TapAway</span>
            </div>
            <Button variant="ghost" onClick={signOut}>Sign Out</Button>
          </div>
        </nav>
        <div className="max-w-4xl mx-auto px-4 py-12">
          <Card className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Welcome to TapAway!</h2>
            <p className="text-muted-foreground mb-6">
              You don't have a restaurant set up yet. Please complete your purchase to get started.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-background/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary"></div>
            <span className="font-bold text-xl">TapAway</span>
          </div>
          <Button variant="ghost" onClick={signOut}>Sign Out</Button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2">{restaurant.restaurant_name}</h1>
        <p className="text-muted-foreground mb-8">Manage your TapAway review hub</p>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Review Hub Preview</h2>
            <div className="bg-muted p-4 rounded-lg mb-4">
              <p className="text-sm text-muted-foreground mb-2">Your Review Hub URL:</p>
              <code className="text-sm bg-background px-3 py-2 rounded border border-border inline-block">
                {window.location.origin}/hub/{restaurant.id}
              </code>
            </div>
            <Button
              onClick={() => window.open(`/hub/${restaurant.id}`, "_blank")}
              variant="outline"
            >
              View Live Hub
            </Button>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Customize Your Hub</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="subtitle">Header Subtitle</Label>
                <Textarea
                  id="subtitle"
                  value={headerSubtitle}
                  onChange={(e) => setHeaderSubtitle(e.target.value)}
                  placeholder="We'd love to hear about your experience!"
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="menu-title">Menu Title</Label>
                <Input
                  id="menu-title"
                  value={menuTitle}
                  onChange={(e) => setMenuTitle(e.target.value)}
                  placeholder="Our Menu"
                  className="mt-2"
                />
              </div>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Restaurant Details</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Restaurant Name:</span>
                <span className="font-medium">{restaurant.restaurant_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Google Review:</span>
                <span className="font-medium">{restaurant.google_review_url ? "✓ Set" : "Not set"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Yelp Review:</span>
                <span className="font-medium">{restaurant.yelp_review_url ? "✓ Set" : "Not set"}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Contact support to update your restaurant name and review links.
              </p>
            </div>
          </Card>

          {restaurant.stripe_portal_url && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Subscription</h2>
              <Button
                onClick={() => window.open(restaurant.stripe_portal_url!, "_blank")}
                variant="outline"
              >
                Manage Subscription
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
