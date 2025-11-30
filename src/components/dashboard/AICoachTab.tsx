import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, RefreshCw, Send, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

interface Review {
  author_name: string;
  rating: number;
  text: string;
  relative_time_description: string | null;
  review_time: string;
}

interface Opportunity {
  category: string;
  title: string;
  summary: string;
  quickWin: string;
}

interface AiCoachStats {
  totalTaps: number;
  wins: string[];
  opportunities: Opportunity[];
  recentReviews: Review[];
  moreReviews: Review[];
  sentiment: {
    positiveCount: number;
    negativeCount: number;
    percentagePositive: number | null;
  };
  lastUpdated: string;
}

export const AICoachTab = ({ restaurantId }: { restaurantId: string }) => {
  const [stats, setStats] = useState<AiCoachStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showMoreReviews, setShowMoreReviews] = useState(false);
  const [ignoredCategories, setIgnoredCategories] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [isLoadingChat, setIsLoadingChat] = useState(false);

  useEffect(() => {
    loadStats();
    loadIgnoredCategories();
  }, [restaurantId]);

  const loadIgnoredCategories = async () => {
    const { data, error } = await supabase
      .from('coach_ignored')
      .select('category, ignore_until')
      .eq('restaurant_id', restaurantId);

    if (error) {
      console.error('Error loading ignored categories:', error);
      return;
    }

    const now = new Date();
    const ignored = new Set<string>();
    
    data?.forEach(item => {
      const ignoreUntil = new Date(item.ignore_until);
      if (ignoreUntil > now) {
        ignored.add(item.category);
      }
    });

    setIgnoredCategories(ignored);
  };

  const handleIgnore = async (category: string) => {
    const ignoreUntil = new Date();
    ignoreUntil.setDate(ignoreUntil.getDate() + 7);

    const { error } = await supabase
      .from('coach_ignored')
      .upsert({
        restaurant_id: restaurantId,
        category,
        ignore_until: ignoreUntil.toISOString(),
      }, {
        onConflict: 'restaurant_id,category'
      });

    if (error) {
      toast.error("Failed to ignore item");
      console.error('Error ignoring category:', error);
      return;
    }

    setIgnoredCategories(prev => new Set([...prev, category]));
    toast.success("Hidden for 7 days");
  };

  const loadStats = async () => {
    setIsLoadingStats(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-coach-insights', {
        body: { restaurantId }
      });

      if (error) throw error;
      setStats(data);
    } catch (error) {
      console.error('Error loading AI Coach stats:', error);
      toast.error("Failed to load insights");
    } finally {
      setIsLoadingStats(false);
    }
  };

  const handleRefresh = async () => {
    setIsSyncing(true);
    try {
      await supabase.functions.invoke('sync-google-reviews', {
        body: { restaurant_id: restaurantId }
      });
      await loadStats();
      toast.success("Reviews refreshed");
    } catch (error) {
      console.error('Error syncing reviews:', error);
      toast.error("We couldn't reach Google right now. Try again in a bit.");
    } finally {
      setIsSyncing(false);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || isLoadingChat) return;

    const userMessage = message.trim();
    setMessage("");
    setChatHistory(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoadingChat(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-coach-chat', {
        body: {
          restaurantId,
          message: userMessage,
          chatHistory
        }
      });

      if (error) throw error;

      setChatHistory(prev => [...prev, { role: "assistant", content: data.response }]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error("Failed to send message");
    } finally {
      setIsLoadingChat(false);
    }
  };

  if (isLoadingStats) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Unable to load insights</p>
      </div>
    );
  }

  const visibleOpportunities = stats.opportunities.filter(
    opp => !ignoredCategories.has(opp.category)
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header with Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">AI Coach</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Last updated: {formatDistanceToNow(new Date(stats.lastUpdated), { addSuffix: true })}
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={isSyncing} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
          Refresh Google Reviews
        </Button>
      </div>

      {/* Sentiment Card */}
      <SentimentCard sentiment={stats.sentiment} />

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Wins + Opportunities + Reviews */}
        <div className="space-y-6">
          {/* Wins */}
          {stats.wins.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Where you're winning 🎉</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {stats.wins.map((win, idx) => (
                  <p key={idx} className="text-sm">{win}</p>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Opportunities */}
          {visibleOpportunities.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top things to fix next</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {visibleOpportunities.map((opp, idx) => (
                  <div key={idx} className="space-y-2 pb-4 border-b last:border-b-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-sm">{opp.title}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleIgnore(opp.category)}
                        className="text-xs text-muted-foreground h-auto py-1 px-2"
                      >
                        Ignore
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">{opp.summary}</p>
                    <p className="text-sm font-medium text-primary">Quick win: {opp.quickWin}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : stats.opportunities.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top things to fix next</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  No clear issues popping up — keep doing what you're doing and collect more reviews.
                </p>
              </CardContent>
            </Card>
          ) : null}

          {/* Recent Reviews */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Google reviews</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {stats.recentReviews.length === 0 ? (
                <p className="text-sm text-muted-foreground">No reviews yet</p>
              ) : (
                <>
                  {stats.recentReviews.map((review, idx) => (
                    <div key={idx} className="space-y-1 pb-4 border-b last:border-b-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{review.author_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {"⭐".repeat(review.rating)}
                        </span>
                        {review.relative_time_description && (
                          <span className="text-xs text-muted-foreground">
                            • {review.relative_time_description}
                          </span>
                        )}
                      </div>
                      {review.text && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {review.text}
                        </p>
                      )}
                    </div>
                  ))}

                  {!showMoreReviews && stats.moreReviews.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowMoreReviews(true)}
                      className="w-full"
                    >
                      <ChevronDown className="h-4 w-4 mr-2" />
                      Show more
                    </Button>
                  )}

                  {showMoreReviews && stats.moreReviews.map((review, idx) => (
                    <div key={idx} className="space-y-1 pb-4 border-b last:border-b-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{review.author_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {"⭐".repeat(review.rating)}
                        </span>
                        {review.relative_time_description && (
                          <span className="text-xs text-muted-foreground">
                            • {review.relative_time_description}
                          </span>
                        )}
                      </div>
                      {review.text && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {review.text}
                        </p>
                      )}
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: AI Chat (40% height) */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-lg">Ask your AI Coach</CardTitle>
            <CardDescription>Get personalized insights</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-[160px] overflow-y-auto space-y-3 border rounded-lg p-3 bg-muted/30">
              {chatHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Ask me anything
                </p>
              ) : (
                chatHistory.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`text-sm ${
                      msg.role === "user"
                        ? "text-right"
                        : "text-left"
                    }`}
                  >
                    <div
                      className={`inline-block px-3 py-2 rounded-lg ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-background border"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
              {isLoadingChat && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Thinking...
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Ask a question..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                disabled={isLoadingChat}
              />
              <Button onClick={sendMessage} disabled={isLoadingChat || !message.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const SentimentCard = ({ sentiment }: { sentiment: AiCoachStats['sentiment'] }) => {
  const { positiveCount, negativeCount, percentagePositive } = sentiment;
  const total = positiveCount + negativeCount;

  if (total === 0 || percentagePositive === null) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <div className="text-4xl mb-2">👍</div>
          <h3 className="text-xl font-bold mb-2">Waiting for your first Google reviews</h3>
          <p className="text-sm text-muted-foreground">
            You're already getting taps — as soon as reviews arrive, I'll break down how guests feel.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (total < 5) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <h3 className="text-3xl font-bold mb-2">{percentagePositive}% happy guests</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Early signal from a few reviews — keep collecting more
          </p>
          <div className="flex items-center justify-center gap-6 text-sm">
            <div>
              <span className="mr-2">😊</span>
              Happy — {positiveCount}
            </div>
            <div>
              <span className="mr-2">😕</span>
              Needs attention — {negativeCount}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-center mb-4">
          <h3 className="text-4xl font-bold mb-2">{percentagePositive}% happy guests</h3>
          <p className="text-sm text-muted-foreground">
            Based on your Google reviews
          </p>
        </div>

        <motion.div
          className="h-3 rounded-full overflow-hidden bg-muted mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="h-full bg-gradient-to-r from-green-500 to-orange-500"
            initial={{ width: 0 }}
            animate={{ width: `${percentagePositive}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </motion.div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-xl">😊</span>
            <div>
              <div className="font-medium">Happy</div>
              <div className="text-muted-foreground">{positiveCount}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl">😕</span>
            <div>
              <div className="font-medium">Needs attention</div>
              <div className="text-muted-foreground">{negativeCount}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
