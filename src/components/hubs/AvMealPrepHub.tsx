import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ThumbsUp, Instagram, ExternalLink, Share2, Smartphone } from "lucide-react";
import { toast } from "sonner";

interface Restaurant {
  id: string;
  restaurant_name: string;
  logo_url?: string | null;
  header_title?: string | null;
  header_subtitle?: string | null;
  menu_title?: string | null;
  meal_order_url?: string | null;
  instagram_url?: string | null;
  avm_question_title?: string | null;
  avm_question_subtitle?: string | null;
  avm_positive_label?: string | null;
  avm_negative_label?: string | null;
}

interface Meal {
  id: string;
  name: string;
  description: string;
  calories: number;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  image_url: string;
  order_url: string | null;
}

interface Testimonial {
  id: string;
  quote: string;
  author: string;
}

interface AvMealPrepHubProps {
  restaurant: Restaurant;
  trackEvent: (eventName: string, eventData?: any) => Promise<void>;
}

export const AvMealPrepHub = ({ restaurant, trackEvent }: AvMealPrepHubProps) => {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [showAddToHome, setShowAddToHome] = useState(false);

  useEffect(() => {
    fetchMeals();
    fetchTestimonials();
  }, [restaurant.id]);

  const fetchMeals = async () => {
    const { data } = await supabase
      .from("av_meal_prep_meals")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .eq("is_active", true)
      .order("sort_order");

    if (data) {
      setMeals(data as Meal[]);
    }
  };

  const fetchTestimonials = async () => {
    const { data } = await supabase
      .from("av_meal_prep_testimonials")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .order("sort_order");

    if (data) {
      setTestimonials(data as Testimonial[]);
    }
  };

  const handleLovedClick = () => {
    trackEvent("avm_loved_click");
  };

  const handleCouldBeBetterClick = () => {
    trackEvent("avm_could_be_better_click");
  };

  const handleOrderClick = (meal?: Meal) => {
    const url = meal?.order_url || restaurant.meal_order_url;
    if (url) {
      if (meal) {
        trackEvent("avm_order_click", { mealId: meal.id, mealName: meal.name });
      } else {
        trackEvent("avm_order_click", { source: "global" });
      }
      window.open(url, "_blank");
    }
  };

  const handleInstagramClick = () => {
    if (restaurant.instagram_url) {
      trackEvent("avm_instagram_click");
      window.open(restaurant.instagram_url, "_blank");
    }
  };

  const handleShare = async () => {
    trackEvent("avm_share_clicked");
    const url = window.location.href;
    const text = `Check out ${restaurant.restaurant_name}!`;

    if (navigator.share) {
      try {
        await navigator.share({ title: restaurant.restaurant_name, text, url });
      } catch (err) {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    }
  };

  const handleAddToHome = () => {
    trackEvent("avm_add_to_home_clicked");
    setShowAddToHome(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
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
            {restaurant.header_title || "How was your experience?"}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {restaurant.header_subtitle || "We'd love to hear your feedback!"}
          </p>
          
          {/* Instagram Pill */}
          {restaurant.instagram_url && (
            <div className="pt-2">
              <Button
                onClick={handleInstagramClick}
                size="lg"
                variant="outline"
                className="gap-2 rounded-full"
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
            <h2 className="text-2xl font-bold">
              {restaurant.avm_question_title || "How was your meal?"}
            </h2>
            <p className="text-muted-foreground">
              {restaurant.avm_question_subtitle || "Share feedback in seconds — no login."}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-2xl mx-auto">
              <Button
                onClick={handleLovedClick}
                size="lg"
                className="flex-1 h-16 text-lg bg-green-600 hover:bg-green-700 text-white"
              >
                <ThumbsUp className="w-5 h-5 mr-2" />
                {restaurant.avm_positive_label || "Loved it! 💚"}
              </Button>
              <Button
                onClick={handleCouldBeBetterClick}
                size="lg"
                variant="outline"
                className="flex-1 h-16 text-lg border-amber-500 text-amber-600 hover:bg-amber-50"
              >
                {restaurant.avm_negative_label || "Could be better"}
              </Button>
            </div>
          </div>
        </Card>

        {/* Testimonials Section */}
        {testimonials.length > 0 && (
          <Card className="p-8 bg-card/50 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-center mb-6">What customers are saying</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {testimonials.map((testimonial) => (
                <Card key={testimonial.id} className="p-6">
                  <p className="text-sm italic mb-4">"{testimonial.quote}"</p>
                  <p className="text-sm text-muted-foreground">{testimonial.author}</p>
                </Card>
              ))}
            </div>
          </Card>
        )}

        {/* Menu Section */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-center">
            {restaurant.menu_title || "Menu"}
          </h2>
          {meals.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {meals.map((meal) => (
                <Card key={meal.id} className="overflow-hidden group hover:shadow-lg transition-shadow">
                  <div className="aspect-square overflow-hidden">
                    <img
                      src={meal.image_url}
                      alt={meal.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="font-semibold text-lg">{meal.name}</h3>
                      <p className="text-sm text-primary font-medium">{meal.calories} kcal</p>
                    </div>
                    <Button
                      onClick={() => setSelectedMeal(meal)}
                      variant="outline"
                      className="w-full"
                    >
                      Details ▾
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">
                No meals available at the moment. Check back soon!
              </p>
            </Card>
          )}
        </div>

        {/* Bottom Actions */}
        {restaurant.meal_order_url && (
          <Card className="p-6 bg-card/50 backdrop-blur-sm">
            <Button
              onClick={() => handleOrderClick()}
              size="lg"
              className="w-full mb-4 h-14 text-lg"
            >
              Order / Subscribe
            </Button>
            {restaurant.instagram_url && (
              <Button
                onClick={handleInstagramClick}
                size="lg"
                variant="outline"
                className="w-full mb-4 h-14 text-lg gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 hover:from-purple-700 hover:to-pink-700"
              >
                <Instagram className="w-5 h-5" />
                Follow Us on Instagram
              </Button>
            )}
            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={handleAddToHome}
                size="lg"
                variant="outline"
                className="h-14"
              >
                <Smartphone className="w-5 h-5 mr-2" />
                Add to Home Screen
              </Button>
              <Button
                onClick={handleShare}
                size="lg"
                variant="outline"
                className="h-14"
              >
                <Share2 className="w-5 h-5 mr-2" />
                Share
              </Button>
            </div>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground pt-8 border-t">
          <p>Powered by TapAway</p>
        </div>
      </div>

      {/* Meal Details Modal */}
      <Dialog open={!!selectedMeal} onOpenChange={() => setSelectedMeal(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedMeal?.name}</DialogTitle>
          </DialogHeader>
          {selectedMeal && (
            <div className="space-y-4">
              <img
                src={selectedMeal.image_url}
                alt={selectedMeal.name}
                className="w-full aspect-video object-cover rounded-lg"
              />
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-primary">{selectedMeal.calories}</p>
                  <p className="text-xs text-muted-foreground">kcal</p>
                </div>
                {selectedMeal.protein_g && (
                  <div>
                    <p className="text-2xl font-bold text-primary">{selectedMeal.protein_g}g</p>
                    <p className="text-xs text-muted-foreground">Protein</p>
                  </div>
                )}
                {selectedMeal.carbs_g && (
                  <div>
                    <p className="text-2xl font-bold text-primary">{selectedMeal.carbs_g}g</p>
                    <p className="text-xs text-muted-foreground">Carbs</p>
                  </div>
                )}
                {selectedMeal.fat_g && (
                  <div>
                    <p className="text-2xl font-bold text-primary">{selectedMeal.fat_g}g</p>
                    <p className="text-xs text-muted-foreground">Fat</p>
                  </div>
                )}
              </div>
              <p className="text-muted-foreground">{selectedMeal.description}</p>
              <Button
                onClick={() => handleOrderClick(selectedMeal)}
                className="w-full"
                size="lg"
                disabled={!selectedMeal.order_url && !restaurant.meal_order_url}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Order this meal
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add to Home Screen Instructions */}
      <Dialog open={showAddToHome} onOpenChange={setShowAddToHome}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Home Screen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">iPhone / iPad (Safari)</h4>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Tap the Share button at the bottom</li>
                <li>Scroll down and tap "Add to Home Screen"</li>
                <li>Tap "Add" in the top right</li>
              </ol>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Android (Chrome)</h4>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Tap the menu (⋮) in the top right</li>
                <li>Tap "Add to Home screen"</li>
                <li>Tap "Add"</li>
              </ol>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
