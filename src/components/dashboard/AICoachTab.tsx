import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, RefreshCw, Send, Unlock, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import { formatDistanceToNow, format } from "date-fns";
import { useAdminAccess } from "@/hooks/useAdminAccess";

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
  reviewCount: number;
  sentiment: {
    positiveCount: number;
    negativeCount: number;
    percentagePositive: number | null;
    hasEnoughData: boolean;
  };
  lastUpdated: string;
}

interface LockedResponse {
  locked: true;
  totalTaps: number;
  requiredTaps: number;
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
  const [ignoredCategories, setIgnoredCategories] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [lockedInfo, setLockedInfo] = useState<LockedResponse | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const { isAdmin } = useAdminAccess();

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

  const handleResolved = async (category: string) => {
    // Set to 100 years from now for permanent resolution
    const ignoreUntil = new Date();
    ignoreUntil.setFullYear(ignoreUntil.getFullYear() + 100);

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
      toast.error("Failed to mark as resolved");
      console.error('Error resolving category:', error);
      return;
    }

    setIgnoredCategories(prev => new Set([...prev, category]));
    toast.success("Marked as resolved");
  };

  const handleRestoreIgnored = async () => {
    const { error } = await supabase
      .from('coach_ignored')
      .delete()
      .eq('restaurant_id', restaurantId);

    if (error) {
      toast.error("Failed to restore items");
      console.error('Error restoring ignored categories:', error);
      return;
    }

    setIgnoredCategories(new Set());
    toast.success("Hidden items restored");
  };

  const loadStats = async () => {
    setIsLoadingStats(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-coach-insights', {
        body: { restaurantId }
      });

      if (error) {
        console.error('Error loading AI Coach stats:', error);
        toast.error("Failed to load insights");
        return;
      }

      // Check if AI Coach is locked (returned as 200 with locked flag)
      if (data?.locked === true) {
        setLockedInfo(data as LockedResponse);
        setStats(null);
        return;
      }

      setStats(data);
      setLockedInfo(null);
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
      const { data, error } = await supabase.functions.invoke('sync-google-reviews', {
        body: { restaurant_id: restaurantId }
      });
      
      // Handle specific error cases
      if (error || data?.error) {
        const errorMessage = data?.error || error?.message || '';
        if (errorMessage.includes('no Google Place ID')) {
          toast.error("This restaurant doesn't have Google linked yet. Add a Google Place ID in settings first.");
        } else {
          toast.error("We couldn't reach Google right now. Try again in a bit.");
        }
        return;
      }
      
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

  const handleAdminUnlock = async () => {
    setIsUnlocking(true);
    try {
      const { error } = await supabase
        .from('restaurants')
        .update({ ai_coach_unlocked: true })
        .eq('id', restaurantId);

      if (error) throw error;

      toast.success("AI Coach unlocked for this restaurant.");
      await loadStats(); // Re-fetch to get unlocked state
    } catch (error) {
      console.error('Error unlocking AI Coach:', error);
      toast.error("Failed to unlock AI Coach");
    } finally {
      setIsUnlocking(false);
    }
  };

  if (isLoadingStats) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (lockedInfo) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="pt-12 pb-12 text-center">
          <div className="text-6xl mb-6">🔒</div>
          <h2 className="text-3xl font-bold mb-4">AI Coach Locked</h2>
          <p className="text-lg mb-6 text-muted-foreground">
            Unlock AI-powered insights at <span className="font-bold text-foreground">1,000 taps</span>
          </p>
          <div className="max-w-md mx-auto mb-8">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">{lockedInfo.totalTaps} taps</span>
              <span className="font-semibold">{lockedInfo.requiredTaps} taps</span>
            </div>
            <div className="relative h-3 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(lockedInfo.totalTaps / lockedInfo.requiredTaps) * 100}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-8">
            Keep sharing your TapAway cards! Once you hit 1,000 taps, you'll unlock personalized insights, sentiment analysis, and AI-powered recommendations to grow your business.
          </p>
          
          {/* Admin-only unlock button */}
          {isAdmin && (
            <div className="border-t pt-6 mt-6">
              <Button
                onClick={handleAdminUnlock}
                disabled={isUnlocking}
                variant="outline"
                className="gap-2"
              >
                {isUnlocking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Unlock className="h-4 w-4" />
                )}
                Unlock AI Coach early (admin only)
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                This permanently unlocks AI Coach for this restaurant, even if they have fewer than 1,000 taps.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
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
        reviewCount={stats.reviewCount}
      />

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Wins + Opportunities */}
        <div className="space-y-6">
          {/* Wins */}
          {stats.wins.length > 0 ? (
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="text-2xl">🏆</span>
                  Where you're winning
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {stats.wins.slice(0, 3).map((win, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1, duration: 0.3 }}
                    className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-900/30"
                  >
                    <span className="text-emerald-500 mt-0.5">✓</span>
                    <p className="text-sm leading-relaxed">{win}</p>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {/* Opportunities */}
          {visibleOpportunities.length > 0 ? (
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
                        onClick={() => handleResolved(opp.category)}
                        className="text-xs text-muted-foreground h-auto py-1 px-2 hover:text-foreground"
                      >
                        ✓ Resolved
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
                  No recent bad reviews in your last few Google reviews.
                </p>
                <p className="text-xs text-muted-foreground">
                  Keep doing what you're doing.
                </p>
              </CardContent>
            </Card>
          ) : null}

          {/* Restore resolved items button */}
          {ignoredCategories.size > 0 && (
            <button
              onClick={handleRestoreIgnored}
              className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors mx-auto"
            >
              <RotateCcw className="h-3 w-3" />
              Show {ignoredCategories.size} resolved item{ignoredCategories.size > 1 ? 's' : ''}
            </button>
          )}

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
  reviewCount
}: { 
  sentiment: AiCoachStats['sentiment']; 
  reviewCount: number;
}) => {
  const { positiveCount, negativeCount, percentagePositive, hasEnoughData } = sentiment;

  if (!hasEnoughData || percentagePositive === null) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <div className="text-4xl mb-2">👍</div>
          <h3 className="text-3xl font-bold mb-2">Not enough recent reviews yet</h3>
          <p className="text-sm text-muted-foreground">
            Once you have more reviews, we'll show clear trends here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="mb-4">
          <h3 className="text-4xl font-bold mb-2">{percentagePositive}% happy guests</h3>
          <p className="text-sm text-muted-foreground">
            Based on your {reviewCount} most relevant Google review{reviewCount !== 1 ? 's' : ''} (not necessarily newest).
          </p>
        </div>

        {/* Gradient Bar */}
        <div className="relative h-3 rounded-full overflow-hidden bg-slate-100">
          <motion.div
            className="h-full rounded-full"
            style={{
              background: `linear-gradient(to right, 
                ${percentagePositive >= 80 ? 'hsl(142, 76%, 36%)' : 
                  percentagePositive >= 60 ? 'hsl(45, 93%, 47%)' : 
                  'hsl(25, 95%, 53%)'}, 
                ${percentagePositive >= 80 ? 'hsl(142, 76%, 36%)' : 
                  percentagePositive >= 60 ? 'hsl(45, 93%, 47%)' : 
                  'hsl(25, 95%, 53%)'})`
            }}
            initial={{ width: 0 }}
            animate={{ width: `${percentagePositive}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>

        {/* Stats Row */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mt-4 text-sm">
          <span className="text-muted-foreground">
            👍 Happy guests — {positiveCount} review{positiveCount !== 1 ? 's' : ''}
          </span>
          <span className="text-muted-foreground">
            😕 Needs attention — {negativeCount} review{negativeCount !== 1 ? 's' : ''}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};