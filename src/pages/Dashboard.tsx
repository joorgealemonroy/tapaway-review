import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { z } from "zod";
import { Search } from "lucide-react";

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
  const [allRestaurants, setAllRestaurants] = useState<Restaurant[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [restaurantSearch, setRestaurantSearch] = useState("");
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
      checkAdminStatus();
    }
  }, [user]);

  const checkAdminStatus = async () => {
    const { data } = await supabase.rpc('is_admin');
    setIsAdmin(data || false);
    
    if (data) {
      // Admin: fetch all restaurants
      fetchAllRestaurants();
    } else {
      // Regular user: fetch their own restaurant
      fetchRestaurant();
    }
  };

  const fetchAllRestaurants = async () => {
    const { data, error } = await supabase
      .from("restaurants")
      .select("*")
      .order("restaurant_name");

    if (data && data.length > 0) {
      setAllRestaurants(data);
      setRestaurant(data[0]); // Default to first restaurant
      setHeaderSubtitle(data[0].header_subtitle);
      setMenuTitle(data[0].menu_title);
    }
  };

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

  const handleRestaurantChange = (restaurantId: string) => {
    const selected = allRestaurants.find((r) => r.id === restaurantId);
    if (selected) {
      setRestaurant(selected);
      setHeaderSubtitle(selected.header_subtitle);
      setMenuTitle(selected.menu_title);
    }
  };

  const handleSave = async () => {
    if (!restaurant) return;

    // Validate input fields
    const updateSchema = z.object({
      header_subtitle: z.string().trim().max(200, "Subtitle must be less than 200 characters"),
      menu_title: z.string().trim().max(50, "Menu title must be less than 50 characters"),
    });

    try {
      const validatedData = updateSchema.parse({
        header_subtitle: headerSubtitle,
        menu_title: menuTitle,
      });

      setSaving(true);
      const { error } = await supabase
        .from("restaurants")
        .update({
          header_subtitle: validatedData.header_subtitle,
          menu_title: validatedData.menu_title,
        })
        .eq("id", restaurant.id);

      if (error) {
        toast.error("Failed to save changes");
      } else {
        toast.success("Changes saved successfully!");
        if (isAdmin) {
          fetchAllRestaurants();
        } else {
          fetchRestaurant();
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  }

  // Hide purchase options for admin users
  if (!isAdmin && !restaurant) {
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
        {isAdmin && allRestaurants.length > 0 && (
          <Card className="p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Admin Mode - Restaurant Selector</h2>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search restaurants..."
                  value={restaurantSearch}
                  onChange={(e) => setRestaurantSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={restaurant?.id} onValueChange={handleRestaurantChange}>
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Choose a restaurant" />
                </SelectTrigger>
                <SelectContent>
                  {allRestaurants
                    .filter((r) =>
                      r.restaurant_name.toLowerCase().includes(restaurantSearch.toLowerCase())
                    )
                    .map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.restaurant_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </Card>
        )}
        
        <h1 className="text-3xl font-bold mb-2">{restaurant.restaurant_name}</h1>
        <p className="text-muted-foreground mb-8">
          {isAdmin ? "Admin Dashboard - Managing all restaurants" : "Manage your TapAway review hub"}
        </p>

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
