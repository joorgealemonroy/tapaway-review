import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Copy, Sparkles, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export interface ReviewRepliesTabProps {
  restaurantId: string;
  isDemoView?: boolean;
}

interface ReviewReply {
  reviewText: string;
  reviewerName: string;
  rating: number;
  aiReply: string;
}

export const ReviewRepliesTab = ({ restaurantId, isDemoView = false }: ReviewRepliesTabProps) => {
  const [reviewText, setReviewText] = useState('');
  const [reviewerName, setReviewerName] = useState('');
  const [rating, setRating] = useState(5);
  const [replies, setReplies] = useState<ReviewReply[]>([]);
  const [generating, setGenerating] = useState(false);

  const generateReply = async () => {
    if (!reviewText.trim()) {
      toast.error('Please enter a review');
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-review-reply', {
        body: {
          restaurantId,
          reviewText,
          reviewerName,
          rating
        }
      });

      if (error) throw error;

      const newReply: ReviewReply = {
        reviewText,
        reviewerName,
        rating,
        aiReply: data.reply
      };

      setReplies([newReply, ...replies]);
      setReviewText('');
      setReviewerName('');
      setRating(5);
      toast.success('Reply generated successfully');
    } catch (error) {
      console.error('Error generating reply:', error);
      toast.error('Failed to generate reply');
    } finally {
      setGenerating(false);
    }
  };

  const copyReply = (reply: string) => {
    navigator.clipboard.writeText(reply);
    toast.success('Reply copied to clipboard');
  };

  return (
    <div className="space-y-6 pb-8 animate-fade-in">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold mb-2 flex items-center gap-2">
          <MessageSquare className="w-7 h-7 text-primary" />
          AI Review Replies
        </h2>
        <p className="text-muted-foreground">Generate professional responses to customer reviews</p>
      </div>

      <Card className="p-6 card-elevated">
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="reviewer-name" className="text-sm font-semibold">Reviewer Name (Optional)</Label>
              <Input
                id="reviewer-name"
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                placeholder="John D."
                className="mt-2"
              />
            </div>
            <div>
              <Label className="text-sm font-semibold mb-2 block">Rating</Label>
              <div className="flex gap-2 mt-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    onClick={() => setRating(value)}
                    className={`text-3xl transition-smooth ${value <= rating ? 'text-yellow-500 scale-110' : 'text-gray-300'}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="review-text" className="text-sm font-semibold">Review Text</Label>
            <Textarea
              id="review-text"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Paste the customer's review here..."
              rows={6}
              className="mt-2"
            />
          </div>

          <Button onClick={generateReply} disabled={generating} className="w-full gradient-primary text-white">
            <Sparkles className={`w-4 h-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Generating Reply...' : 'Generate AI Reply'}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            💡 Example: "The food was great but service was slow" → AI generates empathetic, professional response
          </p>
        </div>
      </Card>

      {replies.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold">Generated Replies</h3>
          {replies.map((reply, index) => (
            <Card key={index} className="p-6 card-elevated">
              <div className="space-y-4">
                <div className="pb-4 border-b">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold">{reply.reviewerName || 'Anonymous'}</p>
                    <div className="flex gap-1">
                      {Array.from({ length: reply.rating }).map((_, i) => (
                        <span key={i} className="text-yellow-500">★</span>
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground italic">"{reply.reviewText}"</p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-primary">AI Generated Reply:</p>
                    <Button variant="outline" size="sm" onClick={() => copyReply(reply.aiReply)}>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </Button>
                  </div>
                  <p className="text-sm leading-relaxed">{reply.aiReply}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};