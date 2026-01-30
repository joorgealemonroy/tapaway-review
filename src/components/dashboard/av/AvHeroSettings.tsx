import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface AvHeroSettingsProps {
  restaurantId: string;
  restaurant: any;
  onUpdate: () => void;
}

export const AvHeroSettings = ({ restaurantId, restaurant, onUpdate }: AvHeroSettingsProps) => {
  const [headerTitle, setHeaderTitle] = useState(restaurant.header_title || "");
  const [headerSubtitle, setHeaderSubtitle] = useState(restaurant.header_subtitle || "");
  const [questionTitle, setQuestionTitle] = useState(restaurant.avm_question_title || "How was your meal?");
  const [questionSubtitle, setQuestionSubtitle] = useState(restaurant.avm_question_subtitle || "Share feedback in seconds — no login.");
  const [positiveLabel, setPositiveLabel] = useState(restaurant.avm_positive_label || "Loved it! 💚");
  const [negativeLabel, setNegativeLabel] = useState(restaurant.avm_negative_label || "Could be better");
  const [menuTitle, setMenuTitle] = useState(restaurant.menu_title || "Menu");
  const [mealOrderUrl, setMealOrderUrl] = useState(restaurant.meal_order_url || "");
  const [instagramUrl, setInstagramUrl] = useState(restaurant.instagram_url || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setHeaderTitle(restaurant.header_title || "");
    setHeaderSubtitle(restaurant.header_subtitle || "");
    setQuestionTitle(restaurant.avm_question_title || "How was your meal?");
    setQuestionSubtitle(restaurant.avm_question_subtitle || "Share feedback in seconds — no login.");
    setPositiveLabel(restaurant.avm_positive_label || "Loved it! 💚");
    setNegativeLabel(restaurant.avm_negative_label || "Could be better");
    setMenuTitle(restaurant.menu_title || "Menu");
    setMealOrderUrl(restaurant.meal_order_url || "");
    setInstagramUrl(restaurant.instagram_url || "");
  }, [restaurant]);

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('restaurants')
        .update({
          header_title: headerTitle,
          header_subtitle: headerSubtitle,
          avm_question_title: questionTitle,
          avm_question_subtitle: questionSubtitle,
          avm_positive_label: positiveLabel,
          avm_negative_label: negativeLabel,
          menu_title: menuTitle,
          meal_order_url: mealOrderUrl,
          instagram_url: instagramUrl
        })
        .eq('id', restaurantId);

      if (error) throw error;

      toast.success('Settings saved successfully');
      onUpdate();
    } catch (error: any) {
      toast.error(`Save failed: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Page Header</h3>
        <div>
          <Label htmlFor="header-title">Main Title</Label>
          <Input
            id="header-title"
            value={headerTitle}
            onChange={(e) => setHeaderTitle(e.target.value)}
            placeholder="A.V. Meal Preps"
          />
        </div>
        <div>
          <Label htmlFor="header-subtitle">Subtitle</Label>
          <Input
            id="header-subtitle"
            value={headerSubtitle}
            onChange={(e) => setHeaderSubtitle(e.target.value)}
            placeholder="Nutrition That Works as Hard as You Do"
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Feedback Section</h3>
        <div>
          <Label htmlFor="question-title">Main Question</Label>
          <Input
            id="question-title"
            value={questionTitle}
            onChange={(e) => setQuestionTitle(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="question-subtitle">Subtitle</Label>
          <Input
            id="question-subtitle"
            value={questionSubtitle}
            onChange={(e) => setQuestionSubtitle(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="positive-label">Positive Button Text</Label>
          <Input
            id="positive-label"
            value={positiveLabel}
            onChange={(e) => setPositiveLabel(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="negative-label">Negative Button Text</Label>
          <Input
            id="negative-label"
            value={negativeLabel}
            onChange={(e) => setNegativeLabel(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Menu Section</h3>
        <div>
          <Label htmlFor="menu-title">Menu Section Title</Label>
          <Input
            id="menu-title"
            value={menuTitle}
            onChange={(e) => setMenuTitle(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Global URLs</h3>
        <div>
          <Label htmlFor="meal-order-url">Order/Subscribe URL</Label>
          <Input
            id="meal-order-url"
            value={mealOrderUrl}
            onChange={(e) => setMealOrderUrl(e.target.value)}
            placeholder="https://avmealpreps.com/order"
          />
          <p className="text-xs text-muted-foreground mt-1">Used when individual meals don't have a specific order URL</p>
        </div>
        <div>
          <Label htmlFor="instagram-url">Instagram URL</Label>
          <Input
            id="instagram-url"
            value={instagramUrl}
            onChange={(e) => setInstagramUrl(e.target.value)}
            placeholder="@avmealpreps"
          />
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? 'Saving...' : 'Save All Settings'}
      </Button>
    </div>
  );
};