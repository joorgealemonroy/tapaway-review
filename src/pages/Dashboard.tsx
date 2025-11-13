import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalLink, MapPin } from "lucide-react";
import { AnalyticsOverview } from "@/components/dashboard/AnalyticsOverview";
import { MenuTab } from "@/components/dashboard/MenuTab";
import { SettingsTab } from "@/components/dashboard/SettingsTab";
import { SupportTab } from "@/components/dashboard/SupportTab";
import { BillingTab } from "@/components/dashboard/BillingTab";
import { AICoachTab } from "@/components/dashboard/AICoachTab";
import { GoalsTab } from "@/components/dashboard/GoalsTab";
import { CompetitorTab } from "@/components/dashboard/CompetitorTab";
import { ReviewRepliesTab } from "@/components/dashboard/ReviewRepliesTab";

interface Restaurant {
  id: string;
  restaurant_name: string;
  custom_slug: string | null;
  stripe_portal_url: string | null;
  subscription_status: string | null;
  plan_type: string | null;
  next_billing_date: string | null;
}

interface Location {
  id: string;
  name: string;
  custom_slug: string | null;
}

const Dashboard = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [allRestaurants, setAllRestaurants] = useState<Restaurant[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isTestAccount, setIsTestAccount] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

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
    setIsTestAccount(user?.email === "test@me.com");
    
    if (data) {
      fetchAllRestaurants();
    } else {
      fetchRestaurant();
    }
  };

  const fetchAllRestaurants = async () => {
    const { data } = await (supabase as any)
      .from("restaurants")
      .select("*")
      .order("restaurant_name");

    if (data && data.length > 0) {
      setAllRestaurants(data);
      setRestaurant(data[0]);
    }
  };

  const fetchRestaurant = async () => {
    const { data } = await (supabase as any)
      .from("restaurants")
      .select("*")
      .eq("owner_id", user?.id)
      .single();

    if (data) {
      setRestaurant(data as any);
      fetchLocations(data.id);
    }
  };

  const fetchLocations = async (restaurantId: string) => {
    const { data } = await (supabase as any)
      .from("locations")
      .select("id, name, custom_slug")
      .eq("restaurant_id", restaurantId)
      .eq("is_active", true)
      .order("name");

    if (data && data.length > 0) {
      setLocations(data);
      setSelectedLocation(data[0].id);
    }
  };

  const handleRestaurantChange = (restaurantId: string) => {
    const selected = allRestaurants.find((r) => r.id === restaurantId);
    if (selected) {
      setRestaurant(selected);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  }

  // Show purchase options only for non-admin, non-test users without a restaurant
  if (!isAdmin && !isTestAccount && !restaurant) {
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
          <div className="flex items-center gap-3">
            {restaurant?.custom_slug && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/${restaurant.custom_slug}`, "_blank")}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View Hub
              </Button>
            )}
            <Button variant="ghost" onClick={signOut}>Sign Out</Button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {isAdmin && allRestaurants.length > 0 && (
          <Card className="p-4 mb-6">
            <Select value={restaurant?.id} onValueChange={handleRestaurantChange}>
              <SelectTrigger className="w-full md:w-[400px]">
                <SelectValue placeholder="Select restaurant" />
              </SelectTrigger>
              <SelectContent>
                {allRestaurants.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.restaurant_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Card>
        )}

        {!isAdmin && locations.length > 1 && (
          <Card className="p-4 mb-6">
            <div className="flex items-center gap-4">
              <MapPin className="w-5 h-5 text-muted-foreground" />
              <Select value={selectedLocation || undefined} onValueChange={setSelectedLocation}>
                <SelectTrigger className="w-full md:w-[400px]">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">
                {locations.length} of {restaurant?.plan_type === 'bundle' ? '3' : '1'} locations
              </span>
            </div>
          </Card>
        )}
        
        <div className="mb-6">
          <h1 className="text-3xl font-bold">{restaurant.restaurant_name}</h1>
          <p className="text-muted-foreground">
            {isAdmin ? "Admin Dashboard" : isTestAccount ? "Test Account Dashboard" : "Restaurant Dashboard"}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-4 md:grid-cols-9 w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="ai-coach">AI Coach</TabsTrigger>
            <TabsTrigger value="competitors">Competitors</TabsTrigger>
            <TabsTrigger value="replies">Replies</TabsTrigger>
            <TabsTrigger value="goals">Goals</TabsTrigger>
            <TabsTrigger value="menu">Menu</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="support">Support</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <AnalyticsOverview restaurantId={restaurant.id} />
          </TabsContent>

          <TabsContent value="ai-coach">
            <AICoachTab restaurantId={restaurant.id} locationId={selectedLocation || undefined} />
          </TabsContent>

          <TabsContent value="competitors">
            <CompetitorTab restaurantId={restaurant.id} />
          </TabsContent>

          <TabsContent value="replies">
            <ReviewRepliesTab restaurantId={restaurant.id} />
          </TabsContent>

          <TabsContent value="goals">
            <GoalsTab restaurantId={restaurant.id} />
          </TabsContent>

          <TabsContent value="menu">
            <MenuTab restaurantId={restaurant.id} />
          </TabsContent>

          <TabsContent value="settings">
            <SettingsTab restaurantId={restaurant.id} />
          </TabsContent>

          <TabsContent value="support">
            <SupportTab />
          </TabsContent>

          <TabsContent value="billing">
            <BillingTab restaurant={restaurant} isTestAccount={isTestAccount} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
