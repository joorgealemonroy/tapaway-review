import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MenuItem {
  id?: string;
  name: string;
  description: string;
  price: string;
  sort_order: number;
}

interface MenuSection {
  id?: string;
  name: string;
  sort_order: number;
  items: MenuItem[];
}

const MenuManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [sections, setSections] = useState<MenuSection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRestaurantAndMenu();
  }, []);

  const fetchRestaurantAndMenu = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (!restaurant) {
      navigate("/onboarding");
      return;
    }

    setRestaurantId(restaurant.id);

    const { data: menuData } = await supabase
      .from("menu_sections")
      .select(`
        *,
        menu_items (*)
      `)
      .eq("restaurant_id", restaurant.id)
      .order("sort_order");

    if (menuData) {
      setSections(menuData.map(s => ({
        ...s,
        items: (s.menu_items || []).sort((a: any, b: any) => a.sort_order - b.sort_order)
      })));
    }
    
    setLoading(false);
  };

  const addSection = () => {
    setSections([...sections, {
      name: "",
      sort_order: sections.length,
      items: []
    }]);
  };

  const addItem = (sectionIndex: number) => {
    const newSections = [...sections];
    newSections[sectionIndex].items.push({
      name: "",
      description: "",
      price: "",
      sort_order: newSections[sectionIndex].items.length
    });
    setSections(newSections);
  };

  const updateSection = (index: number, field: keyof MenuSection, value: any) => {
    const newSections = [...sections];
    (newSections[index] as any)[field] = value;
    setSections(newSections);
  };

  const updateItem = (sectionIndex: number, itemIndex: number, field: keyof MenuItem, value: any) => {
    const newSections = [...sections];
    (newSections[sectionIndex].items[itemIndex] as any)[field] = value;
    setSections(newSections);
  };

  const removeSection = (index: number) => {
    setSections(sections.filter((_, i) => i !== index));
  };

  const removeItem = (sectionIndex: number, itemIndex: number) => {
    const newSections = [...sections];
    newSections[sectionIndex].items = newSections[sectionIndex].items.filter((_, i) => i !== itemIndex);
    setSections(newSections);
  };

  const saveMenu = async () => {
    if (!restaurantId) return;

    try {
      // Delete existing menu
      await supabase.from("menu_sections").delete().eq("restaurant_id", restaurantId);

      // Insert new sections
      for (const section of sections) {
        const { data: sectionData, error: sectionError } = await supabase
          .from("menu_sections")
          .insert({
            restaurant_id: restaurantId,
            name: section.name,
            sort_order: section.sort_order
          })
          .select()
          .single();

        if (sectionError) throw sectionError;

        // Insert items for this section
        if (section.items.length > 0) {
          const itemsToInsert = section.items.map(item => ({
            section_id: sectionData.id,
            name: item.name,
            description: item.description || null,
            price: item.price || null,
            sort_order: item.sort_order
          }));

          const { error: itemsError } = await supabase
            .from("menu_items")
            .insert(itemsToInsert);

          if (itemsError) throw itemsError;
        }
      }

      toast({
        title: "Menu saved",
        description: "Your menu has been updated successfully.",
      });

      fetchRestaurantAndMenu();
    } catch (error) {
      console.error("Error saving menu:", error);
      toast({
        title: "Error",
        description: "Failed to save menu. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Menu Management</h1>
            <p className="text-muted-foreground mt-1">Create and organize your menu sections and items</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </Button>
            <Button onClick={saveMenu}>Save Menu</Button>
          </div>
        </div>

        <div className="space-y-6">
          {sections.map((section, sectionIndex) => (
            <Card key={sectionIndex} className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <GripVertical className="w-5 h-5 text-muted-foreground mt-2" />
                <div className="flex-1 space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <Label>Section Name</Label>
                      <Input
                        value={section.name}
                        onChange={(e) => updateSection(sectionIndex, "name", e.target.value)}
                        placeholder="e.g., Appetizers, Main Courses, Desserts"
                      />
                    </div>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => removeSection(sectionIndex)}
                      className="mt-6"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-3 pl-4 border-l-2 border-muted">
                    {section.items.map((item, itemIndex) => (
                      <div key={itemIndex} className="flex gap-2">
                        <div className="flex-1 grid grid-cols-3 gap-2">
                          <Input
                            value={item.name}
                            onChange={(e) => updateItem(sectionIndex, itemIndex, "name", e.target.value)}
                            placeholder="Item name"
                          />
                          <Input
                            value={item.description}
                            onChange={(e) => updateItem(sectionIndex, itemIndex, "description", e.target.value)}
                            placeholder="Description (optional)"
                          />
                          <Input
                            value={item.price}
                            onChange={(e) => updateItem(sectionIndex, itemIndex, "price", e.target.value)}
                            placeholder="Price (e.g., $12.99)"
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(sectionIndex, itemIndex)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addItem(sectionIndex)}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Item
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}

          <Button onClick={addSection} variant="outline" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Section
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MenuManagement;
