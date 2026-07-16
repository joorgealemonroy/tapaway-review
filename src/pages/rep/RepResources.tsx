import { useEffect, useState } from 'react';
import { useRepNavigate } from '@/hooks/useRepNavigate';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSalesRep } from '@/hooks/useSalesRep';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Palette, Gift, PlayCircle, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const CANVA_URL = 'https://canva.link/tapaway-temp';

const GIFT_DROP_SCRIPT = `Hey [Owner Name] — I've got a little gift for you.

I noticed [Restaurant Name] has some incredible reviews already, and I built you a free custom review hub to help you get even more. It's live right now — I'll leave the demo card on the counter so you can see exactly how it works.

Here's how it works in 3 taps:
1. Customer taps the card on their phone (no app needed)
2. Your custom hub opens instantly — logo, photos, menu
3. One tap sends them straight to your Google review page

I'm not here to pitch you anything today. Just wanted to drop this off, let you play with it, and if you love it we can talk later this week about keeping it live permanently for less than the price of one lost customer.

Cool? Enjoy the free week. I'll swing back Friday.`;

const DEMO_HUB_GUIDE = [
  {
    step: 'Step 1 — Scout the venue (30 seconds)',
    body: 'Walk in. Check for review cards on tables. Look up their Google rating. If they have < 100 reviews, they are a perfect target.',
  },
  {
    step: 'Step 2 — Build the demo hub (2 minutes)',
    body: 'Tap "New Demo Hub". Enter the business name + owner phone. Grab their logo + 2 photos from their Instagram. Paste their Google Review URL. Save.',
  },
  {
    step: 'Step 3 — Print the card (1 minute)',
    body: 'Upload the print-ready PDF (from the Canva template). It attaches to the hub. Print at any office supply store.',
  },
  {
    step: 'Step 4 — Drop the gift (1 minute)',
    body: 'Walk in with the card + the Gift Drop script. Leave the card. Do not pitch. Let the product speak for itself for 5 days.',
  },
  {
    step: 'Step 5 — Follow up (1 minute)',
    body: 'The system SMS-reminds you at 48h. Swing back Friday. Ask "did you love it?" — if yes, walk them through the paywall. That is your commission.',
  },
];

const RepResources = () => {
  const navigate = useRepNavigate();
  const { user, loading: authLoading } = useAuth();
  const { loading: repLoading, isSalesRep } = useSalesRep();
  const { isAdmin, loading: adminLoading } = useAdminAccess();
  const [scriptOpen, setScriptOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) { navigate('/auth'); return; }
    if (!repLoading && !adminLoading && !isSalesRep) { navigate(isAdmin ? '/admin/reps' : '/'); return; }
  }, [authLoading, repLoading, adminLoading, user, isSalesRep, isAdmin, navigate]);

  if (authLoading || repLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const copyScript = async () => {
    await navigator.clipboard.writeText(GIFT_DROP_SCRIPT);
    toast.success('Script copied to clipboard');
  };

  const tiles = [
    {
      icon: Palette,
      title: 'Canva Design Studio',
      desc: 'Open the branded print-ready card template. Customize colors, logo, and QR placement.',
      action: (
        <Button asChild className="w-full">
          <a href={CANVA_URL} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" /> Open Canva Template
          </a>
        </Button>
      ),
    },
    {
      icon: Gift,
      title: 'Local Gift Drop Script',
      desc: 'The exact high-converting drop script. No pitch, just leave a gift.',
      action: (
        <Button className="w-full" onClick={() => setScriptOpen(true)}>
          <Copy className="mr-2 h-4 w-4" /> Open Script
        </Button>
      ),
    },
    {
      icon: PlayCircle,
      title: '5-Minute Demo Hub Guide',
      desc: 'The exact 5-step process from scouting to closing a restaurant.',
      action: (
        <Button className="w-full" onClick={() => setGuideOpen(true)}>
          <PlayCircle className="mr-2 h-4 w-4" /> Open Walkthrough
        </Button>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/rep')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">Resource Vault</h1>
              <p className="text-sm text-muted-foreground">Everything you need to close a restaurant this week</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tiles.map(({ icon: Icon, title, desc, action }) => (
            <div key={title} className="rounded-2xl border bg-card p-5 flex flex-col gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
              {action}
            </div>
          ))}
        </div>
      </main>

      <Dialog open={scriptOpen} onOpenChange={setScriptOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Local Gift Drop Script</DialogTitle>
            <DialogDescription>Copy this verbatim. Do not pitch. Let the product speak.</DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-muted/50 p-4 text-sm whitespace-pre-wrap font-mono max-h-[50vh] overflow-y-auto">
            {GIFT_DROP_SCRIPT}
          </div>
          <div className="flex justify-end">
            <Button onClick={copyScript}>
              <Copy className="mr-2 h-4 w-4" /> Copy Script
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>5-Minute Demo Hub Guide</DialogTitle>
            <DialogDescription>The exact play from cold walk-in to closed deal.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {DEMO_HUB_GUIDE.map((s, i) => (
              <div key={i} className="rounded-lg border p-4 bg-muted/30">
                <p className="font-semibold text-foreground text-sm">{s.step}</p>
                <p className="text-sm text-muted-foreground mt-1">{s.body}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RepResources;
