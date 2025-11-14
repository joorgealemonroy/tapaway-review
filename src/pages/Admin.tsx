import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LogOut, Users, TrendingUp, Eye, RefreshCw, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { AdminPreflight } from "@/components/dashboard/AdminPreflight";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface Restaurant {
  id: string;
  restaurant_name: string;
  custom_slug: string | null;
  subscription_status: string | null;
  plan_type: string | null;
  is_demo_account: boolean;
  owner_id: string;
  created_at: string;
}

interface GlobalMetrics {
  totalTaps: number;
  totalGoogleClicks: number;
  totalDirections: number;
  totalMenuViews: number;
  totalRestaurants: number;
}

const Admin = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [globalMetrics, setGlobalMetrics] = useState<GlobalMetrics>({
    totalTaps: 0,
    totalGoogleClicks: 0,
    totalDirections: 0,
    totalMenuViews: 0,
    totalRestaurants: 0
  });
  const [filteredRestaurants, setFilteredRestaurants] = useState<Restaurant[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [impersonating, setImpersonating] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      checkAdminAndFetch();
    }
  }, [user]);

  useEffect(() => {
    // Filter restaurants based on search
    if (searchQuery) {
      const filtered = restaurants.filter(r => 
        r.restaurant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.custom_slug?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredRestaurants(filtered);
    } else {
      setFilteredRestaurants(restaurants);
    }
  }, [searchQuery, restaurants]);

  const checkAdminAndFetch = async () => {
    const { data: isAdminData } = await supabase.rpc('is_admin');
    
    if (!isAdminData) {
      toast.error("Access denied. Admin privileges required.");
      navigate("/dashboard");
      return;
    }

    setIsAdmin(true);
    await fetchRestaurants();
    await fetchGlobalMetrics();
  };

  const fetchRestaurants = async () => {
    const { data, error } = await (supabase as any)
      .from('restaurants')
      .select('id, restaurant_name, custom_slug, subscription_status, plan_type, is_demo_account, owner_id, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error("Failed to fetch restaurants");
      return;
    }

    if (data) {
      setRestaurants(data);
      setFilteredRestaurants(data);
    }
  };

  const fetchGlobalMetrics = async () => {
    // Fetch total restaurants count
    const { count: restaurantCount } = await supabase
      .from('restaurants')
      .select('*', { count: 'exact', head: true });

    // Fetch analytics events using any cast for analytics_events table
    const { data: events } = await (supabase as any)
      .from('analytics_events')
      .select('event_type');

    const taps = events?.filter((e: any) => e.event_type === 'tap').length || 0;
    const googleClicks = events?.filter((e: any) => e.event_type === 'google_click').length || 0;
    const directions = events?.filter((e: any) => e.event_type === 'directions_click').length || 0;
    const menuViews = events?.filter((e: any) => e.event_type === 'menu_view').length || 0;

    setGlobalMetrics({
      totalTaps: taps,
      totalGoogleClicks: googleClicks,
      totalDirections: directions,
      totalMenuViews: menuViews,
      totalRestaurants: restaurantCount || 0
    });
  };

  const handleImpersonate = (restaurantId: string, ownerEmail: string) => {
    setImpersonating(ownerEmail);
    // Store impersonation state in sessionStorage
    sessionStorage.setItem('admin_impersonating', restaurantId);
    sessionStorage.setItem('admin_impersonating_email', ownerEmail);
    navigate('/dashboard');
  };

  const seedDemoAccounts = async () => {
    const { data, error } = await supabase.functions.invoke('seed-demo-accounts');
    
    if (error) {
      toast.error("Failed to seed demo accounts: " + error.message);
      return;
    }

    toast.success(`Successfully created ${data.created} demo accounts!`);
    await fetchRestaurants();
    await fetchGlobalMetrics();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-destructive">Access Denied</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">TapAway Admin Portal</h1>
            <p className="text-sm text-muted-foreground">Superadmin Dashboard</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={seedDemoAccounts}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Seed Demo Accounts
            </Button>
            <Button variant="outline" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="metrics" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="metrics">Global Metrics</TabsTrigger>
            <TabsTrigger value="clients">All Clients</TabsTrigger>
            <TabsTrigger value="preflight">
              <ListChecks className="w-4 h-4 mr-2" />
              Hub Preflight
            </TabsTrigger>
          </TabsList>

          {/* Global Metrics Tab */}
          <TabsContent value="metrics" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Taps</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{globalMetrics.totalTaps}</div>
                  <p className="text-xs text-muted-foreground">Across all hubs</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Google Clicks</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{globalMetrics.totalGoogleClicks}</div>
                  <p className="text-xs text-muted-foreground">Review button clicks</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Directions</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{globalMetrics.totalDirections}</div>
                  <p className="text-xs text-muted-foreground">Apple Maps clicks</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Menu Views</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{globalMetrics.totalMenuViews}</div>
                  <p className="text-xs text-muted-foreground">Menu opened</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Restaurants</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{globalMetrics.totalRestaurants}</div>
                  <p className="text-xs text-muted-foreground">Active accounts</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* All Clients Tab */}
          <TabsContent value="clients" className="space-y-4">
            <div className="flex gap-4 items-center">
              <Input
                placeholder="Search restaurants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Restaurant</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRestaurants.map((restaurant) => (
                    <TableRow key={restaurant.id}>
                      <TableCell className="font-medium">{restaurant.restaurant_name}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {restaurant.custom_slug || 'No slug'}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant={restaurant.subscription_status === 'active' ? 'default' : 'secondary'}>
                          {restaurant.subscription_status || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>{restaurant.plan_type || 'N/A'}</TableCell>
                      <TableCell>
                        {restaurant.is_demo_account && (
                          <Badge variant="outline">Demo</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleImpersonate(restaurant.id, restaurant.owner_id)}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View as Client
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
