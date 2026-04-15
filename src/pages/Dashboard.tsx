import { useEffect, useState, lazy, Suspense } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AdminViewBanner } from "@/components/admin/AdminViewBanner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalLink, MapPin, Eye, Sun, Moon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AnalyticsOverview } from "@/components/dashboard/AnalyticsOverview";
import { MenuTab } from "@/components/dashboard/MenuTab";
import { SettingsTab } from "@/components/dashboard/SettingsTab";
import { SupportTab } from "@/components/dashboard/SupportTab";
import { BillingTab } from "@/components/dashboard/BillingTab";
import { ReviewRepliesTab } from "@/components/dashboard/ReviewRepliesTab";
import { EngagementTab } from "@/components/dashboard/EngagementTab";
import { AvMealPrepDashboard } from "@/components/dashboard/AvMealPrepDashboard";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { BusinessMobileNav } from "@/components/dashboard/BusinessMobileNav";

import { isGrandfatheredUser, isSuperAdmin } from "@/lib/grandfatheredUsers";
import { isTestAccount as checkIsTestAccount } from "@/lib/testAccounts";
import { useSalesRep } from "@/hooks/useSalesRep";
import { isSubscriptionAllowed } from "@/lib/subscriptionStatus";

const PersonalDashboard = lazy(() => import("./personal/PersonalDashboard"));

const Dashboard = () => {
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [routeDecision, setRouteDecision] = useState<"lite" | "business" | "checking">("checking");
  
  // Explicit lite params
  const isLiteParam = searchParams.get('type') === 'lite';
  const adminViewPersonalId = searchParams.get('admin_view_personal');
  // Explicit business params
  const adminViewId = searchParams.get('admin_view');
  const demoRestaurantId = searchParams.get('demo_restaurant_id');

  useEffect(() => {
    // If explicit params, decide immediately
    if (isLiteParam || adminViewPersonalId) {
      setRouteDecision("lite");
      return;
    }
    if (adminViewId || demoRestaurantId) {
      setRouteDecision("business");
      return;
    }
    
    // Otherwise, check what accounts the user has
    if (authLoading || !user) return;
    
    const decide = async () => {
      const [restaurantResult, personalResult] = await Promise.all([
        supabase
          .from("restaurants")
          .select("id, onboarding_completed, plan_type")
          .eq("owner_id", user.id)
          .limit(1),
        supabase
          .from("personal_profiles")
          .select("id")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle(),
      ]);
      
      const hasCompletedRestaurant = restaurantResult.data?.some(r => r.onboarding_completed && r.plan_type !== 'solo');
      const hasPersonal = !!personalResult.data;
      
      const hasAnyRestaurant = (restaurantResult.data?.length ?? 0) > 0;
      
      if (hasCompletedRestaurant) {
        setRouteDecision("business");
      } else if (hasPersonal) {
        setRouteDecision("lite");
      } else if (hasAnyRestaurant) {
        // Has restaurant but not completed — let DashboardBusiness handle onboarding
        setRouteDecision("business");
      } else {
        // No restaurant at all — default to lite (prevents wrong dashboard flash)
        setRouteDecision("lite");
      }
    };
    
    decide();
  }, [authLoading, user, isLiteParam, adminViewPersonalId, adminViewId, demoRestaurantId]);

  if (routeDecision === "checking") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (routeDecision === "lite") {
    return (
      <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
        <PersonalDashboard />
      </Suspense>
    );
  }

  return <DashboardBusiness />;
};

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
  created_at?: string;
  menu_image_url?: string | null;
  google_review_url?: string | null;
  yelp_review_url?: string | null;
}
interface DashboardLocation {
  id: string;
  name: string;
  custom_slug: string | null;
}

