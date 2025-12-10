import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSalesRep } from '@/hooks/useSalesRep';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, MessageSquare, Package, ExternalLink, Mail } from 'lucide-react';

const RepResources = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { loading: repLoading, isSalesRep } = useSalesRep();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }

    if (!repLoading && !isSalesRep) {
      navigate('/');
      return;
    }
  }, [authLoading, repLoading, user, isSalesRep, navigate]);

  if (authLoading || repLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/rep')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">Resources</h1>
              <p className="text-sm text-muted-foreground">Scripts, product info, and support</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6 max-w-3xl">
        {/* Sales Scripts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Sales Scripts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="font-medium mb-2">Opening a Conversation</h4>
              <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
                <p>"Hey! I'm [Name] with TapAway. Quick question — are you guys actively trying to get more Google reviews?"</p>
                <p className="text-muted-foreground italic">Wait for response, then:</p>
                <p>"Most restaurants struggle with that. We have a simple tool that makes it super easy for your happy customers to leave you 5-star reviews. Takes 30 seconds to set up."</p>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">The 30-Second Pitch</h4>
              <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
                <p>"TapAway gives you NFC cards that customers tap with their phone. It opens your Google review page instantly — no searching, no friction."</p>
                <p>"You put them on tables, near the register, wherever. Happy customers tap, leave a review, done. Most restaurants see 5-10 new reviews in the first month."</p>
                <p>"It's $30/month or $150 for the whole year right now — December special."</p>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Handling "Not Interested"</h4>
              <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
                <p><strong>If they say they're too busy:</strong></p>
                <p>"Totally get it. The signup takes 2 minutes and we ship the cards ready to use. You literally just put them out. Can I leave you a card to try?"</p>
                
                <p className="mt-3"><strong>If they say they already have reviews:</strong></p>
                <p>"That's great! But here's the thing — Google ranks restaurants with recent reviews higher. TapAway keeps fresh reviews coming in consistently. That's what bumps you up in search results."</p>
                
                <p className="mt-3"><strong>If they say it's too expensive:</strong></p>
                <p>"One new customer from a good review covers the whole year. Most restaurants make that back in the first week. Plus we have a December deal — $150 for the whole year instead of $300."</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Product Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Product Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="text-green-500 mt-0.5">✓</span>
                <div>
                  <p className="font-medium">NFC & QR Cards</p>
                  <p className="text-sm text-muted-foreground">Customers tap or scan to open the review page instantly</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-500 mt-0.5">✓</span>
                <div>
                  <p className="font-medium">Works with Google Reviews</p>
                  <p className="text-sm text-muted-foreground">Links directly to Google, Yelp, or any review platform</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-500 mt-0.5">✓</span>
                <div>
                  <p className="font-medium">Dashboard & Analytics</p>
                  <p className="text-sm text-muted-foreground">Track taps, reviews, and customer engagement</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-500 mt-0.5">✓</span>
                <div>
                  <p className="font-medium">Simple Pricing</p>
                  <p className="text-sm text-muted-foreground">$30/month or $150/year (December promo) — no hidden fees</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-500 mt-0.5">✓</span>
                <div>
                  <p className="font-medium">Fast Setup</p>
                  <p className="text-sm text-muted-foreground">Cards ship within a few days, ready to use out of the box</p>
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Links */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              Helpful Links
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start" asChild>
              <a href="https://tapaway.co" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                TapAway Website
              </a>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <a href="mailto:tap@tapaway.co">
                <Mail className="mr-2 h-4 w-4" />
                Support: tap@tapaway.co
              </a>
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default RepResources;
