import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface RestaurantPreflight {
  id: string;
  restaurant_name: string;
  custom_slug: string | null;
  is_demo_account: boolean;
  owner_name: string | null;
}

export const AdminPreflight = () => {
  const [restaurants, setRestaurants] = useState<RestaurantPreflight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('restaurants')
      .select('id, restaurant_name, custom_slug, is_demo_account, owner_name')
      .order('restaurant_name', { ascending: true });

    if (error) {
      toast.error("Failed to fetch restaurants");
      console.error(error);
      return;
    }

    if (data) {
      setRestaurants(data);
    }
    setLoading(false);
  };

  const stagingUrl = "https://tapaway-review.lovable.app";
  const productionUrl = "https://tapaway.co";

  // Check for slug issues
  const restaurantsWithoutSlug = restaurants.filter(r => !r.custom_slug);
  const slugs = restaurants.map(r => r.custom_slug).filter(Boolean);
  const duplicateSlugs = slugs.filter((slug, index) => slugs.indexOf(slug) !== index);

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <CardTitle>Review Hub Preflight Checklist</CardTitle>
          <CardDescription>
            Test all review hubs before DNS cutover to tapaway.co. Each hub is currently accessible at both staging 
            (tapaway-review.lovable.app) and will be at production (tapaway.co) after DNS migration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">Total Hubs</p>
                <p className="text-2xl font-bold">{restaurants.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {restaurantsWithoutSlug.length > 0 ? (
                <AlertCircle className="w-5 h-5 text-orange-600" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              )}
              <div>
                <p className="text-sm font-medium">Missing Slugs</p>
                <p className="text-2xl font-bold">{restaurantsWithoutSlug.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {duplicateSlugs.length > 0 ? (
                <AlertCircle className="w-5 h-5 text-red-600" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              )}
              <div>
                <p className="text-sm font-medium">Duplicate Slugs</p>
                <p className="text-2xl font-bold">{duplicateSlugs.length}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Issues Cards */}
      {restaurantsWithoutSlug.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Restaurants Missing Custom Slug
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {restaurantsWithoutSlug.map(r => (
                <li key={r.id} className="text-sm text-orange-800">
                  • {r.restaurant_name} (ID: {r.id})
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {duplicateSlugs.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Duplicate Slugs Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {[...new Set(duplicateSlugs)].map(slug => (
                <li key={slug} className="text-sm text-red-800">
                  • {slug}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Restaurants Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Review Hubs</CardTitle>
          <CardDescription>
            Click "Test Staging" to open the hub at tapaway-review.lovable.app. 
            After DNS cutover, these will be accessible at tapaway.co/{'{slug}'}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Restaurant</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Custom Slug</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Production URL (Post-DNS)</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {restaurants.map((restaurant) => (
                    <TableRow key={restaurant.id}>
                      <TableCell className="font-medium">{restaurant.restaurant_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {restaurant.owner_name || "—"}
                      </TableCell>
                      <TableCell>
                        {restaurant.custom_slug ? (
                          <code className="px-2 py-1 bg-gray-100 rounded text-sm">
                            {restaurant.custom_slug}
                          </code>
                        ) : (
                          <Badge variant="destructive" className="text-xs">Missing</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {restaurant.is_demo_account ? (
                          <Badge variant="secondary" className="text-xs">Demo</Badge>
                        ) : (
                          <Badge variant="default" className="text-xs">Live</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {restaurant.custom_slug ? (
                          <code className="text-xs text-muted-foreground">
                            {productionUrl}/{restaurant.custom_slug}
                          </code>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {restaurant.custom_slug ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`${stagingUrl}/${restaurant.custom_slug}`, "_blank")}
                          >
                            <ExternalLink className="w-4 h-4 mr-1" />
                            Test Staging
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">No slug</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions Card */}
      <Card>
        <CardHeader>
          <CardTitle>Pre-DNS Cutover Test Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <span className="font-bold text-primary">1.</span>
              <span>
                <strong>Verify no slug conflicts:</strong> Check that "Missing Slugs" and "Duplicate Slugs" both show 0.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-primary">2.</span>
              <span>
                <strong>Test each hub:</strong> Click "Test Staging" for each restaurant and verify:
                <ul className="ml-6 mt-2 space-y-1 list-disc">
                  <li>Restaurant name and logo display correctly</li>
                  <li>All action buttons (Google, Yelp, Instagram, Directions) work</li>
                  <li>Yelp icon is not warped and looks consistent</li>
                  <li>Menu opens and displays correctly</li>
                </ul>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-primary">3.</span>
              <span>
                <strong>Check analytics:</strong> After clicking buttons, verify events appear in the dashboard Analytics tab.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-primary">4.</span>
              <span>
                <strong>Special checks:</strong>
                <ul className="ml-6 mt-2 space-y-1 list-disc">
                  <li>Victor's Las Islas (Salem, Woodburn, Portland) - all three locations work</li>
                  <li>Sonia's Las Islas Marías - works correctly</li>
                  <li>AVMealPrep - hub loads and Telegram bot integration still functional</li>
                </ul>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-primary">5.</span>
              <span>
                <strong>When ready:</strong> Once all tests pass, update DNS for tapaway.co to point to Lovable. 
                No code changes should be needed - hubs will automatically work at tapaway.co/{'{slug}'}.
              </span>
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
};
