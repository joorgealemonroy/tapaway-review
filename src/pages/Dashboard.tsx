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
          <Card className="p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold mb-3">Welcome to TapAway!</h2>
              <p className="text-muted-foreground mb-8 text-lg">
                Choose a plan to get started with your Review Hub
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="border border-border rounded-lg p-4 hover:border-primary transition-colors">
                <h3 className="font-semibold text-lg mb-2">Monthly</h3>
                <div className="text-2xl font-bold mb-3">$29<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                <Button 
                  className="w-full" 
                  size="sm"
                  onClick={() => window.location.href = 'https://buy.stripe.com/fZu14n7tZbXRgSl5QugYU05'}
                >
                  Choose Monthly
                </Button>
              </div>
              
              <div className="border-2 border-primary rounded-lg p-4 relative bg-primary/5">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">
                  Popular
                </div>
                <h3 className="font-semibold text-lg mb-2">Yearly</h3>
                <div className="text-2xl font-bold mb-1">$249<span className="text-sm font-normal text-muted-foreground">/yr</span></div>
                <div className="text-xs text-muted-foreground mb-3">Save $99/year</div>
                <Button 
                  className="w-full" 
                  size="sm"
                  onClick={() => window.location.href = 'https://buy.stripe.com/4gM7sLcOj2nhcC52EigYU06'}
                >
                  Choose Yearly
                </Button>
              </div>
              
              <div className="border border-border rounded-lg p-4 hover:border-primary transition-colors">
                <h3 className="font-semibold text-lg mb-2">Bundle</h3>
                <div className="text-2xl font-bold mb-1">$69<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                <div className="text-xs text-muted-foreground mb-3">3 locations</div>
                <Button 
                  className="w-full" 
                  size="sm"
                  onClick={() => window.location.href = 'https://buy.stripe.com/3cI8wPdSn9PJeKdfr4gYU09'}
                >
                  Choose Bundle
                </Button>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground text-center">
              After purchase, your dashboard will be activated automatically
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
