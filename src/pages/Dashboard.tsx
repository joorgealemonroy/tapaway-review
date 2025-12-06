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
import { isGrandfatheredUser, isSuperAdmin } from "@/lib/grandfatheredUsers";
import { isTestAccount as checkIsTestAccount } from "@/lib/testAccounts";
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
  total_taps?: number;
  is_demo_account?: boolean;
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
  const [isTestAccountFlag, setIsTestAccountFlag] = useState(false);
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
    const isTestAcc = checkIsTestAccount(user?.email);
    setIsAdmin(effectiveAdmin);
    setIsTestAccountFlag(isTestAcc);
    setIsGrandfathered(grandfathered);
    if (effectiveAdmin) {
      fetchAllRestaurants();
    } else {
      fetchRestaurant();
    }
  };
  const fetchAllRestaurants = async () => {
    // Get all restaurants
    const { data: allRestaurantsData } = await (supabase as any)
      .from("restaurants")
      .select("id, restaurant_name, custom_slug, stripe_portal_url, subscription_status, plan_type, next_billing_date, type, greeting_name, is_demo_account")
      .order("restaurant_name");

    if (!allRestaurantsData || allRestaurantsData.length === 0) return;

    // Get tap counts
    const restaurantIds = allRestaurantsData.map((r: Restaurant) => r.id);
    const { data: tapCounts } = await supabase
      .from("analytics_events")
      .select("restaurant_id")
      .eq("event_type", "tap")
      .in("restaurant_id", restaurantIds);

    // Count taps per restaurant
    const tapsMap: Record<string, number> = {};
    (tapCounts ?? []).forEach((event: any) => {
      tapsMap[event.restaurant_id] = (tapsMap[event.restaurant_id] ?? 0) + 1;
    });

    // Add tap counts to ALL restaurants (no filtering)
    const restaurantsWithTaps = allRestaurantsData.map((r: Restaurant) => ({
      ...r,
      total_taps: tapsMap[r.id] ?? 0
    }));

    if (restaurantsWithTaps.length > 0) {
      setAllRestaurants(restaurantsWithTaps);
      // Auto-select first restaurant
      setRestaurant(restaurantsWithTaps[0]);
      fetchLocations(restaurantsWithTaps[0].id);
    }
  };
  const fetchRestaurant = async () => {
    // Fetch ALL restaurants for this user (they may have multiple locations)
    const { data: restaurants } = await (supabase as any)
      .from("restaurants")
      .select("*")
      .eq("owner_id", user?.id);
    
    // Find a completed restaurant with active subscription, or just any completed one
    const completedRestaurants = restaurants?.filter((r: any) => r.onboarding_completed === true) || [];
    const activeRestaurant = completedRestaurants.find((r: any) => r.subscription_status === 'active') || completedRestaurants[0];
    
    if (activeRestaurant) {
      setRestaurant(activeRestaurant as any);
      
      // If user has multiple restaurants, set them all for potential switcher
      if (completedRestaurants.length > 1) {
        setAllRestaurants(completedRestaurants);
      }
      
      fetchLocations(activeRestaurant.id);

      // Check subscription status and redirect to paywall if needed
      if (!isAdmin && activeRestaurant.subscription_status !== 'active') {
        navigate("/paywall");
        return;
      }
    } else if (restaurants && restaurants.length > 0) {
      // Has restaurants but none completed - redirect to onboarding
      console.log('[Dashboard] Onboarding incomplete, redirecting to /onboarding');
      navigate("/onboarding");
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
          } = await (supabase as any).from("restaurants").select("*").eq("owner_id", user?.id).limit(1);
          if (retryData && retryData[0]) {
            setRestaurant(retryData[0] as any);
            fetchLocations(retryData[0].id);
            toast.success("Test account linked successfully!");
          }
        }
      } catch (err) {
        console.error('[Dashboard] Error in defensive fallback:', err);
      }
    } else if (isGrandfatheredUser(user?.email)) {
      // Grandfathered user without restaurant - redirect to onboarding
      console.log('[Dashboard] Grandfathered user has no restaurant, redirecting to onboarding');
      navigate("/onboarding");
    } else if (isSuperAdmin(user?.email)) {
      // Super admin without restaurant - that's fine, they can still access admin dashboard
      console.log('[Dashboard] Super admin accessing dashboard without restaurant');
    } else {
      // Regular user without restaurant - redirect to paywall to subscribe
      console.log('[Dashboard] User has no restaurant, redirecting to paywall');
      navigate("/paywall");
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
  const superAdmin = isSuperAdmin(user?.email);
  const shouldBypassPaywall = superAdmin || isAdmin || isGrandfathered || planType === 'bundle' || planType === 'private_access' || user?.email === 'test@me.com';
  
  // If no restaurant and not a special user, redirect to paywall (handled in fetchRestaurant)
  // If no restaurant is loaded yet, show loading
  if (!restaurant) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
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
        {/* Admin restaurant switcher */}
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
                {allRestaurants.map(r => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.restaurant_name} {r.is_demo_account && '(TEST)'} ({r.total_taps?.toLocaleString() ?? 0} taps)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Card>}

        {/* Multi-location user switcher (non-admin users with multiple restaurants) */}
        {!isAdmin && allRestaurants.length > 1 && <Card className="p-3 md:p-4 mb-4 md:mb-6 bg-secondary/50 border-border">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Your Locations</span>
            </div>
            <Select value={restaurant?.id || ""} onValueChange={handleRestaurantChange}>
              <SelectTrigger className="w-full md:w-[400px]">
                <SelectValue placeholder="Select a location" />
              </SelectTrigger>
              <SelectContent>
                {allRestaurants.map(r => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.restaurant_name}
                  </SelectItem>
                ))}
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
        
        {/* Test Account Banner */}
        {isTestAccountFlag && (
          <div className="mb-3 rounded-xl bg-amber-50 px-4 py-2 text-xs text-amber-800 border border-amber-200">
            You're using a <strong>TapAway test account</strong>. Data here is for internal testing only.
          </div>
        )}

        {restaurant && <>
            <div className="mb-4 md:mb-6">
              <h1 className="text-2xl md:text-3xl font-bold">
                {restaurant.restaurant_name}
              </h1>
              <p className="text-sm md:text-base text-muted-foreground">
                {isAdmin ? `Admin Dashboard - Managing ${allRestaurants.length} restaurant${allRestaurants.length !== 1 ? 's' : ''}` : isTestAccountFlag ? "Test Account Dashboard" : "Restaurant Dashboard"}
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
                    <AICoachTab restaurantId={restaurant.id} />
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
                <BillingTab restaurant={restaurant} isTestAccount={isTestAccountFlag} isGrandfathered={isGrandfathered} />
              </TabsContent>
            </Tabs>
          </>}
      </div>
    </div>;
};
export default Dashboard;