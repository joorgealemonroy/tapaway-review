import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Star, Navigation, Instagram, Menu, ExternalLink } from "lucide-react";

interface Restaurant {
  id: string;
  restaurant_name: string;
  header_title: string;
  header_subtitle: string;
  menu_title: string;
  google_review_url: string | null;
  yelp_review_url: string | null;
  directions_url: string | null;
  instagram_url: string | null;
  logo_url: string | null;
}

interface MenuSection {
  id: string;
  name: string;
  items: MenuItem[];
}

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: string | null;
}

const ReviewHub = () => {
  const { restaurantId } = useParams();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuSections, setMenuSections] = useState<MenuSection[]>([]);

  useEffect(() => {
    if (restaurantId) {
      fetchRestaurant();
      fetchMenu();
    }
  }, [restaurantId]);

  const fetchRestaurant = async () => {
    const { data } = await supabase
      .from("restaurants")
      .select("id, restaurant_name, header_title, header_subtitle, menu_title, google_review_url, yelp_review_url, directions_url, instagram_url, logo_url")
      .eq("id", restaurantId)
      .single();

    if (data) {
      setRestaurant(data);
    }
  };

  const fetchMenu = async () => {
    const { data: sections } = await supabase
      .from("menu_sections")
      .select(`
        *,
        menu_items (*)
      `)
      .eq("restaurant_id", restaurantId)
      .order("sort_order");

    if (sections) {
      setMenuSections(sections.map(s => ({
        ...s,
        items: s.menu_items || []
      })));
    }
  };

  const trackEvent = (eventName: string) => {
    // Placeholder for Fathom analytics
    console.log("Track event:", eventName);
  };

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 shadow-2xl">
        {restaurant.logo_url ? (
          <img src={restaurant.logo_url} alt="Logo" className="w-20 h-20 rounded-lg mx-auto mb-6" />
        ) : (
          <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center mx-auto mb-6">
            <span className="text-xs text-muted-foreground text-center">Your Logo Here</span>
          </div>
        )}

        <h1 className="text-2xl font-bold text-center mb-2">{restaurant.header_title}</h1>
        <p className="text-muted-foreground text-center mb-8">{restaurant.header_subtitle}</p>

        <div className="space-y-3">
          {restaurant.google_review_url && (
            <Button
              className="w-full"
              size="lg"
              onClick={() => {
                trackEvent("tap_google_review");
                window.open(restaurant.google_review_url!, "_blank");
              }}
            >
              <Star className="w-5 h-5" />
              Google Reviews
            </Button>
          )}

          {restaurant.yelp_review_url && (
            <Button
              className="w-full"
              variant="secondary"
              size="lg"
              onClick={() => {
                trackEvent("tap_yelp_review");
                window.open(restaurant.yelp_review_url!, "_blank");
              }}
            >
              <Star className="w-5 h-5" />
              Yelp Reviews
            </Button>
          )}

          {restaurant.directions_url && (
            <Button
              className="w-full"
              variant="outline"
              size="lg"
              onClick={() => {
                trackEvent("tap_directions");
                window.open(restaurant.directions_url!, "_blank");
              }}
            >
              <Navigation className="w-5 h-5" />
              Directions
            </Button>
          )}

          {restaurant.instagram_url && (
            <Button
              className="w-full"
              variant="outline"
              size="lg"
              onClick={() => {
                trackEvent("tap_instagram");
                window.open(restaurant.instagram_url!, "_blank");
              }}
            >
              <Instagram className="w-5 h-5" />
              Instagram
            </Button>
          )}

          <Button
            className="w-full"
            variant="outline"
            size="lg"
            onClick={() => {
              trackEvent("tap_menu");
              setMenuOpen(true);
            }}
          >
            <Menu className="w-5 h-5" />
            {restaurant.menu_title}
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Powered by{" "}
          <a
            href="https://tapaway.co/demo"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
            onClick={() => trackEvent("tap_demo")}
          >
            TapAway
          </a>
        </p>
      </Card>

      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{restaurant.menu_title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {menuSections.map((section) => (
              <div key={section.id}>
                <h3 className="font-semibold text-lg mb-3 border-b pb-2">{section.name}</h3>
                <div className="space-y-3">
                  {section.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium">{item.name}</p>
                        {item.description && (
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        )}
                      </div>
                      {item.price && <p className="font-semibold ml-4">{item.price}</p>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {menuSections.length === 0 && (
              <p className="text-center text-muted-foreground py-8">Menu coming soon...</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReviewHub;
