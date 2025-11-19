import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Megaphone, BarChart3 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Engagement {
  id: string;
  type: 'promotion' | 'poll';
  content: string;
  options: any;
  is_active: boolean;
}

interface EngagementTabProps {
  restaurantId: string;
}

export const EngagementTab = ({ restaurantId }: EngagementTabProps) => {
  const { toast } = useToast();
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<'promotion' | 'poll'>('promotion');
  const [content, setContent] = useState('');
  const [promotionLink, setPromotionLink] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

  useEffect(() => {
    fetchEngagements();
  }, [restaurantId]);

  const fetchEngagements = async () => {
    const { data } = await supabase
      .from("restaurant_engagement")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false });

    if (data) {
      setEngagements(data as Engagement[]);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!content.trim()) {
      toast({
        title: "Validation Error",
        description: type === 'promotion' ? "Please enter promotion text" : "Please enter poll question",
        variant: "destructive"
      });
      return;
    }

    if (type === 'poll' && pollOptions.filter(o => o.trim()).length < 2) {
      toast({
        title: "Validation Error",
        description: "Please provide at least 2 poll options",
        variant: "destructive"
      });
      return;
    }

    try {
      const options = type === 'promotion' 
        ? { link: promotionLink }
        : { choices: pollOptions.filter(o => o.trim()), votes: {} };

      const { error } = await supabase
        .from("restaurant_engagement")
        .insert({
          restaurant_id: restaurantId,
          type,
          content,
          options,
          is_active: true
        });

      if (error) throw error;

      toast({ title: "Success", description: `${type === 'promotion' ? 'Promotion' : 'Poll'} created successfully` });
      setContent('');
      setPromotionLink('');
      setPollOptions(['', '']);
      fetchEngagements();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("restaurant_engagement")
        .update({ is_active: !currentStatus })
        .eq("id", id);

      if (error) throw error;

      toast({ title: "Success", description: `Engagement ${!currentStatus ? 'activated' : 'deactivated'}` });
      fetchEngagements();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("restaurant_engagement")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({ title: "Success", description: "Engagement deleted" });
      fetchEngagements();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const addPollOption = () => {
    setPollOptions([...pollOptions, '']);
  };

  const updatePollOption = (index: number, value: string) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };

  const removePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Create New Engagement</h3>
        
        <div className="space-y-4">
          <div>
            <Label>Type</Label>
            <Select value={type} onValueChange={(v: 'promotion' | 'poll') => setType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="promotion">
                  <div className="flex items-center gap-2">
                    <Megaphone className="w-4 h-4" />
                    Promotion
                  </div>
                </SelectItem>
                <SelectItem value="poll">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Poll
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>{type === 'promotion' ? 'Promotion Text' : 'Poll Question'}</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={type === 'promotion' ? 'e.g., "Get 20% off your next order!"' : 'e.g., "What\'s your favorite dish?"'}
              rows={3}
            />
          </div>

          {type === 'promotion' && (
            <div>
              <Label>Link (optional)</Label>
              <Input
                value={promotionLink}
                onChange={(e) => setPromotionLink(e.target.value)}
                placeholder="https://your-promotion-link.com"
              />
            </div>
          )}

          {type === 'poll' && (
            <div>
              <Label>Poll Options</Label>
              <div className="space-y-2">
                {pollOptions.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={option}
                      onChange={(e) => updatePollOption(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                    />
                    {pollOptions.length > 2 && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => removePollOption(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" onClick={addPollOption} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Option
                </Button>
              </div>
            </div>
          )}

          <Button onClick={handleSave} className="w-full">
            Create {type === 'promotion' ? 'Promotion' : 'Poll'}
          </Button>
        </div>
      </Card>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Active Engagements</h3>
        {engagements.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            No engagements yet. Create your first promotion or poll above.
          </Card>
        ) : (
          engagements.map((engagement) => (
            <Card key={engagement.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {engagement.type === 'promotion' ? (
                      <Megaphone className="w-4 h-4 text-primary" />
                    ) : (
                      <BarChart3 className="w-4 h-4 text-primary" />
                    )}
                    <span className="text-sm font-medium capitalize">{engagement.type}</span>
                    <span className={`text-xs px-2 py-1 rounded ${engagement.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {engagement.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-sm mb-2">{engagement.content}</p>
                  {engagement.type === 'promotion' && engagement.options?.link && (
                    <a href={engagement.options.link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                      {engagement.options.link}
                    </a>
                  )}
                  {engagement.type === 'poll' && engagement.options?.choices && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Options: {engagement.options.choices.join(', ')}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(engagement.id, engagement.is_active)}
                  >
                    {engagement.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(engagement.id)}
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
