import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Megaphone, BarChart3, Info } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
interface Engagement {
  id: string;
  type: 'promotion' | 'poll';
  content: string;
  options: any;
  is_active: boolean;
}

export interface EngagementTabProps {
  restaurantId: string;
  isDemoView?: boolean;
}

export const EngagementTab = ({ restaurantId, isDemoView = false }: EngagementTabProps) => {
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
      // First, deactivate any existing active engagement of the same type
      await supabase
        .from("restaurant_engagement")
        .update({ is_active: false })
        .eq("restaurant_id", restaurantId)
        .eq("type", type)
        .eq("is_active", true);

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

  const handleToggleActive = async (id: string, currentStatus: boolean, engagementType: 'promotion' | 'poll') => {
    try {
      // If activating, first deactivate other same-type engagements
      if (!currentStatus) {
        await supabase
          .from("restaurant_engagement")
          .update({ is_active: false })
          .eq("restaurant_id", restaurantId)
          .eq("type", engagementType)
          .eq("is_active", true);
      }

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

      <Alert className="border-primary/20 bg-primary/5">
        <Info className="h-4 w-4 text-primary" />
        <AlertDescription className="text-sm">
          <strong>Tip:</strong> You can have 1 active promotion and 1 active poll at the same time. Activating a new one will automatically deactivate the previous of the same type.
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Your Engagements</h3>
        {engagements.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            No engagements yet. Create your first promotion or poll above.
          </Card>
        ) : (
          engagements.map((engagement) => {
            const totalVotes = engagement.type === 'poll' && engagement.options?.votes 
              ? Object.values(engagement.options.votes as Record<string, number>).reduce((a, b) => a + b, 0)
              : 0;
            
            return (
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
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center justify-between text-xs font-medium mb-2">
                          <span>Poll Results</span>
                          <span className="text-muted-foreground">Total votes: {totalVotes}</span>
                        </div>
                        {engagement.options.choices.map((choice: string, i: number) => {
                          const votes = engagement.options?.votes?.[i] || 0;
                          const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                          
                          return (
                            <div key={i} className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="font-medium">{choice}</span>
                                <span className="text-muted-foreground">{votes} votes ({percentage}%)</span>
                              </div>
                              <div className="w-full bg-secondary rounded-full h-2">
                                <div 
                                  className="bg-primary rounded-full h-2 transition-all duration-300"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(engagement.id, engagement.is_active, engagement.type)}
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
            );
          })
        )}
      </div>
    </div>
  );
};