const DashboardBusiness = () => {
  const {
    user,
    loading,
    signOut
  } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isSalesRep, loading: repLoading } = useSalesRep();
  
  // Demo mode detection - check URL param synchronously
  const demoRestaurantId = searchParams.get('demo_restaurant_id');
  const adminViewId = searchParams.get('admin_view');
  const [isDemoView, setIsDemoView] = useState(!!demoRestaurantId);
  const [demoLoading, setDemoLoading] = useState(!!demoRestaurantId);
  const [isAdminView, setIsAdminView] = useState(false);
  const [adminViewName, setAdminViewName] = useState("");
  
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [allRestaurants, setAllRestaurants] = useState<Restaurant[]>([]);
  const [locations, setLocations] = useState<DashboardLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isTestAccountFlag, setIsTestAccountFlag] = useState(false);
  const [isGrandfathered, setIsGrandfathered] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [theme, setTheme] = useState(() => localStorage.getItem('tapaway_dashboard_theme') || 'dark');

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('tapaway_dashboard_theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  };

  // Handle admin impersonation mode - load restaurant by ID
  useEffect(() => {
    const loadAdminView = async () => {
      if (!adminViewId || !user) return;

      const { data: isAdminData } = await supabase.rpc("is_admin");
      if (!isAdminData) return;

      const { data: r, error } = await supabase
        .from("restaurants")
        .select("*")
        .eq("id", adminViewId)
        .maybeSingle();

      if (error || !r) {
        toast.error("Restaurant not found");
        navigate("/admin");
        return;
      }

      setIsAdminView(true);
      setAdminViewName(r.restaurant_name || "Unknown");
      setRestaurant({
        id: r.id,
        restaurant_name: r.restaurant_name,
        custom_slug: r.custom_slug,
        stripe_portal_url: r.stripe_portal_url,
        subscription_status: r.subscription_status,
        plan_type: r.plan_type,
        next_billing_date: r.next_billing_date,
        type: r.type,
        greeting_name: r.greeting_name,
        is_demo_account: r.is_demo_account ?? false,
        created_at: r.created_at,
        menu_image_url: r.menu_image_url,
        google_review_url: r.google_review_url,
        yelp_review_url: r.yelp_review_url,
      });
      fetchLocations(r.id);
    };

    if (adminViewId && user) {
      loadAdminView();
    }
  }, [adminViewId, user, navigate]);

  // Handle demo mode for sales reps - load demo restaurant first
  useEffect(() => {
    const loadDemoRestaurant = async () => {
      if (!demoRestaurantId || !user) {
        setDemoLoading(false);
        return;
      }
      
      // Fetch the demo restaurant
      const { data: demoRestaurant, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', demoRestaurantId)
        .eq('is_demo_account', true)
        .maybeSingle();
      
      if (error || !demoRestaurant) {
        toast.error("Demo restaurant not found");
        setIsDemoView(false);
        setDemoLoading(false);
        navigate('/rep');
        return;
      }
      
      // Sales rep accessing demo - allow it
      setIsDemoView(true);
      setRestaurant(demoRestaurant as Restaurant);
      fetchLocations(demoRestaurant.id);
      setDemoLoading(false);
    };
    
    if (demoRestaurantId && user) {
      loadDemoRestaurant();
    } else if (!demoRestaurantId) {
      setDemoLoading(false);
    }
  }, [demoRestaurantId, user, navigate]);
  
  useEffect(() => {
    // Skip normal auth redirect if in demo mode or admin view
    if (demoRestaurantId || adminViewId) return;
    
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate, demoRestaurantId, adminViewId]);
  
  // Only fetch normal restaurant data if NOT in demo or admin view mode
  useEffect(() => {
    // Wait for demo loading to complete first
    if (demoLoading) return;
    // Skip if in demo mode or admin view (already loaded)
    if (isDemoView || demoRestaurantId || adminViewId) return;
    if (user && !restaurant) {
      checkAdminStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isDemoView, demoLoading, demoRestaurantId, adminViewId]);
  const checkAdminStatus = async () => {
    const { data: isAdminData } = await supabase.rpc('is_admin');
    const { data: isTestData } = await supabase.rpc('is_test_account');
    const emailAdmin = user?.email === 'tap@tapaway.co';
    // Check app_metadata safely
    const userMetadata = user?.app_metadata as Record<string, unknown> | undefined;
    const metaAdmin = userMetadata?.role === 'admin';
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
    const { data: allRestaurantsData } = await supabase
      .from("restaurants")
      .select("id, restaurant_name, custom_slug, stripe_portal_url, subscription_status, plan_type, next_billing_date, type, greeting_name, is_demo_account, created_at, menu_image_url, google_review_url, yelp_review_url")
      .order("restaurant_name");

    if (!allRestaurantsData || allRestaurantsData.length === 0) return;

    // Get tap counts
    const restaurantIds = allRestaurantsData.map((r) => r.id);
    const { data: tapCounts } = await supabase
      .from("analytics_events")
      .select("restaurant_id")
      .eq("event_type", "tap")
      .in("restaurant_id", restaurantIds);

    // Count taps per restaurant
    const tapsMap: Record<string, number> = {};
    (tapCounts ?? []).forEach((event) => {
      tapsMap[event.restaurant_id] = (tapsMap[event.restaurant_id] ?? 0) + 1;
    });

    // Add tap counts to ALL restaurants (no filtering)
    const restaurantsWithTaps: Restaurant[] = allRestaurantsData.map((r) => ({
      id: r.id,
      restaurant_name: r.restaurant_name,
      custom_slug: r.custom_slug,
      stripe_portal_url: r.stripe_portal_url,
      subscription_status: r.subscription_status,
      plan_type: r.plan_type,
      next_billing_date: r.next_billing_date,
      type: r.type,
      greeting_name: r.greeting_name,
      is_demo_account: r.is_demo_account ?? false,
      created_at: r.created_at,
      menu_image_url: r.menu_image_url,
      google_review_url: r.google_review_url,
      yelp_review_url: r.yelp_review_url,
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
    const { data: restaurants } = await supabase
      .from("restaurants")
      .select("*")
      .eq("owner_id", user?.id ?? '');
    
    // Find a completed restaurant with allowed subscription, or just any completed one
    const completedRestaurants = restaurants?.filter((r) => r.onboarding_completed === true) || [];
    const activeRestaurant = completedRestaurants.find((r) => isSubscriptionAllowed(r.subscription_status)) || completedRestaurants[0];
    
    if (activeRestaurant) {
      const mapped: Restaurant = {
        id: activeRestaurant.id,
        restaurant_name: activeRestaurant.restaurant_name,
        custom_slug: activeRestaurant.custom_slug,
        stripe_portal_url: activeRestaurant.stripe_portal_url,
        subscription_status: activeRestaurant.subscription_status,
        plan_type: activeRestaurant.plan_type,
        next_billing_date: activeRestaurant.next_billing_date,
        type: activeRestaurant.type,
        greeting_name: activeRestaurant.greeting_name,
        is_demo_account: activeRestaurant.is_demo_account ?? false,
        created_at: activeRestaurant.created_at,
        menu_image_url: activeRestaurant.menu_image_url,
        google_review_url: activeRestaurant.google_review_url,
        yelp_review_url: activeRestaurant.yelp_review_url,
      };
      setRestaurant(mapped);
      
      // If user has multiple restaurants, set them all for potential switcher
      if (completedRestaurants.length > 1) {
        setAllRestaurants(completedRestaurants.map((r) => ({
          id: r.id,
          restaurant_name: r.restaurant_name,
          custom_slug: r.custom_slug,
          stripe_portal_url: r.stripe_portal_url,
          subscription_status: r.subscription_status,
          plan_type: r.plan_type,
          next_billing_date: r.next_billing_date,
          type: r.type,
          greeting_name: r.greeting_name,
          is_demo_account: r.is_demo_account ?? false,
          created_at: r.created_at,
          menu_image_url: r.menu_image_url,
          google_review_url: r.google_review_url,
          yelp_review_url: r.yelp_review_url,
        })));
      }
      
      fetchLocations(activeRestaurant.id);

      // Check subscription status and redirect to onboarding if blocked
      if (!isAdmin && !isSubscriptionAllowed(activeRestaurant.subscription_status)) {
        navigate("/onboarding");
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
        const { error: assignError } = await supabase.functions.invoke('assign-test-owner');
        if (assignError) {
          console.error('[Dashboard] Failed to assign test restaurant:', assignError);
          toast.error("Failed to link test account. Please contact support.");
        } else {
          // Retry fetch after assignment
          const { data: retryData } = await supabase.from("restaurants").select("*").eq("owner_id", user?.id ?? '').limit(1);
          if (retryData && retryData[0]) {
            const r = retryData[0];
            setRestaurant({
              id: r.id,
              restaurant_name: r.restaurant_name,
              custom_slug: r.custom_slug,
              stripe_portal_url: r.stripe_portal_url,
              subscription_status: r.subscription_status,
              plan_type: r.plan_type,
              next_billing_date: r.next_billing_date,
              type: r.type,
              greeting_name: r.greeting_name,
              is_demo_account: r.is_demo_account ?? false,
              created_at: r.created_at,
              menu_image_url: r.menu_image_url,
              google_review_url: r.google_review_url,
              yelp_review_url: r.yelp_review_url,
            });
            fetchLocations(r.id);
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
      // No restaurant found — redirect to onboarding
      console.log('[Dashboard] User has no restaurant, redirecting to onboarding');
      navigate("/onboarding");
    }
  };
  const fetchLocations = async (restaurantId: string) => {
    const { data } = await supabase
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
    const selected = allRestaurants.find(r => r.id === restaurantId);
    if (selected) {
      setRestaurant(selected);
      fetchLocations(selected.id);
    }
  };
  // Show loading while demo mode or auth is loading
  if (loading || demoLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  }

  // Check if user should bypass paywall - DEMO MODE ALWAYS BYPASSES
  const planType = restaurant?.plan_type || 'standard';
  const superAdmin = isSuperAdmin(user?.email);
  const shouldBypassPaywall = isDemoView || isAdminView || superAdmin || isAdmin || isGrandfathered || planType === 'bundle' || planType === 'private_access' || user?.email === 'test@me.com';
  
  // If no restaurant and not a special user, redirect to paywall (handled in fetchRestaurant)
  // But NEVER redirect in demo mode
  // If no restaurant is loaded yet, show loading
  if (!restaurant) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  }
  return <div className="min-h-screen bg-background pb-20 md:pb-0">
      {isAdminView && (
        <AdminViewBanner name={adminViewName} backTo="/admin" />
      )}
      <nav className="border-b border-border bg-background/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <button 
            onClick={() => navigate(user ? "/dashboard" : "/")}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <span className="font-bold text-xl">TapAway</span>
          </button>
          <div className="flex items-center gap-3">
            
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full" aria-label="Toggle theme">
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            {restaurant?.custom_slug && <Button variant="outline" size="sm" className="hidden md:inline-flex" onClick={() => window.open(`/${restaurant.custom_slug}`, "_blank")}>
                <ExternalLink className="w-4 h-4 mr-2" />
                View Hub
              </Button>}
            <Button variant="ghost" size="sm" className="hidden md:inline-flex" onClick={signOut}>Sign Out</Button>
            <Button variant="ghost" size="icon" className="md:hidden" onClick={signOut}>
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-3 md:px-4 py-4 md:py-8">
        {/* Demo Mode Banner */}
        {isDemoView && (
          <Card className="p-3 md:p-4 mb-4 md:mb-6 bg-amber-50 border-amber-200">
            <div className="flex items-center gap-2 mb-1">
              <Eye className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Demo Mode (Read-Only)</span>
            </div>
            <p className="text-sm text-amber-700">
              You're viewing a demo restaurant. All data is read-only — no changes can be made.
            </p>
          </Card>
        )}

        {/* Admin restaurant switcher */}
        {isAdmin && !isDemoView && allRestaurants.length > 0 && <Card className="p-3 md:p-4 mb-4 md:mb-6 bg-primary/5 border-primary/20">
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
                {isDemoView 
                  ? "Demo Dashboard (Read-Only)" 
                  : isAdmin 
                    ? `Admin Dashboard - Managing ${allRestaurants.length} restaurant${allRestaurants.length !== 1 ? 's' : ''}` 
                    : isTestAccountFlag 
                      ? "Test Account Dashboard" 
                      : "Restaurant Dashboard"}
              </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
              <div className="overflow-x-auto -mx-3 md:mx-0 px-3 md:px-0 hidden md:block">
                {restaurant.custom_slug === 'avmealpreps' || restaurant.type === 'meal_prep' ? (
                  <TabsList className={`inline-flex min-w-full md:grid md:w-full ${isDemoView ? 'md:grid-cols-1' : 'md:grid-cols-3'} h-auto gap-1`}>
                    <TabsTrigger value="overview" className="text-sm whitespace-nowrap px-3 py-2">Overview</TabsTrigger>
                    {!isDemoView && (
                      <>
                        <TabsTrigger value="settings" className="text-sm whitespace-nowrap px-3 py-2">Settings</TabsTrigger>
                        <TabsTrigger value="billing" className="text-sm whitespace-nowrap px-3 py-2">Billing</TabsTrigger>
                      </>
                    )}
                  </TabsList>
                ) : (
                  <TabsList className={`inline-flex min-w-full md:grid md:w-full ${isDemoView ? 'md:grid-cols-4' : 'md:grid-cols-7'} h-auto gap-1`}>
                    <TabsTrigger value="overview" className="text-sm whitespace-nowrap px-3 py-2">Overview</TabsTrigger>
                    <TabsTrigger value="replies" className="text-sm whitespace-nowrap px-3 py-2">Replies</TabsTrigger>
                    <TabsTrigger value="engagement" className="text-sm whitespace-nowrap px-3 py-2">Engagement</TabsTrigger>
                    <TabsTrigger value="menu" className="text-sm whitespace-nowrap px-3 py-2">Menu</TabsTrigger>
                    {!isDemoView && (
                      <>
                        <TabsTrigger value="settings" className="text-sm whitespace-nowrap px-3 py-2">Settings</TabsTrigger>
                        <TabsTrigger value="support" className="text-sm whitespace-nowrap px-3 py-2">Support</TabsTrigger>
                        <TabsTrigger value="billing" className="text-sm whitespace-nowrap px-3 py-2">Billing</TabsTrigger>
                      </>
                    )}
                  </TabsList>
                )}
              </div>

              <TabsContent value="overview" className="space-y-4 md:space-y-6">
                {/* Welcome banner for new users - hide in demo mode */}
                {!isAdmin && !isDemoView && restaurant.created_at && (
                  <WelcomeBanner
                    restaurantId={restaurant.id}
                    restaurantName={restaurant.restaurant_name}
                    createdAt={restaurant.created_at}
                    hasMenu={!!restaurant.menu_image_url}
                    hasGoogleLink={!!restaurant.google_review_url}
                    hasYelpLink={!!restaurant.yelp_review_url}
                  />
                )}
                {restaurant.custom_slug === 'avmealpreps' || restaurant.type === 'meal_prep' ? <AvMealPrepDashboard restaurantId={restaurant.id} restaurantName={restaurant.restaurant_name} restaurant={restaurant} user={user} /> : <AnalyticsOverview restaurantId={restaurant.id} restaurantName={restaurant.restaurant_name} restaurant={restaurant} user={user} isDemoView={isDemoView} />}
              </TabsContent>

              {restaurant.custom_slug !== 'avmealpreps' && restaurant.type !== 'meal_prep' && <>
                  <TabsContent value="replies">
                    <ReviewRepliesTab restaurantId={restaurant.id} isDemoView={isDemoView} />
                  </TabsContent>

                  <TabsContent value="engagement">
                    <EngagementTab restaurantId={restaurant.id} isDemoView={isDemoView} />
                  </TabsContent>

                  <TabsContent value="menu">
                    <MenuTab restaurantId={restaurant.id} isDemoView={isDemoView} />
                  </TabsContent>

                  {!isDemoView && (
                    <TabsContent value="support">
                      <SupportTab />
                    </TabsContent>
                  )}
                </>}

              {!isDemoView && (
                <>
                  <TabsContent value="settings">
                    <SettingsTab restaurantId={restaurant.id} />
                  </TabsContent>

                  <TabsContent value="billing">
                    <BillingTab restaurant={restaurant} isTestAccount={isTestAccountFlag} isGrandfathered={isGrandfathered} />
                  </TabsContent>
                </>
              )}
            </Tabs>

            {/* Mobile bottom navigation */}
            {restaurant.custom_slug !== 'avmealpreps' && restaurant.type !== 'meal_prep' && (
              <BusinessMobileNav activeTab={activeTab} onTabChange={setActiveTab} isDemoView={isDemoView} />
            )}
          </>}
      </div>
    </div>;
};
export default Dashboard;