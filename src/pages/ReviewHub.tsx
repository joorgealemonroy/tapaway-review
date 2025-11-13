import { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Star, Navigation, Instagram, Menu, X } from "lucide-react";

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
  const { restaurantId, customSlug } = useParams();
  const location = useLocation();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuSections, setMenuSections] = useState<MenuSection[]>([]);

  useEffect(() => {
    // Check if we're on a custom slug route (not /hub/:id)
    const isCustomSlugRoute = !location.pathname.startsWith('/hub/');
    
    if (isCustomSlugRoute && customSlug) {
      // Fetch by custom slug
      fetchRestaurantBySlug(customSlug);
    } else if (restaurantId) {
      // Fetch by ID
      fetchRestaurant(restaurantId);
    }
  }, [restaurantId, customSlug, location]);

  const fetchRestaurantBySlug = async (slug: string) => {
    const { data } = await supabase
      .from("restaurant_public_info")
      .select("id, restaurant_name, header_title, header_subtitle, menu_title, google_review_url, yelp_review_url, directions_url, instagram_url, logo_url")
      .eq("custom_slug", slug)
      .single();

    if (data) {
      setRestaurant(data);
      fetchMenu(data.id);
    }
  };

  const fetchRestaurant = async (id: string) => {
    const { data } = await supabase
      .from("restaurant_public_info")
      .select("id, restaurant_name, header_title, header_subtitle, menu_title, google_review_url, yelp_review_url, directions_url, instagram_url, logo_url")
      .eq("id", id)
      .single();

    if (data) {
      setRestaurant(data);
      fetchMenu(data.id);
    }
  };

  const fetchMenu = async (restId: string) => {
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

  const isSafeUrl = (url: string | null): boolean => {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  };

  const trackEvent = async (eventName: string) => {
    if (!restaurant) return;
    
    try {
      await (supabase.from("analytics_events").insert({
        restaurant_id: restaurant.id,
        event_type: eventName,
        event_data: { timestamp: new Date().toISOString() }
      }) as any);
    } catch (error) {
      console.error("Analytics error:", error);
    }
  };

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [menuOpen]);

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-lg p-8">
          {restaurant.logo_url ? (
            <img 
              src={restaurant.logo_url} 
              alt="Logo" 
              className="w-20 h-20 rounded-lg mx-auto mb-6 object-cover" 
            />
          ) : (
            <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center mx-auto mb-6">
              <span className="text-xs text-gray-400 text-center px-2">Logo</span>
            </div>
          )}

          <h1 className="text-[28px] font-bold text-[#111] text-center mb-2">
            {restaurant.header_title}
          </h1>
          <p className="text-[15px] text-[#6b7280] text-center mb-8">
            {restaurant.header_subtitle}
          </p>

          <div className="space-y-3">
            {restaurant.google_review_url && (
              <Button
                className="w-full h-12 rounded-xl bg-white border border-[#e5e7eb] text-gray-900 hover:bg-gray-50 font-medium"
                onClick={() => {
                  trackEvent("google_review_clicked");
                  if (isSafeUrl(restaurant.google_review_url)) {
                    window.open(restaurant.google_review_url!, "_blank");
                  }
                }}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Leave a Google Review
              </Button>
            )}

            {restaurant.yelp_review_url && (
              <Button
                className="w-full h-12 rounded-xl bg-[#d32323] text-white hover:bg-[#b91c1c] font-medium"
                onClick={() => {
                  trackEvent("yelp_clicked");
                  if (isSafeUrl(restaurant.yelp_review_url)) {
                    window.open(restaurant.yelp_review_url!, "_blank");
                  }
                }}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.16 12.594l-4.995 1.433c-.96.276-1.74-.8-1.176-1.63l2.905-4.308a1.072 1.072 0 0 1 1.596-.206 9.194 9.194 0 0 1 2.364 3.252 1.073 1.073 0 0 1-.694 1.459zm-5.025 3.152l4.942 1.606a1.072 1.072 0 0 1 .653 1.48 9.194 9.194 0 0 1-2.535 3.164 1.072 1.072 0 0 1-1.575-.247l-2.91-4.246c-.527-.77.054-1.82.968-1.757h.457zm-11.93-4.74c-.12-.863.805-1.54 1.57-1.158l4.705 2.35c.856.426.767 1.708-.149 1.976l-4.902 1.436a1.072 1.072 0 0 1-1.35-.916 9.182 9.182 0 0 1 .125-3.687zm12.09-7.398c.11-.02.22-.028.33-.028.58 0 1.098.31 1.381.83l2.485 4.555c.524.962-.35 2.098-1.377 1.756l-5.23-1.73c-.873-.29-.971-1.56-.155-1.986l4.565-3.397zm-3.976 3.976l-4.565 3.397c-.856.637-2.074-.069-1.895-1.096l1.17-6.704a1.072 1.072 0 0 1 1.292-.86c1.272.285 2.486.82 3.586 1.59a1.072 1.072 0 0 1 .412 1.673z"/>
                </svg>
                Find Us on Yelp
              </Button>
            )}

            {restaurant.instagram_url && (
              <Button
                className="w-full h-12 rounded-xl text-white font-medium"
                style={{ background: 'linear-gradient(45deg, #f58529, #dd2a7b, #8134af, #515bd4)' }}
                onClick={() => {
                  trackEvent("instagram_clicked");
                  if (isSafeUrl(restaurant.instagram_url)) {
                    window.open(restaurant.instagram_url!, "_blank");
                  }
                }}
              >
                <Instagram className="w-5 h-5" />
                Follow Us on Instagram
              </Button>
            )}

            {restaurant.directions_url && (
              <Button
                className="w-full h-12 rounded-xl bg-[#2563eb] text-white hover:bg-[#1d4ed8] font-medium"
                onClick={() => {
                  trackEvent("directions_clicked");
                  if (isSafeUrl(restaurant.directions_url)) {
                    window.open(restaurant.directions_url!, "_blank");
                  }
                }}
              >
                <Navigation className="w-5 h-5" />
                Get Directions
              </Button>
            )}

            <Button
              className="w-full h-12 rounded-xl bg-[#111] text-white hover:bg-black font-medium"
              onClick={() => {
                trackEvent("menu_viewed");
                setMenuOpen(true);
              }}
            >
              <Menu className="w-5 h-5" />
              {restaurant.menu_title}
            </Button>
          </div>

          <p className="text-center text-xs text-gray-500 mt-8">
            Powered by{" "}
            <a
              href="https://tapaway.co"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-black hover:underline"
            >
              TapAway
            </a>
          </p>
        </div>
      </div>

      {/* Menu Modal */}
      {menuOpen && (
        <div 
          className="fixed inset-0 bg-[rgba(17,24,39,0.6)] backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setMenuOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-[780px] max-h-[90vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sticky Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-[#111]">{restaurant.restaurant_name}</h2>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full"
                onClick={() => setMenuOpen(false)}
              >
                <X className="w-5 h-5" />
                Close
              </Button>
            </div>

            {/* Scrollable Menu Content */}
            <div className="overflow-y-auto p-6 space-y-4">
              {menuSections.length > 0 ? (
                menuSections.map((section) => (
                  <details key={section.id} className="group" open>
                    <summary className="cursor-pointer bg-gray-50 rounded-xl p-4 border border-gray-200 hover:bg-gray-100 transition-colors">
                      <span className="font-bold text-lg text-[#111]">{section.name}</span>
                    </summary>
                    <div className="mt-2 space-y-3 pl-4">
                      {section.items.map((item) => (
                        <div key={item.id} className="flex justify-between items-start py-2">
                          <div className="flex-1">
                            <p className="font-semibold text-[#111]">{item.name}</p>
                            {item.description && (
                              <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                            )}
                          </div>
                          {item.price && (
                            <p className="font-bold text-[#111] ml-4">{item.price}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                ))
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500">Menu coming soon...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ReviewHub;
