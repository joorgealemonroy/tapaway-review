import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalLink, MapPin } from "lucide-react";
import { toast } from "sonner";
import { AnalyticsOverview } from "@/components/dashboard/AnalyticsOverview";
import { MenuTab } from "@/components/dashboard/MenuTab";
import { SettingsTab } from "@/components/dashboard/SettingsTab";
import { SupportTab } from "@/components/dashboard/SupportTab";
import { BillingTab } from "@/components/dashboard/BillingTab";
import { AICoachTab } from "@/components/dashboard/AICoachTab";
import { GoalsTab } from "@/components/dashboard/GoalsTab";
import { CompetitorTab } from "@/components/dashboard/CompetitorTab";
import { ReviewRepliesTab } from "@/components/dashboard/ReviewRepliesTab";
import { EngagementTab } from "@/components/dashboard/EngagementTab";
import { AvMealPrepDashboard } from "@/components/dashboard/AvMealPrepDashboard";
import { isGrandfatheredUser } from "@/lib/grandfatheredUsers";
interface Restaurant {
  id: string;
  restaurant_name: string;
  custom_slug: string | null;
  stripe_portal_url: string | null;
  subscription_status: string | null;
  plan_type: string | null;
  next_billing_date: string | null;
  type?: string | null;
  greeting_name?: string | null;
}
interface Location {
  id: string;
  name: string;
  custom_slug: string | null;
}
const Dashboard = () => {
  const {
    user,
    loading,
    signOut
  } = useAuth();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [allRestaurants, setAllRestaurants] = useState<Restaurant[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isTestAccount, setIsTestAccount] = useState(false);
  const [isGrandfathered, setIsGrandfathered] = useState(false);
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
    const {
      data: isAdminData
    } = await supabase.rpc('is_admin');
    const {
      data: isTestData
    } = await (supabase as any).rpc('is_test_account');
    const emailAdmin = user?.email === 'tap@tapaway.co';
    const metaAdmin = (user as any)?.app_metadata?.role === 'admin';
    const effectiveAdmin = Boolean(isAdminData || emailAdmin || metaAdmin);
    const grandfathered = isGrandfatheredUser(user?.email);
    setIsAdmin(effectiveAdmin);
    setIsTestAccount(isTestData || false);
    setIsGrandfathered(grandfathered);
    if (effectiveAdmin) {
      fetchAllRestaurants();
    } else {
      fetchRestaurant();
    }
  };
  const fetchAllRestaurants = async () => {
    const {
      data
    } = await (supabase as any).from("restaurants").select("id, restaurant_name, custom_slug, stripe_portal_url, subscription_status, plan_type, next_billing_date, type, greeting_name").order("restaurant_name");
    if (data && data.length > 0) {
      setAllRestaurants(data);
      // Auto-select first restaurant so admin can see content
      setRestaurant(data[0]);
      fetchLocations(data[0].id);
    }
  };
  const fetchRestaurant = async () => {
    const {
      data
    } = await (supabase as any).from("restaurants").select("*").eq("owner_id", user?.id).single();
    if (data) {
      setRestaurant(data as any);
      fetchLocations(data.id);
    } else if (user?.email === 'test@me.com') {
      // Defensive fallback for test account only - auto-assign if no restaurant found
      console.log('[Dashboard] Test account has no restaurant, attempting auto-assignment');
      try {
        const {
          error: assignError
        } = await supabase.functions.invoke('assign-test-owner');
        if (assignError) {
          console.error('[Dashboard] Failed to assign test restaurant:', assignError);
          toast.error("Failed to link test account. Please contact support.");
        } else {
          // Retry fetch after assignment
          const {
            data: retryData
          } = await (supabase as any).from("restaurants").select("*").eq("owner_id", user?.id).single();
          if (retryData) {
            setRestaurant(retryData as any);
            fetchLocations(retryData.id);
            toast.success("Test account linked successfully!");
          }
        }
      } catch (err) {
        console.error('[Dashboard] Error in defensive fallback:', err);
      }
    } else if (isGrandfatheredUser(user?.email)) {
      // Grandfathered user without restaurant - redirect to onboarding
      console.log('[Dashboard] Grandfathered user has no restaurant, redirecting to onboarding');
      toast.info("Please complete your business setup");
      navigate("/onboarding");
    }
  };
  const fetchLocations = async (restaurantId: string) => {
    const {
      data
    } = await (supabase as any).from("locations").select("id, name, custom_slug").eq("restaurant_id", restaurantId).eq("is_active", true).order("name");
    if (data && data.length > 0) {
      setLocations(data);
      setSelectedLocation(data[0].id);
    }
  };
  const handleRestaurantChange = (restaurantId: string) => {
    const selected = allRestaurants.find(r => r.id === restaurantId);
    if (selected) {
      setRestaurant(selected);
      fetchLocations(selected.id);
    }
  };
  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  }

  // Check if user should bypass paywall
  const planType = restaurant?.plan_type || 'standard';
  const shouldBypassPaywall = isAdmin || isGrandfathered || planType === 'bundle' || planType === 'private_access' || user?.email === 'test@me.com';
  if (!loading && user && !restaurant && !shouldBypassPaywall) {
    return <div className="min-h-screen bg-background">
        <nav className="border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary"></div>
              <span className="font-bold text-xl">TapAway</span>
            </div>
            <Button variant="ghost" onClick={signOut}>Sign Out</Button>
          </div>
        </nav>
        
        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Welcome to TapAway</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Choose the perfect plan for your business and start collecting reviews in minutes
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {/* Monthly Plan */}
            <Card className="p-6 hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/50">
              <div className="mb-6">
                <h3 className="text-xl font-bold mb-2">Monthly</h3>
                <p className="text-sm text-muted-foreground">Perfect for getting started</p>
              </div>
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">$29</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </div>
              <Button className="w-full" size="lg" onClick={() => window.location.href = 'https://buy.stripe.com/fZu14n7tZbXRgSl5QugYU05'}>
                Get Started
              </Button>
              <ul className="mt-6 space-y-3">
                <li className="flex items-center gap-2 text-sm">
                  <svg className="w-5 h-5 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  1 Location
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <svg className="w-5 h-5 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Custom Review Hub
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <svg className="w-5 h-5 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Analytics Dashboard
                </li>
              </ul>
            </Card>

            {/* Yearly Plan - Popular */}
            <Card className="p-6 border-2 border-primary shadow-lg relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-bold shadow-md">
                Most Popular
              </div>
              <div className="mb-6">
                <h3 className="text-xl font-bold mb-2">Yearly</h3>
                <p className="text-sm text-muted-foreground">Best value - save $99!</p>
              </div>
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">$249</span>
                  <span className="text-muted-foreground">/year</span>
                </div>
                <p className="text-sm text-primary font-medium mt-1">Save $99 per year</p>
              </div>
              <Button className="w-full" size="lg" onClick={() => window.location.href = 'https://buy.stripe.com/4gM7sLcOj2nhcC52EigYU06'}>
                Get Started
              </Button>
              <ul className="mt-6 space-y-3">
                <li className="flex items-center gap-2 text-sm">
                  <svg className="w-5 h-5 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  1 Location
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <svg className="w-5 h-5 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Custom Review Hub
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <svg className="w-5 h-5 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Analytics Dashboard
                </li>
              </ul>
            </Card>

            {/* Bundle Plan */}
            <Card className="p-6 hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/50">
              <div className="mb-6">
                <h3 className="text-xl font-bold mb-2">Multi-Location</h3>
                <p className="text-sm text-muted-foreground">For growing businesses</p>
              </div>
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">$69</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </div>
              <Button className="w-full" size="lg" onClick={() => window.location.href = 'https://buy.stripe.com/3cI8wPdSn9PJeKdfr4gYU09'}>
                Get Started
              </Button>
              <ul className="mt-6 space-y-3">
                <li className="flex items-center gap-2 text-sm">
                  <svg className="w-5 h-5 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-semibold">3 Locations</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <svg className="w-5 h-5 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Custom Review Hubs
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <svg className="w-5 h-5 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Consolidated Analytics
                </li>
              </ul>
            </Card>
          </div>

          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Your dashboard will activate automatically after purchase
            </p>
            <p className="text-xs text-muted-foreground">
              Cancel anytime • No hidden fees • Money-back guarantee
            </p>
          </div>
        </div>
      </div>;
  }

  // If no restaurant is loaded yet, show loading
  if (!restaurant) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading restaurant data...</div>;
  }
  return <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-background/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <button 
            onClick={() => navigate(user ? "/dashboard" : "/")}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <span className="font-bold text-xl">TapAway</span>
          </button>
          <div className="flex items-center gap-3">
            {restaurant?.custom_slug && <Button variant="outline" size="sm" onClick={() => window.open(`/${restaurant.custom_slug}`, "_blank")}>
                <ExternalLink className="w-4 h-4 mr-2" />
                View Hub
              </Button>}
            <Button variant="ghost" onClick={signOut}>Sign Out</Button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-3 md:px-4 py-4 md:py-8">
        {isAdmin && allRestaurants.length > 0 && <Card className="p-3 md:p-4 mb-4 md:mb-6 bg-primary/5 border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              <span className="text-xs font-semibold text-primary uppercase tracking-wide">Admin Mode</span>
            </div>
            <Select value={restaurant?.id || ""} onValueChange={handleRestaurantChange}>
              <SelectTrigger className="w-full md:w-[400px]">
                <SelectValue placeholder="Select a restaurant to manage" />
              </SelectTrigger>
              <SelectContent>
                {allRestaurants.map(r => <SelectItem key={r.id} value={r.id}>
                    {r.restaurant_name}
                  </SelectItem>)}
              </SelectContent>
            </Select>
          </Card>}

        {!isAdmin && locations.length > 1 && <Card className="p-3 md:p-4 mb-4 md:mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4">
              <MapPin className="w-5 h-5 text-muted-foreground shrink-0" />
              <Select value={selectedLocation || undefined} onValueChange={setSelectedLocation}>
                <SelectTrigger className="w-full sm:w-[300px] md:w-[400px]">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map(loc => <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>)}
                </SelectContent>
              </Select>
              <span className="text-xs md:text-sm text-muted-foreground">
                {locations.length} of {restaurant?.plan_type === 'bundle' ? '3' : '1'} locations
              </span>
            </div>
          </Card>}
        
        {restaurant && <>
            <div className="mb-4 md:mb-6">
              <h1 className="text-2xl md:text-3xl font-bold">
                {restaurant.restaurant_name}
              </h1>
              <p className="text-sm md:text-base text-muted-foreground">
                {isAdmin ? `Admin Dashboard - Managing ${allRestaurants.length} restaurant${allRestaurants.length !== 1 ? 's' : ''}` : isTestAccount ? "Test Account Dashboard" : "Restaurant Dashboard"}
              </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
              <div className="overflow-x-auto -mx-3 md:mx-0 px-3 md:px-0">
                {restaurant.custom_slug === 'avmealpreps' || restaurant.type === 'meal_prep' ? <TabsList className="inline-flex min-w-full md:grid md:w-full md:grid-cols-3 h-auto gap-1">
                    <TabsTrigger value="overview" className="text-xs md:text-sm whitespace-nowrap px-3 py-2">Overview</TabsTrigger>
                    <TabsTrigger value="settings" className="text-xs md:text-sm whitespace-nowrap px-3 py-2">Settings</TabsTrigger>
                    <TabsTrigger value="billing" className="text-xs md:text-sm whitespace-nowrap px-3 py-2">Billing</TabsTrigger>
                  </TabsList> : <TabsList className="inline-flex min-w-full md:grid md:w-full md:grid-cols-4 lg:grid-cols-10 h-auto gap-1">
                    <TabsTrigger value="overview" className="text-xs md:text-sm whitespace-nowrap px-3 py-2">Overview</TabsTrigger>
                    <TabsTrigger value="ai-coach" className="text-xs md:text-sm whitespace-nowrap px-3 py-2">AI Coach</TabsTrigger>
                    <TabsTrigger value="competitors" className="text-xs md:text-sm whitespace-nowrap px-3 py-2">Competitors</TabsTrigger>
                    <TabsTrigger value="replies" className="text-xs md:text-sm whitespace-nowrap px-3 py-2">Replies</TabsTrigger>
                    <TabsTrigger value="goals" className="text-xs md:text-sm whitespace-nowrap px-3 py-2">Goals</TabsTrigger>
                    <TabsTrigger value="engagement" className="text-xs md:text-sm whitespace-nowrap px-3 py-2">Engagement</TabsTrigger>
                    <TabsTrigger value="menu" className="text-xs md:text-sm whitespace-nowrap px-3 py-2">Menu</TabsTrigger>
                    <TabsTrigger value="settings" className="text-xs md:text-sm whitespace-nowrap px-3 py-2">Settings</TabsTrigger>
                    <TabsTrigger value="support" className="text-xs md:text-sm whitespace-nowrap px-3 py-2">Support</TabsTrigger>
                    <TabsTrigger value="billing" className="text-xs md:text-sm whitespace-nowrap px-3 py-2">Billing</TabsTrigger>
                  </TabsList>}
              </div>

              <TabsContent value="overview" className="space-y-4 md:space-y-6">
                {restaurant.custom_slug === 'avmealpreps' || restaurant.type === 'meal_prep' ? <AvMealPrepDashboard restaurantId={restaurant.id} restaurantName={restaurant.restaurant_name} restaurant={restaurant} user={user} /> : <AnalyticsOverview restaurantId={restaurant.id} restaurantName={restaurant.restaurant_name} restaurant={restaurant} user={user} />}
              </TabsContent>

              {restaurant.custom_slug !== 'avmealpreps' && restaurant.type !== 'meal_prep' && <>
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

                  <TabsContent value="engagement">
                    <EngagementTab restaurantId={restaurant.id} />
                  </TabsContent>

                  <TabsContent value="menu">
                    <MenuTab restaurantId={restaurant.id} />
                  </TabsContent>

                  <TabsContent value="support">
                    <SupportTab />
                  </TabsContent>
                </>}

              <TabsContent value="settings">
                <SettingsTab restaurantId={restaurant.id} />
              </TabsContent>

              <TabsContent value="billing">
                <BillingTab restaurant={restaurant} isTestAccount={isTestAccount} isGrandfathered={isGrandfathered} />
              </TabsContent>
            </Tabs>
          </>}
      </div>
    </div>;
};
export default Dashboard;