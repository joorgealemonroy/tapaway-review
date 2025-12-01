import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, RefreshCw, Send } from "lucide-react";
import { motion } from "framer-motion";
import { formatDistanceToNow, format } from "date-fns";

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
  sentiment: {
    positiveCount: number;
    negativeCount: number;
    percentagePositive: number | null;
  };
  lastUpdated: string;
}

const SUGGESTED_QUESTIONS = [
  "What are guests' biggest concerns?",
  "What do customers love the most?",
  "What should I fix first?",
  "Any trends I should watch?",
  "How can I get more reviews this week?",
];

export const AICoachTab = ({ restaurantId }: { restaurantId: string }) => {
  const [stats, setStats] = useState<AiCoachStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [reviewLimit, setReviewLimit] = useState<number>(10);
  const [ignoredCategories, setIgnoredCategories] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [isChangingLimit, setIsChangingLimit] = useState(false);

  useEffect(() => {
    loadStats();
    loadIgnoredCategories();
  }, [restaurantId]);

  useEffect(() => {
    if (stats) {
      loadStats(true);
    }
  }, [reviewLimit]);

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
    ignoreUntil.setDate(ignoreUntil.getDate() + 30);

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
    toast.success("Hidden for 30 days");
  };

  const loadStats = async (showLimitChange = false) => {
    if (showLimitChange) {
      setIsChangingLimit(true);
    } else {
      setIsLoadingStats(true);
    }
    try {
      const { data, error } = await supabase.functions.invoke('ai-coach-insights', {
        body: { restaurantId, reviewLimit }
      });

      if (error) throw error;
      setStats(data);
    } catch (error) {
      console.error('Error loading AI Coach stats:', error);
      toast.error("Failed to load insights");
    } finally {
      setIsLoadingStats(false);
      setIsChangingLimit(false);
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

  const sendMessage = async (questionText?: string) => {
    const textToSend = questionText || message.trim();
    if (!textToSend || isLoadingChat) return;

    setMessage("");
    setChatHistory(prev => [...prev, { role: "user", content: textToSend }]);
    setIsLoadingChat(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-coach-chat', {
        body: {
          restaurantId,
          message: textToSend,
          chatHistory,
          stats: stats // Pass current stats to chat function
        }
      });

      if (error) throw error;

      setChatHistory(prev => [...prev, { role: "assistant", content: data.reply }]);
      
      // Auto-scroll to bottom
      setTimeout(() => {
        const container = document.getElementById('chat-container');
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      }, 100);
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
            Last updated: {(() => {
              const now = new Date();
              const updated = new Date(stats.lastUpdated);
              const diffMs = now.getTime() - updated.getTime();
              const diffMinutes = Math.floor(diffMs / 60000);
              const diffHours = Math.floor(diffMs / 3600000);
              
              if (diffMinutes < 1) return 'just now';
              if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
              if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
              return `on ${format(updated, 'MMM d, yyyy')}`;
            })()}
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={isSyncing} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
          Refresh Google Reviews
        </Button>
      </div>

      {/* Sentiment Card */}
      <SentimentCard 
        sentiment={stats.sentiment} 
        reviewCount={stats.recentReviews.length} 
        isChanging={isChangingLimit}
        reviewLimit={reviewLimit}
        onReviewLimitChange={setReviewLimit}
      />

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Wins + Opportunities + Reviews */}
        <div className="space-y-6">
          {/* Wins */}
          {isChangingLimit ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Where you're winning 🎉</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </CardContent>
            </Card>
          ) : stats.wins.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Where you're winning 🎉</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {stats.wins.slice(0, 3).map((win, idx) => (
                  <p key={idx} className="text-sm">{win}</p>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {/* Opportunities */}
          {isChangingLimit ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top things to fix next</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </CardContent>
            </Card>
          ) : visibleOpportunities.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top things to fix next</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {visibleOpportunities.slice(0, 3).map((opp, idx) => (
                  <motion.div
                    key={opp.category}
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-2 pb-4 border-b last:border-b-0 last:pb-0"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-sm">{opp.title}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleIgnore(opp.category)}
                        className="text-xs text-muted-foreground h-auto py-1 px-2 hover:text-foreground"
                      >
                        Ignore
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">{opp.summary}</p>
                    <p className="text-sm font-medium text-primary">Quick win: {opp.quickWin}</p>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          ) : stats.opportunities.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top things to fix next</CardTitle>
              </CardHeader>
              <CardContent className="text-center py-6">
                <div className="text-4xl mb-3">🎉</div>
                <p className="text-sm font-medium mb-2">
                  No recent bad reviews in the last 90 days.
                </p>
                <p className="text-xs text-muted-foreground">
                  Keep doing what you're doing and collecting more feedback.
                </p>
              </CardContent>
            </Card>
          ) : null}

        </div>

        {/* Right: AI Chat */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-lg">Ask your AI Coach</CardTitle>
            <CardDescription>Get personalized insights</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Suggested Questions Pills */}
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((question, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  onClick={() => sendMessage(question)}
                  disabled={isLoadingChat}
                  className="text-xs h-auto py-1.5 px-3"
                >
                  {question}
                </Button>
              ))}
            </div>

            {/* Chat History */}
            <div 
              className="h-[160px] overflow-y-auto space-y-3 border rounded-lg p-3 bg-muted/30"
              id="chat-container"
            >
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

            {/* Input */}
            <div className="flex gap-2">
              <Input
                placeholder="Ask a question..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                disabled={isLoadingChat}
              />
              <Button onClick={() => sendMessage()} disabled={isLoadingChat || !message.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const SentimentCard = ({ 
  sentiment, 
  reviewCount, 
  isChanging,
  reviewLimit,
  onReviewLimitChange
}: { 
  sentiment: AiCoachStats['sentiment']; 
  reviewCount: number;
  isChanging: boolean;
  reviewLimit: number;
  onReviewLimitChange: (limit: number) => void;
}) => {
  const { positiveCount, negativeCount, percentagePositive } = sentiment;
  const total = positiveCount + negativeCount;

  if (total === 0 || percentagePositive === null) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <div className="text-4xl mb-2">👍</div>
          <h3 className="text-3xl font-bold mb-2">No Google reviews in the last 90 days yet</h3>
          <p className="text-sm text-muted-foreground">
            Keep sending guests to your TapAway cards to unlock AI insights.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        {isChanging ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
              <div className="text-center sm:text-left flex-1">
                <h3 className="text-4xl font-bold mb-2">{percentagePositive}% happy guests</h3>
                <p className="text-sm text-muted-foreground">
                  Based on your last {reviewCount} Google reviews (past 90 days). We focus on recent feedback so you know what to improve right now.
                </p>
              </div>
              <Select 
                value={reviewLimit.toString()} 
                onValueChange={(val) => onReviewLimitChange(parseInt(val) as 5 | 10 | 20 | 30 | 40 | 50)}
              >
                <SelectTrigger className="w-[160px] shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">Showing last 5</SelectItem>
                  <SelectItem value="10">Showing last 10</SelectItem>
                  <SelectItem value="20">Showing last 20</SelectItem>
                  <SelectItem value="30">Showing last 30</SelectItem>
                  <SelectItem value="40">Showing last 40</SelectItem>
                  <SelectItem value="50">Showing last 50</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Gradient Bar */}
            <motion.div
              className="relative h-3 bg-muted rounded-full overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  background: `linear-gradient(to right, 
                    ${percentagePositive >= 80 ? 'hsl(var(--chart-2))' : 
                      percentagePositive >= 60 ? 'hsl(var(--chart-3))' : 
                      'hsl(var(--chart-1))'} 0%, 
                    ${percentagePositive >= 80 ? 'hsl(var(--chart-2))' : 
                      percentagePositive >= 60 ? 'hsl(var(--chart-4))' : 
                      'hsl(var(--chart-5))'} 100%)`
                }}
                initial={{ width: 0 }}
                animate={{ width: `${percentagePositive}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </motion.div>

            {/* Stats Row */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mt-4 text-sm">
              <span className="text-muted-foreground">
                👍 Happy guests — {positiveCount} reviews ({percentagePositive}%)
              </span>
              <span className="text-muted-foreground">
                😕 Needs attention — {negativeCount} reviews ({100 - percentagePositive}%)
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};