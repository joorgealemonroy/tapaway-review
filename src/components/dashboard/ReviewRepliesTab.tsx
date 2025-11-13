import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Copy, Star, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface ReviewRepliesTabProps {
  restaurantId: string;
}

interface ReviewReply {
  reviewText: string;
  reviewerName: string;
  rating: number;
  aiReply: string;
}

export const ReviewRepliesTab = ({ restaurantId }: ReviewRepliesTabProps) => {
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
    <div className="space-y-4 md:space-y-6 px-2 md:px-0">
      <div>
        <h2 className="text-xl md:text-2xl font-bold mb-2">AI Review Replies</h2>
        <p className="text-sm md:text-base text-muted-foreground">
          Generate professional, personalized responses to customer reviews using AI
        </p>
      </div>

      <Card className="p-4 md:p-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="reviewer-name">Reviewer Name (optional)</Label>
            <Input
              id="reviewer-name"
              value={reviewerName}
              onChange={(e) => setReviewerName(e.target.value)}
              placeholder="John D."
            />
          </div>

          <div>
            <Label htmlFor="rating">Rating</Label>
            <div className="flex gap-2 mt-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  onClick={() => setRating(value)}
                  className={`text-2xl ${value <= rating ? 'text-yellow-500' : 'text-gray-300'}`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="review-text">Review Text</Label>
            <Textarea
              id="review-text"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Paste the customer's review here..."
              rows={6}
            />
          </div>

          <Button onClick={generateReply} disabled={generating} className="w-full">
            <Sparkles className={`w-4 h-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Generating...' : 'Generate AI Reply'}
          </Button>
        </div>
      </Card>

      {replies.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Generated Replies</h3>
          {replies.map((reply, index) => (
            <Card key={index} className="p-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium">Review</span>
                    <div className="flex text-yellow-500">
                      {Array.from({ length: reply.rating }).map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-current" />
                      ))}
                    </div>
                  </div>
                  {reply.reviewerName && (
                    <p className="text-sm text-muted-foreground mb-2">
                      By: {reply.reviewerName}
                    </p>
                  )}
                  <p className="text-sm bg-muted p-4 rounded-lg">{reply.reviewText}</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Suggested Reply</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyReply(reply.aiReply)}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </Button>
                  </div>
                  <p className="text-sm bg-primary/5 p-4 rounded-lg border border-primary/20">
                    {reply.aiReply}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};