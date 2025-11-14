import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Edit2 } from "lucide-react";
import { toast } from "sonner";

interface Testimonial {
  id: string;
  quote: string;
  author: string;
  sort_order: number;
  is_active: boolean;
}

interface AvTestimonialsManagerProps {
  restaurantId: string;
}

export const AvTestimonialsManager = ({ restaurantId }: AvTestimonialsManagerProps) => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [newQuote, setNewQuote] = useState("");
  const [newAuthor, setNewAuthor] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTestimonials();
  }, [restaurantId]);

  const fetchTestimonials = async () => {
    const { data } = await supabase
      .from("avm_testimonials")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("sort_order");
    
    if (data) setTestimonials(data);
  };

  const handleAdd = async () => {
    if (!newQuote || !newAuthor) {
      toast.error("Please fill in both quote and author");
      return;
    }

    try {
      setLoading(true);
      const maxOrder = Math.max(...testimonials.map(t => t.sort_order), 0);
      
      const { error } = await supabase
        .from("avm_testimonials")
        .insert({
          restaurant_id: restaurantId,
          quote: newQuote,
          author: newAuthor,
          sort_order: maxOrder + 1,
          is_active: true
        });

      if (error) throw error;

      toast.success("Testimonial added");
      setNewQuote("");
      setNewAuthor("");
      fetchTestimonials();
    } catch (error: any) {
      toast.error(`Failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    const { error } = await supabase
      .from("avm_testimonials")
      .update({ is_active: !currentActive })
      .eq("id", id);

    if (error) {
      toast.error(`Failed: ${error.message}`);
    } else {
      toast.success(currentActive ? "Testimonial hidden" : "Testimonial shown");
      fetchTestimonials();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this testimonial?")) return;

    const { error } = await supabase
      .from("avm_testimonials")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error(`Failed: ${error.message}`);
    } else {
      toast.success("Testimonial deleted");
      fetchTestimonials();
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Add New Testimonial</h3>
        <div>
          <Label htmlFor="new-quote">Quote</Label>
          <Textarea
            id="new-quote"
            value={newQuote}
            onChange={(e) => setNewQuote(e.target.value)}
            placeholder="Portions are perfect and always fresh..."
            rows={3}
          />
        </div>
        <div>
          <Label htmlFor="new-author">Author (e.g., Jasmine M.)</Label>
          <Input
            id="new-author"
            value={newAuthor}
            onChange={(e) => setNewAuthor(e.target.value)}
            placeholder="— Jasmine M."
          />
        </div>
        <Button onClick={handleAdd} disabled={loading} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Add Testimonial
        </Button>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Existing Testimonials ({testimonials.length})</h3>
        {testimonials.length === 0 ? (
          <p className="text-sm text-muted-foreground">No testimonials yet. Add one above!</p>
        ) : (
          testimonials.map((testimonial) => (
            <Card key={testimonial.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm italic mb-2">"{testimonial.quote}"</p>
                  <p className="text-sm text-primary font-medium">{testimonial.author}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={testimonial.is_active}
                    onCheckedChange={() => handleToggleActive(testimonial.id, testimonial.is_active)}
                  />
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={() => handleDelete(testimonial.id)}
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