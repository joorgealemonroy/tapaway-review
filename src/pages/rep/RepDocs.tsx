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
            {[
              {
                objection: "We already ask for reviews.",
                response: "TapAway gets reviews without asking — it's automatic and removes awkwardness."
              },
              {
                objection: "My staff won't remember to use it.",
                response: "That's fine — just place it at the counter, host stand, or inside every check presenter."
              },
              {
                objection: "What if customers had a bad experience?",
                response: "They usually won't tap the card. Only customers who are curious or satisfied interact with it."
              },
              {
                objection: "We already have QR codes.",
                response: "NFC tap triggers curiosity and gets dramatically more engagement than static QR codes."
              },
              {
                objection: "Will this actually help ranking?",
                response: "Yes — consistent 5-star reviews make Google show the restaurant higher in search results."
              }
            ].map((item, index) => (
              <div key={index} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                <p className="font-medium text-orange-700 dark:text-orange-400 mb-1">
                  "{item.objection}"
                </p>
                <p className="text-slate-700 dark:text-slate-300">
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">→ </span>
                  {item.response}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Section 5: Best Practices */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-700 shadow-sm mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              Restaurant Best Practices
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-700 dark:text-slate-300">
            <ul className="space-y-2">
              {[
                "Place the card on every check presenter",
                "For counter-service → put it right next to the POS",
                "Keep one at the host stand",
                "Add one to the pickup order area",
                "Replace lost/damaged cards immediately",
                "Staff do NOT need to ask customers for reviews",
                "Cards naturally get taps — the design does the work"
              ].map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Section 6: Trust & Credibility */}
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
