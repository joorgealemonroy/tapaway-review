import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThumbsUp, Instagram, ExternalLink } from "lucide-react";

interface Restaurant {
  id: string;
  restaurant_name: string;
  logo_url?: string | null;
  header_title?: string | null;
  header_subtitle?: string | null;
  menu_title?: string | null;
  avm_default_order_url?: string | null;
  instagram_url?: string | null;
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  calories_label: string;
  image_url: string;
  order_url: string;
}

interface AvMealPrepHubProps {
  restaurant: Restaurant;
  trackEvent: (eventName: string, eventData?: any) => Promise<void>;
}

export const AvMealPrepHub = ({ restaurant, trackEvent }: AvMealPrepHubProps) => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  useEffect(() => {
    fetchMenuItems();
  }, [restaurant.id]);

  const fetchMenuItems = async () => {
    const { data } = await supabase
      .from("avm_menu_items")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .eq("is_active", true)
      .order("sort_order");

    if (data) {
      setMenuItems(data as MenuItem[]);
    }
  };

  const handleLovedClick = () => {
    trackEvent("avm_loved_click");
  };

  const handleCouldBeBetterClick = () => {
    trackEvent("avm_could_be_better_click");
  };

  const handleOrderClick = (item: MenuItem) => {
    const url = item.order_url || restaurant.avm_default_order_url;
    if (url) {
      trackEvent("avm_order_click", { itemId: item.id, itemName: item.name });
      window.open(url, "_blank");
    }
  };

  const handleInstagramClick = () => {
    if (restaurant.instagram_url) {
      trackEvent("avm_instagram_click");
      window.open(restaurant.instagram_url, "_blank");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-12">
        {/* Header Section */}
        <div className="text-center space-y-4">
          {restaurant.logo_url && (
            <div className="flex justify-center mb-6">
              <img
                src={restaurant.logo_url}
                alt={restaurant.restaurant_name}
                className="h-24 w-24 object-contain rounded-lg"
              />
            </div>
          )}
          <h1 className="text-4xl md:text-5xl font-bold">
            {restaurant.header_title || restaurant.restaurant_name}
          </h1>
          {restaurant.header_subtitle && (
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {restaurant.header_subtitle}
            </p>
          )}
          
          {/* Instagram Button */}
          {restaurant.instagram_url && (
            <div className="pt-4">
              <Button
                onClick={handleInstagramClick}
                size="lg"
                variant="outline"
                className="gap-2"
              >
                <Instagram className="w-5 h-5" />
                Follow us on Instagram
              </Button>
            </div>
          )}
        </div>

        {/* Feedback Section */}
        <Card className="p-8 bg-card/50 backdrop-blur-sm">
          <div className="text-center space-y-6">
            <h2 className="text-2xl font-bold">How was your meal?</h2>
            <p className="text-muted-foreground">Share feedback in seconds — no login.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-2xl mx-auto">
              <Button
                onClick={handleLovedClick}
                size="lg"
                className="flex-1 h-16 text-lg bg-green-600 hover:bg-green-700 text-white"
              >
                <ThumbsUp className="w-5 h-5 mr-2" />
                Loved it! 💚
              </Button>
              <Button
                onClick={handleCouldBeBetterClick}
                size="lg"
                variant="outline"
                className="flex-1 h-16 text-lg"
              >
                Could be better
              </Button>
            </div>
          </div>
        </Card>

        {/* Menu Section */}
        {menuItems.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-center">
              {restaurant.menu_title || "Menu"}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {menuItems.map((item) => (
                <Card key={item.id} className="overflow-hidden group hover:shadow-lg transition-shadow">
                  <div className="aspect-square overflow-hidden">
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="font-semibold text-lg">{item.name}</h3>
                      <p className="text-sm text-primary font-medium">{item.calories_label}</p>
                    </div>
                    {item.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {item.description}
                      </p>
                    )}
                    <Button
                      onClick={() => handleOrderClick(item)}
                      className="w-full"
                      disabled={!item.order_url && !restaurant.avm_default_order_url}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Order
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {menuItems.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">
              No meals available at the moment. Check back soon!
            </p>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground pt-8 border-t">
          <p>Powered by TapAway</p>
        </div>
      </div>
    </div>
  );
};
