import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

interface Meal {
  id: string;
  restaurant_id: string;
  name: string;
  description: string;
  calories: number;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  image_url: string;
  order_url: string | null;
  sort_order: number;
  is_active: boolean;
}

interface AvMealsManagerProps {
  restaurantId: string;
}

export const AvMealsManager = ({ restaurantId }: AvMealsManagerProps) => {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(false);
  const [bulkJson, setBulkJson] = useState("");

  // Form state for new meal
  const [newMeal, setNewMeal] = useState({
    name: "",
    description: "",
    calories: "",
    protein_g: "",
    carbs_g: "",
    fat_g: "",
    image_url: "",
    order_url: "",
  });

  useEffect(() => {
    fetchMeals();
  }, [restaurantId]);

  const fetchMeals = async () => {
    const { data } = await supabase
      .from("av_meal_prep_meals")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("sort_order");
    
    if (data) setMeals(data as Meal[]);
  };

  const handleAddMeal = async () => {
    if (!newMeal.name || !newMeal.calories || !newMeal.image_url) {
      toast.error("Please fill in name, calories, and image URL");
      return;
    }

    try {
      setLoading(true);
      const maxOrder = Math.max(...meals.map(m => m.sort_order), 0);
      
      const { error } = await supabase
        .from("av_meal_prep_meals")
        .insert({
          restaurant_id: restaurantId,
          name: newMeal.name,
          description: newMeal.description,
          calories: parseInt(newMeal.calories),
          protein_g: newMeal.protein_g ? parseInt(newMeal.protein_g) : null,
          carbs_g: newMeal.carbs_g ? parseInt(newMeal.carbs_g) : null,
          fat_g: newMeal.fat_g ? parseInt(newMeal.fat_g) : null,
          image_url: newMeal.image_url,
          order_url: newMeal.order_url || null,
          sort_order: maxOrder + 1,
          is_active: true
        });

      if (error) throw error;

      toast.success("Meal added successfully");
      setNewMeal({
        name: "",
        description: "",
        calories: "",
        protein_g: "",
        carbs_g: "",
        fat_g: "",
        image_url: "",
        order_url: "",
      });
      fetchMeals();
    } catch (error: any) {
      toast.error(`Failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    const { error } = await supabase
      .from("av_meal_prep_meals")
      .update({ is_active: !currentActive })
      .eq("id", id);

    if (error) {
      toast.error(`Failed: ${error.message}`);
    } else {
      toast.success(currentActive ? "Meal hidden" : "Meal shown");
      fetchMeals();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this meal?")) return;

    const { error } = await supabase
      .from("av_meal_prep_meals")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error(`Failed: ${error.message}`);
    } else {
      toast.success("Meal deleted");
      fetchMeals();
    }
  };

  const handleBulkImport = async () => {
    if (!bulkJson.trim()) {
      toast.error("Please paste JSON data");
      return;
    }

    try {
      setLoading(true);
      const mealsData = JSON.parse(bulkJson);
      
      if (!Array.isArray(mealsData)) {
        throw new Error("JSON must be an array of meals");
      }

      const mealsToInsert = mealsData.map((meal, index) => ({
        restaurant_id: restaurantId,
        name: meal.name,
        description: meal.description || "",
        calories: parseInt(meal.calories),
        protein_g: meal.protein_g ? parseInt(meal.protein_g) : null,
        carbs_g: meal.carbs_g ? parseInt(meal.carbs_g) : null,
        fat_g: meal.fat_g ? parseInt(meal.fat_g) : null,
        image_url: meal.image_url,
        order_url: meal.order_url || null,
        sort_order: index,
        is_active: true
      }));

      const { error } = await supabase
        .from("av_meal_prep_meals")
        .upsert(mealsToInsert, {
          onConflict: "restaurant_id,name"
        });

      if (error) throw error;

      toast.success(`Imported ${mealsToInsert.length} meals`);
      setBulkJson("");
      fetchMeals();
    } catch (error: any) {
      toast.error(`Failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Bulk Import */}
      <Card className="p-6 bg-muted/50">
        <h3 className="text-lg font-semibold mb-4">Bulk JSON Import</h3>
        <div className="space-y-4">
          <Textarea
            placeholder='[{"name": "BBQ Chicken", "description": "...", "calories": 335, "protein_g": 30, "carbs_g": 28, "fat_g": 8, "image_url": "https://...", "order_url": "https://..."}]'
            value={bulkJson}
            onChange={(e) => setBulkJson(e.target.value)}
            rows={6}
            className="font-mono text-sm"
          />
          <Button onClick={handleBulkImport} disabled={loading}>
            <Upload className="w-4 h-4 mr-2" />
            Import Meals from JSON
          </Button>
        </div>
      </Card>

      {/* Add New Meal */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Add New Meal</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">Meal Name *</Label>
            <Input
              id="name"
              value={newMeal.name}
              onChange={(e) => setNewMeal({...newMeal, name: e.target.value})}
              placeholder="BBQ Chicken"
            />
          </div>
          <div>
            <Label htmlFor="calories">Calories *</Label>
            <Input
              id="calories"
              type="number"
              value={newMeal.calories}
              onChange={(e) => setNewMeal({...newMeal, calories: e.target.value})}
              placeholder="335"
            />
          </div>
          <div>
            <Label htmlFor="protein">Protein (g)</Label>
            <Input
              id="protein"
              type="number"
              value={newMeal.protein_g}
              onChange={(e) => setNewMeal({...newMeal, protein_g: e.target.value})}
              placeholder="30"
            />
          </div>
          <div>
            <Label htmlFor="carbs">Carbs (g)</Label>
            <Input
              id="carbs"
              type="number"
              value={newMeal.carbs_g}
              onChange={(e) => setNewMeal({...newMeal, carbs_g: e.target.value})}
              placeholder="28"
            />
          </div>
          <div>
            <Label htmlFor="fat">Fat (g)</Label>
            <Input
              id="fat"
              type="number"
              value={newMeal.fat_g}
              onChange={(e) => setNewMeal({...newMeal, fat_g: e.target.value})}
              placeholder="8"
            />
          </div>
          <div>
            <Label htmlFor="order-url">Order URL (optional)</Label>
            <Input
              id="order-url"
              value={newMeal.order_url}
              onChange={(e) => setNewMeal({...newMeal, order_url: e.target.value})}
              placeholder="https://avmealpreps.com/..."
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={newMeal.description}
              onChange={(e) => setNewMeal({...newMeal, description: e.target.value})}
              placeholder="Savory grilled chicken..."
              rows={3}
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="image-url">Image URL * (from avmealpreps.com)</Label>
            <Input
              id="image-url"
              value={newMeal.image_url}
              onChange={(e) => setNewMeal({...newMeal, image_url: e.target.value})}
              placeholder="https://avmealpreps.com/path/to/image.jpg"
            />
          </div>
        </div>
        <Button onClick={handleAddMeal} disabled={loading} className="w-full mt-4">
          <Plus className="w-4 h-4 mr-2" />
          Add Meal
        </Button>
      </Card>

      {/* Existing Meals */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Meals ({meals.length})</h3>
        {meals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No meals yet. Add one above or use bulk import!</p>
        ) : (
          meals.map((meal) => (
            <Card key={meal.id} className="p-4">
              <div className="flex gap-4">
                <img src={meal.image_url} alt={meal.name} className="w-24 h-24 object-cover rounded" />
                <div className="flex-1">
                  <h4 className="font-semibold">{meal.name}</h4>
                  <p className="text-sm text-primary">{meal.calories} kcal</p>
                  {(meal.protein_g || meal.carbs_g || meal.fat_g) && (
                    <p className="text-xs text-muted-foreground">
                      P: {meal.protein_g || 0}g | C: {meal.carbs_g || 0}g | F: {meal.fat_g || 0}g
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{meal.description}</p>
                  {meal.order_url && (
                    <p className="text-xs text-muted-foreground mt-1">Custom order URL set</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={meal.is_active}
                    onCheckedChange={() => handleToggleActive(meal.id, meal.is_active)}
                  />
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={() => handleDelete(meal.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

