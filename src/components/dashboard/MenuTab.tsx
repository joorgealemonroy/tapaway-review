import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Menu, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MenuImageUpload } from "@/components/MenuImageUpload";

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
  const [showImageUpload, setShowImageUpload] = useState(false);

  useEffect(() => {
    fetchMenu();
  }, [restaurantId]);

  const handleMenuParsed = (menuData: any) => {
    const parsedSections: MenuSection[] = menuData.sections.map((section: any, sIdx: number) => ({
      name: section.name,
      sort_order: sIdx,
      items: section.items.map((item: any, iIdx: number) => ({
        name: item.name,
        description: item.description || '',
        price: item.price || '',
        sort_order: iIdx
      }))
    }));
    
    setSections(parsedSections);
    setShowImageUpload(false);
    toast({ 
      title: "Menu parsed successfully!", 
      description: "Review and edit the items below, then click Save." 
    });
  };

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

      toast({ title: "Success", description: "Menu saved successfully!" });
    } catch (error) {
      console.error("Error saving menu:", error);
      toast({ title: "Error", description: "Failed to save menu.", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-2 flex items-center gap-2">
            <Menu className="w-7 h-7 text-primary" />
            Menu Management
          </h2>
          <p className="text-muted-foreground">Upload or manually edit your restaurant menu</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button onClick={() => setShowImageUpload(!showImageUpload)} variant="outline" className="flex-1 sm:flex-none">
            <Upload className="w-4 h-4 mr-2" />
            Upload Menu
          </Button>
          <Button onClick={saveMenu} className="gradient-primary text-white flex-1 sm:flex-none">
            Save Menu
          </Button>
        </div>
      </div>

      {showImageUpload && (
        <Card className="p-6 card-elevated bg-gradient-subtle">
          <MenuImageUpload restaurantId={restaurantId} onMenuParsed={handleMenuParsed} />
        </Card>
      )}

      {sections.length === 0 ? (
        <Card className="p-8 text-center gradient-subtle border-none shadow-lg">
          <Menu className="w-16 h-16 mx-auto mb-4 text-primary" />
          <h3 className="text-xl font-bold mb-2">No Menu Yet</h3>
          <p className="text-muted-foreground max-w-md mx-auto mb-4">
            Upload a menu image for AI parsing or start building manually
          </p>
          <Button onClick={addSection} className="gradient-primary text-white">
            <Plus className="w-4 h-4 mr-2" />
            Add First Section
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {sections.map((section, sIdx) => (
            <Card key={sIdx} className="p-6 card-elevated">
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-1">
                  <Label className="text-sm font-semibold mb-2 block">Section Name</Label>
                  <Input
                    value={section.name}
                    onChange={(e) => updateSection(sIdx, 'name', e.target.value)}
                    placeholder="e.g., Appetizers, Main Dishes"
                    className="text-lg font-semibold"
                  />
                </div>
                <Button variant="ghost" size="sm" onClick={() => removeSection(sIdx)} className="text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-3 mt-4">
                {section.items.map((item, iIdx) => (
                  <div key={iIdx} className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex gap-4">
                      <div className="flex-1 space-y-3">
                        <Input
                          value={item.name}
                          onChange={(e) => updateItem(sIdx, iIdx, 'name', e.target.value)}
                          placeholder="Item name"
                          className="font-medium"
                        />
                        <Textarea
                          value={item.description}
                          onChange={(e) => updateItem(sIdx, iIdx, 'description', e.target.value)}
                          placeholder="Description (optional)"
                          rows={2}
                        />
                      </div>
                      <div className="w-24 space-y-3">
                        <Input
                          value={item.price}
                          onChange={(e) => updateItem(sIdx, iIdx, 'price', e.target.value)}
                          placeholder="$12.99"
                        />
                        <Button variant="ghost" size="sm" onClick={() => removeItem(sIdx, iIdx)} className="w-full text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Button onClick={() => addItem(sIdx)} variant="outline" size="sm" className="mt-4 w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </Card>
          ))}

          <Button onClick={addSection} variant="outline" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Section
          </Button>
        </div>
      )}
    </div>
  );
};