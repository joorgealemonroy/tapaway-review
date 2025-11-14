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

interface MenuItem {
  id: string;
  section_id: string;
  name: string;
  calories: string;
  details: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
}

interface MenuSection {
  id: string;
  name: string;
  sort_order: number;
}

interface AvMenuManagerProps {
  restaurantId: string;
}

export const AvMenuManager = ({ restaurantId }: AvMenuManagerProps) => {
  const [sections, setSections] = useState<MenuSection[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [newItemName, setNewItemName] = useState("");
  const [newItemCalories, setNewItemCalories] = useState("");
  const [newItemDetails, setNewItemDetails] = useState("");
  const [uploading, setUploading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSections();
  }, [restaurantId]);

  useEffect(() => {
    if (selectedSection) {
      fetchItems(selectedSection);
    }
  }, [selectedSection]);

  const fetchSections = async () => {
    const { data } = await supabase
      .from("avm_menu_sections")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("sort_order");
    
    if (data && data.length > 0) {
      setSections(data);
      setSelectedSection(data[0].id);
    } else {
      // Create default section
      const { data: newSection, error } = await supabase
        .from("avm_menu_sections")
        .insert({
          restaurant_id: restaurantId,
          name: "Weekly Meals",
          sort_order: 0
        })
        .select()
        .single();
      
      if (newSection) {
        setSections([newSection]);
        setSelectedSection(newSection.id);
      }
    }
  };

  const fetchItems = async (sectionId: string) => {
    const { data } = await supabase
      .from("avm_menu_items")
      .select("*")
      .eq("section_id", sectionId)
      .order("sort_order");
    
    if (data) setItems(data);
  };

  const handleImageUpload = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${restaurantId}-${Date.now()}.${fileExt}`;
    const filePath = `menu/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('restaurant-logos')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('restaurant-logos')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleAddItem = async () => {
    if (!newItemName || !newItemCalories || !imageFile) {
      toast.error("Please fill in name, calories, and upload an image");
      return;
    }

    try {
      setLoading(true);
      setUploading(true);

      const imageUrl = await handleImageUpload(imageFile);
      const maxOrder = Math.max(...items.map(i => i.sort_order), 0);
      
      const { error } = await supabase
        .from("avm_menu_items")
        .insert({
          section_id: selectedSection,
          name: newItemName,
          calories: newItemCalories,
          details: newItemDetails,
          image_url: imageUrl,
          sort_order: maxOrder + 1,
          is_active: true
        });

      if (error) throw error;

      toast.success("Menu item added");
      setNewItemName("");
      setNewItemCalories("");
      setNewItemDetails("");
      setImageFile(null);
      fetchItems(selectedSection);
    } catch (error: any) {
      toast.error(`Failed: ${error.message}`);
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    const { error } = await supabase
      .from("avm_menu_items")
      .update({ is_active: !currentActive })
      .eq("id", id);

    if (error) {
      toast.error(`Failed: ${error.message}`);
    } else {
      toast.success(currentActive ? "Item hidden" : "Item shown");
      fetchItems(selectedSection);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this menu item?")) return;

    const { error } = await supabase
      .from("avm_menu_items")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error(`Failed: ${error.message}`);
    } else {
      toast.success("Menu item deleted");
      fetchItems(selectedSection);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Add Menu Item</h3>
        <div>
          <Label htmlFor="item-name">Item Name</Label>
          <Input
            id="item-name"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="BBQ Chicken"
          />
        </div>
        <div>
          <Label htmlFor="item-calories">Calories</Label>
          <Input
            id="item-calories"
            value={newItemCalories}
            onChange={(e) => setNewItemCalories(e.target.value)}
            placeholder="335 kcal"
          />
        </div>
        <div>
          <Label htmlFor="item-details">Details</Label>
          <Textarea
            id="item-details"
            value={newItemDetails}
            onChange={(e) => setNewItemDetails(e.target.value)}
            placeholder="Savory grilled chicken coated in Sweet BBQ sauce..."
            rows={3}
          />
        </div>
        <div>
          <Label htmlFor="item-image">Image</Label>
          <Input
            id="item-image"
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
          />
        </div>
        <Button onClick={handleAddItem} disabled={loading || uploading} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          {uploading ? "Uploading..." : "Add Menu Item"}
        </Button>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Menu Items ({items.length})</h3>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No menu items yet. Add one above!</p>
        ) : (
          items.map((item) => (
            <Card key={item.id} className="p-4">
              <div className="flex gap-4">
                <img src={item.image_url} alt={item.name} className="w-24 h-24 object-cover rounded" />
                <div className="flex-1">
                  <h4 className="font-semibold">{item.name}</h4>
                  <p className="text-sm text-primary">{item.calories}</p>
                  <p className="text-sm text-muted-foreground mt-1">{item.details}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={item.is_active}
                    onCheckedChange={() => handleToggleActive(item.id, item.is_active)}
                  />
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={() => handleDelete(item.id)}
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