import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSalesRep } from '@/hooks/useSalesRep';
import { useAuth } from '@/hooks/useAuth';
import { Home, Users, Wallet, User, BookOpen, Sparkles, Target, MessageSquare, AlertCircle, CheckCircle2, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const RepDocs = () => {
  const navigate = useNavigate();
  const location = useLocation();
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  const navItems = [
    { icon: Home, label: 'Home', path: '/rep' },
    { icon: Users, label: 'Restaurants', path: '/rep/restaurants' },
    { icon: Wallet, label: 'Commissions', path: '/rep/commissions' },
    { icon: BookOpen, label: 'Docs', path: '/rep/docs' },
    { icon: User, label: 'Profile', path: '/rep/profile' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Mobile-first container */}
      <div className="mx-auto w-full max-w-md px-4 pb-24 sm:max-w-3xl">
        
        {/* Header */}
        <div className="flex flex-col items-center pt-6 pb-4">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-6 w-6 text-emerald-500" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Docs & Trust</h1>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
            Everything you need to know about selling TapAway
          </p>
        </div>

        {/* Desktop nav - hidden on mobile */}
        <nav className="hidden sm:flex gap-2 mb-6">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                location.pathname === item.path
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Section 1: How TapAway Works */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-700 shadow-sm mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-emerald-500" />
              How TapAway Actually Works
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
            <p className="font-medium text-slate-900 dark:text-white">
              TapAway is built around one core idea:
            </p>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              More 5-Star Reviews. Without the Awkward Ask.
            </p>
            <p>
              TapAway cards spark curiosity on their own — customers tap or scan naturally.
            </p>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 space-y-1">
              <p className="font-medium text-slate-900 dark:text-white mb-2">This means:</p>
              <p>✓ Staff do NOT need to ask for reviews</p>
              <p>✓ No awkward conversations</p>
              <p>✓ No pressure</p>
              <p>✓ The TapAway card does the heavy lifting</p>
            </div>
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
              <p className="font-medium text-slate-900 dark:text-white mb-3">The real flow that makes TapAway work:</p>
              <ol className="space-y-2 list-decimal list-inside">
                <li>Customer enjoys the food or service</li>
                <li>TapAway card is present at checkout, table, counter, or server handoff</li>
                <li>Customer taps or scans out of curiosity</li>
                <li>They land on the Review Hub (Google, Yelp, Instagram, Menu, etc.)</li>
                <li className="font-medium text-emerald-600 dark:text-emerald-400">Happy customers leave a 5-star review — without anyone asking</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Why Card Usage Is Critical */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-700 shadow-sm mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-amber-500" />
              Why Using the Cards Matters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
            <p className="font-medium text-slate-900 dark:text-white">
              TapAway only works when the cards are actually used.
            </p>
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3">
              <p className="font-medium text-amber-800 dark:text-amber-300 mb-2">
                Restaurants who consistently place the card at:
              </p>
              <ul className="space-y-1 text-amber-700 dark:text-amber-400">
                <li>• Every table</li>
                <li>• Every check presenter</li>
                <li>• Every pickup order</li>
                <li>• The counter or host stand</li>
              </ul>
              <p className="mt-2 font-medium text-amber-800 dark:text-amber-300">
                …see significant jumps in new reviews and follows.
              </p>
            </div>
            <div className="space-y-2">
              <p><strong>TapAway is NOT magic</strong> — it's a tool</p>
              <p>The card must be <strong>visible and reachable</strong></p>
              <p>Staff don't need to ask, they just need to <strong>place the card</strong></p>
            </div>
            <p className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3 font-medium">
              The more customers who see or tap the card → the more reviews, followers, and repeat traffic the restaurant gets.
            </p>
          </CardContent>
        </Card>

        {/* Section 3: Selling TapAway */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-700 shadow-sm mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              How to Sell TapAway (Simple Pitch)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
              <p className="font-medium text-blue-900 dark:text-blue-200 mb-2">Core pitch:</p>
              <p className="text-blue-800 dark:text-blue-300 italic">
                "TapAway helps your restaurant get more 5-star reviews, without ever having to ask customers. The card sparks curiosity, customers tap it, and they leave reviews naturally."
              </p>
            </div>
            <div className="space-y-2">
              <p className="font-medium text-slate-900 dark:text-white">Key points reps should hit:</p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>It works even if staff don't talk about it</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>Google reviews drive ranking → ranking drives customers</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>One extra 5-star review per day = huge long-term boost</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>It takes 60 seconds to set up</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>Easy for employees</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>Consistent usage = consistent results</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Handling Objections */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-700 shadow-sm mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Handling Objections
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {/* Objection 1 */}
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
              <p className="font-medium text-orange-700 dark:text-orange-400 mb-1">
                "We already ask for reviews."
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                <span className="font-medium text-emerald-600 dark:text-emerald-400">→ </span>
                TapAway gets reviews without asking — it's automatic and removes awkwardness.
              </p>
            </div>

            {/* Objection 2 - Staff forget */}
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
              <p className="font-medium text-orange-700 dark:text-orange-400 mb-1">
                "What if my staff forget to hand it out?"
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                <span className="font-medium text-emerald-600 dark:text-emerald-400">→ </span>
                No problem — TapAway doesn't rely on staff handing it to specific customers.
              </p>
              <p className="text-slate-600 dark:text-slate-400 mt-2">
                Just place the card in consistent, high-traffic locations. Customers tap it on their own, which keeps everything natural and compliant.
              </p>
            </div>

            {/* Objection 3 - QR codes (enhanced) */}
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
              <p className="font-medium text-orange-700 dark:text-orange-400 mb-2">
                "We already use QR codes."
              </p>
              <p className="text-slate-700 dark:text-slate-300 mb-3">
                <span className="font-medium text-emerald-600 dark:text-emerald-400">→ </span>
                Great — that means you're already ahead of the curve on digital customer engagement.
              </p>
              <p className="font-medium text-slate-900 dark:text-white mb-2">Here's how TapAway enhances what you're already doing:</p>
              <ul className="space-y-1 text-slate-600 dark:text-slate-400 mb-3">
                <li>• QR codes require effort (open camera → aim → hold still)</li>
                <li>• NFC tap is effortless and triggers instant curiosity</li>
                <li>• TapAway consolidates reviews, menus, and social links into one branded hub</li>
                <li>• Because TapAway is placed in consistent locations, it increases visibility without ever steering customers in any direction</li>
              </ul>
              <p className="text-xs text-slate-500 dark:text-slate-500 italic border-t border-slate-200 dark:border-slate-700 pt-2">
                TapAway does not replace or override your existing customer feedback process — it simply gives satisfied customers an easier, more modern path to engage.
              </p>
            </div>

            {/* Objection 4 - Ranking */}
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
              <p className="font-medium text-orange-700 dark:text-orange-400 mb-1">
                "Will this actually help ranking?"
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                <span className="font-medium text-emerald-600 dark:text-emerald-400">→ </span>
                Yes — consistent 5-star reviews make Google show the restaurant higher in search results.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Section 5: Best Practices (Legally Safe) */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-700 shadow-sm mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              Restaurant Best Practices
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-700 dark:text-slate-300 space-y-4">
            <ul className="space-y-2">
              {[
                "Place a card inside every check presenter",
                "Place one at the counter or POS",
                "Place one at the host stand",
                "Place one in the pickup / to-go area",
                "Replace lost or damaged cards immediately",
                "No staff scripts, no awkward asks — customers tap on their own",
                "TapAway does not influence or filter review sentiment",
                "Cards work because they create curiosity and convenience"
              ].map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-100 dark:border-blue-800">
              <p className="text-blue-800 dark:text-blue-300 text-xs">
                <strong>Important:</strong> TapAway is a customer-initiated tool. Staff do not select which guests see the card, and TapAway does not alter or guide review outcomes.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Section 6: How Customers Interact */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-700 shadow-sm mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-violet-500" />
              How Customers Interact with the Card
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-700 dark:text-slate-300 space-y-4">
            <p>
              TapAway works best when placed in <strong>high-visibility locations</strong> where satisfied customers naturally interact with it.
            </p>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 space-y-2">
              <p className="font-medium text-slate-900 dark:text-white">Key principles:</p>
              <ul className="space-y-1">
                <li>• <strong>Customer-initiated engagement</strong> — not selective distribution</li>
                <li>• TapAway does not direct, filter, or influence review sentiment</li>
                <li>• TapAway is a tool for <strong>visibility & convenience</strong> — not a replacement for genuine service quality</li>
              </ul>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 border border-emerald-100 dark:border-emerald-800">
              <p className="text-emerald-800 dark:text-emerald-300 text-xs">
                <strong>TapAway does not allow or encourage selective review gating.</strong> Our cards are designed for passive, customer-initiated interaction. Restaurants simply place the card in visible locations, and customers choose whether or not to engage.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Section 7: Trust & Credibility */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-700 shadow-sm mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-indigo-500" />
              Why Restaurants Trust TapAway
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-700 dark:text-slate-300">
            <ul className="space-y-2">
              {[
                "100% 5-star reviews from restaurants using TapAway",
                "Built around simplicity and real behavior — curiosity taps",
                "Zero awkward asks required",
                "Easy to set up and easy for staff",
                "Dashboard shows all taps and review activity",
                "AI tools help restaurants improve service and reply to reviews",
                "Trusted by restaurants that value reputation and growth"
              ].map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-indigo-500 font-bold">★</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Legal Disclaimer */}
        <div className="text-center px-4 py-6">
          <p className="text-[10px] text-slate-400 dark:text-slate-600 leading-relaxed">
            <strong>Disclaimer:</strong> TapAway does not filter, gate, or influence customer reviews. All interactions are customer-initiated, and review platforms control review posting and moderation. TapAway simply provides a convenient access point for customers who wish to engage.
          </p>
        </div>

      </div>

      {/* Bottom Navigation - Mobile only */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-2.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors ${
                  isActive ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default RepDocs;
