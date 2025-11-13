import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
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

interface MenuTabProps {
  restaurantId: string;
}

export const MenuTab = ({ restaurantId }: MenuTabProps) => {
  const { toast } = useToast();
  const [sections, setSections] = useState<MenuSection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMenu();
  }, [restaurantId]);

  const fetchMenu = async () => {
    const { data: menuData } = await supabase
      .from("menu_sections")
      .select(`*, menu_items (*)`)
      .eq("restaurant_id", restaurantId)
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
    setSections([...sections, { name: "", sort_order: sections.length, items: [] }]);
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
    try {
      await supabase.from("menu_sections").delete().eq("restaurant_id", restaurantId);

      for (const section of sections) {
        const { data: sectionData } = await supabase
          .from("menu_sections")
          .insert({ restaurant_id: restaurantId, name: section.name, sort_order: section.sort_order })
          .select()
          .single();

        if (sectionData) {
          for (const item of section.items) {
            await supabase.from("menu_items").insert({
              section_id: sectionData.id,
              name: item.name,
              description: item.description,
              price: item.price,
              sort_order: item.sort_order
            });
          }
        }
      }

      toast({ title: "Menu saved", description: "Your menu has been updated successfully." });
      fetchMenu();
    } catch (error) {
      toast({ title: "Error", description: "Failed to save menu. Please try again.", variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading menu...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Menu Management</h3>
        <div className="flex gap-2">
          <Button onClick={addSection} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Section
          </Button>
          <Button onClick={saveMenu} size="sm">Save Menu</Button>
        </div>
      </div>

      {sections.map((section, sIndex) => (
        <Card key={sIndex} className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <Input
              placeholder="Section name (e.g., Appetizers)"
              value={section.name}
              onChange={(e) => updateSection(sIndex, "name", e.target.value)}
              className="flex-1"
            />
            <Button variant="ghost" size="icon" onClick={() => removeSection(sIndex)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-3 ml-4">
            {section.items.map((item, iIndex) => (
              <div key={iIndex} className="grid grid-cols-12 gap-2">
                <Input
                  placeholder="Item name"
                  value={item.name}
                  onChange={(e) => updateItem(sIndex, iIndex, "name", e.target.value)}
                  className="col-span-4"
                />
                <Input
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => updateItem(sIndex, iIndex, "description", e.target.value)}
                  className="col-span-5"
                />
                <Input
                  placeholder="$12"
                  value={item.price}
                  onChange={(e) => updateItem(sIndex, iIndex, "price", e.target.value)}
                  className="col-span-2"
                />
                <Button variant="ghost" size="icon" onClick={() => removeItem(sIndex, iIndex)} className="col-span-1">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => addItem(sIndex)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
};