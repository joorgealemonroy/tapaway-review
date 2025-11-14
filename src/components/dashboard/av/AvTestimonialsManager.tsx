import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Testimonial {
  id: string;
  restaurant_id: string;
  quote: string;
  author: string;
  sort_order: number;
}

interface AvTestimonialsManagerProps {
  restaurantId: string;
}

export const AvTestimonialsManager = ({ restaurantId }: AvTestimonialsManagerProps) => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(false);
  const [newTestimonial, setNewTestimonial] = useState({
    quote: "",
    author: "",
  });

  useEffect(() => {
    fetchTestimonials();
  }, [restaurantId]);

  const fetchTestimonials = async () => {
    const { data } = await supabase
      .from("av_meal_prep_testimonials")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("sort_order");
    
    if (data) setTestimonials(data as Testimonial[]);
  };

  const handleAdd = async () => {
    if (!newTestimonial.quote || !newTestimonial.author) {
      toast.error("Please fill in both quote and author");
      return;
    }

    try {
      setLoading(true);
      const maxOrder = Math.max(...testimonials.map(t => t.sort_order), 0);
      
      const { error } = await supabase
        .from("av_meal_prep_testimonials")
        .insert({
          restaurant_id: restaurantId,
          quote: newTestimonial.quote,
          author: newTestimonial.author,
          sort_order: maxOrder + 1,
        });

      if (error) throw error;

      toast.success("Testimonial added");
      setNewTestimonial({ quote: "", author: "" });
      fetchTestimonials();
    } catch (error: any) {
      toast.error(`Failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this testimonial?")) return;

    const { error } = await supabase
      .from("av_meal_prep_testimonials")
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
      {/* Add New Testimonial */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Add New Testimonial</h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="quote">Quote *</Label>
            <Textarea
              id="quote"
              value={newTestimonial.quote}
              onChange={(e) => setNewTestimonial({...newTestimonial, quote: e.target.value})}
              placeholder="Portions are perfect and always fresh."
              rows={3}
            />
          </div>
          <div>
            <Label htmlFor="author">Author * (e.g., "— Jasmine M.")</Label>
            <Input
              id="author"
              value={newTestimonial.author}
              onChange={(e) => setNewTestimonial({...newTestimonial, author: e.target.value})}
              placeholder="— Jasmine M."
            />
          </div>
          <Button onClick={handleAdd} disabled={loading} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Testimonial
          </Button>
        </div>
      </Card>

      {/* Existing Testimonials */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Testimonials ({testimonials.length})</h3>
        {testimonials.length === 0 ? (
          <p className="text-sm text-muted-foreground">No testimonials yet. Add one above!</p>
        ) : (
          testimonials.map((testimonial) => (
            <Card key={testimonial.id} className="p-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <p className="text-sm italic">"{testimonial.quote}"</p>
                  <p className="text-sm text-muted-foreground mt-2">{testimonial.author}</p>
                </div>
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={() => handleDelete(testimonial.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
