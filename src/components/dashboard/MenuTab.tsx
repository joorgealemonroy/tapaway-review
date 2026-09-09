import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Menu, Upload, Mail, ChevronDown, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { MenuImageUpload } from "@/components/MenuImageUpload";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { registerUnsavedGuard } from "@/lib/unsavedChanges";

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

export interface MenuTabProps {
  restaurantId: string;
  isDemoView?: boolean;
}

export const MenuTab = ({ restaurantId, isDemoView = false }: MenuTabProps) => {
  const { toast } = useToast();
  const [sections, setSections] = useState<MenuSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImageUpload, setShowImageUpload] = useState(false);
  // Guards the multi-step save against double-submit duplicates.
  const [saving, setSaving] = useState(false);

  // Unsaved-changes tracking: snapshot of the last-saved menu. The dashboard
  // shell warns before switching tabs or closing the page while dirty.
  const sectionsRef = useRef<MenuSection[]>([]);
  const snapshotRef = useRef<string | null>(null);
  useEffect(() => {
    sectionsRef.current = sections;
  }, [sections]);
  useEffect(() => {
    return registerUnsavedGuard("menu", {
      isDirty: () => {
        const snap = snapshotRef.current;
        return snap !== null && JSON.stringify(sectionsRef.current) !== snap;
      },
    });
  }, []);

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
      const mapped = menuData.map(s => ({
        ...s,
        items: (s.menu_items || []).sort((a: any, b: any) => a.sort_order - b.sort_order)
      }));
      setSections(mapped);
      snapshotRef.current = JSON.stringify(mapped);
    } else {
      snapshotRef.current = JSON.stringify([]);
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
    // Double-submit guard: two concurrent saves each insert their own
    // sections and delete only their own ids → duplicated menus in the DB.
    if (saving) return;

    // Never silently drop unnamed sections. If the user typed items but
    // forgot the section name, saving would discard them without a word.
    // Block the save and say exactly what to fix instead.
    const unnamedCount = sections.filter((s) => !s.name.trim()).length;
    if (unnamedCount > 0) {
      toast({
        title: "Name your sections first",
        description: `${unnamedCount} ${unnamedCount === 1 ? "section has" : "sections have"} no name — name ${unnamedCount === 1 ? "it" : "them"} or remove ${unnamedCount === 1 ? "it" : "them"} to save. Unnamed sections are not saved.`,
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    // Non-destructive: write the new menu first, only remove the old rows
    // once every insert succeeded. A failure leaves the existing menu intact.
    const previousSectionIds = sections
      .map((s) => s.id)
      .filter((id): id is string => !!id);

    const insertedSectionIds: string[] = [];

    try {
      for (const [sIdx, section] of sections.entries()) {
        const { data: sectionData, error: sectionError } = await supabase
          .from("menu_sections")
          .insert({
            restaurant_id: restaurantId,
            name: section.name,
            sort_order: section.sort_order ?? sIdx,
          })
          .select()
          .single();

        if (sectionError || !sectionData) {
          throw sectionError || new Error("Could not create menu section");
        }

        insertedSectionIds.push(sectionData.id);

        const itemRows = section.items
          .filter((item) => item.name.trim())
          .map((item, iIdx) => ({
            section_id: sectionData.id,
            name: item.name,
            description: item.description,
            price: item.price,
            sort_order: item.sort_order ?? iIdx,
          }));

        if (itemRows.length > 0) {
          const { error: itemError } = await supabase
            .from("menu_items")
            .insert(itemRows);

          if (itemError) throw itemError;
        }
      }

      if (previousSectionIds.length > 0) {
        const { error: deleteError } = await supabase
          .from("menu_sections")
          .delete()
          .in("id", previousSectionIds);

        if (deleteError) throw deleteError;
      }

      await fetchMenu();
      toast({ title: "Menu saved", description: "Your menu is live on your review hub." });
    } catch (error: any) {
      console.error("❌ MENU SAVE FAILED:", error);

      // Roll back anything we just wrote so the menu isn't duplicated.
      // If the rollback itself fails, say so — silently swallowing it is
      // what left duplicates in the DB in the first place.
      if (insertedSectionIds.length > 0) {
        try {
          const { error: rollbackError } = await supabase
            .from("menu_sections")
            .delete()
            .in("id", insertedSectionIds);
          if (rollbackError) throw rollbackError;
        } catch (rollbackError) {
          console.error("❌ MENU ROLLBACK FAILED:", rollbackError);
          toast({
            title: "Save failed and cleanup didn't finish",
            description: "Your previous menu may now appear twice. Please reload the page and save again — or message support and we'll sort it out.",
            variant: "destructive",
          });
        }
      }

      toast({
        title: "Menu not saved",
        description:
          error?.message ||
          "We couldn't save your menu. Your previous menu is unchanged — please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
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
          <Button
            onClick={saveMenu}
            disabled={saving}
            className="gradient-primary text-white flex-1 sm:flex-none min-h-[44px]"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              "Save Menu"
            )}
          </Button>
        </div>
      </div>

      {showImageUpload && (
        <Card className="p-6 card-elevated bg-gradient-subtle">
          <MenuImageUpload restaurantId={restaurantId} onMenuParsed={handleMenuParsed} />
        </Card>
      )}

      <Alert className="border-primary/20 bg-primary/5">
        <Mail className="h-4 w-4 text-primary" />
        <AlertDescription className="text-sm">
          <span className="font-medium">Having trouble uploading?</span> Just email us a photo of your menu and we'll input it for you!{' '}
          <a 
            href="mailto:tap@tapaway.co?subject=Menu Upload Request" 
            className="text-primary font-semibold hover:underline"
          >
            tap@tapaway.co
          </a>
          {' '}with subject: <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">Menu Upload Request</span>
        </AlertDescription>
      </Alert>

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
            <Collapsible key={sIdx} defaultOpen={false}>
              <Card className="card-elevated overflow-hidden">
                <div className="flex items-center gap-2 p-4 sm:p-6">
                  <CollapsibleTrigger className="flex items-center gap-2 flex-1 min-w-0 text-left">
                    <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground transition-transform duration-200 [[data-state=open]>*>&]:rotate-180" />
                    <span className="font-semibold truncate">
                      {section.name || 'Untitled Section'}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      ({section.items.length} {section.items.length === 1 ? 'item' : 'items'})
                    </span>
                  </CollapsibleTrigger>
                  <Button variant="ghost" size="sm" onClick={() => removeSection(sIdx)} className="text-destructive shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <CollapsibleContent>
                  <div className="px-4 pb-4 sm:px-6 sm:pb-6 space-y-4">
                    <div>
                      <Label className="text-sm font-semibold mb-2 block">Section Name</Label>
                      <Input
                        value={section.name}
                        onChange={(e) => updateSection(sIdx, 'name', e.target.value)}
                        placeholder="e.g., Appetizers, Main Dishes"
                        className="text-lg font-semibold"
                      />
                    </div>

                    <div className="space-y-3">
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

                    <Button onClick={() => addItem(sIdx)} variant="outline" size="sm" className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Item
                    </Button>
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
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