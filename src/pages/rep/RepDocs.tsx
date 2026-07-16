import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useRepNavigate } from '@/hooks/useRepNavigate';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useSalesRep } from '@/hooks/useSalesRep';
import { useAuth } from '@/hooks/useAuth';
import { 
  Home, Users, Wallet, User, BookOpen, Sparkles, Target, MessageSquare, 
  AlertCircle, CheckCircle2, Shield, Mic, TrendingUp, Star, Smartphone, 
  Clock, Brain, ClipboardList, ChevronRight, ArrowRight, Zap, Info, Package
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const RepDocs = () => {
  const navigate = useRepNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { loading: repLoading, isSalesRep } = useSalesRep();
  const { isAdmin, loading: adminLoading } = useAdminAccess();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }

    if (!repLoading && !adminLoading && !isSalesRep) {
      navigate(isAdmin ? '/admin/reps' : '/');
      return;
    }
  }, [authLoading, repLoading, adminLoading, user, isSalesRep, isAdmin, navigate]);

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
              TapAway is built on one simple idea:
            </p>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              More 5-Star Reviews. Without the Awkward Ask.
            </p>
            <p>
              TapAway cards spark curiosity — customers tap or scan naturally.
              Your team doesn't need scripts, pressure, or awkward conversations.
            </p>
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
              <p className="font-medium text-slate-900 dark:text-white mb-3">The real flow:</p>
              <ol className="space-y-2 list-decimal list-inside">
                <li>Customer enjoys the food or service</li>
                <li>They naturally say something positive ("This was great," "We love this place," etc.)</li>
                <li>Staff hands them the TapAway card or places it nearby</li>
                <li>Customer taps or scans because they're already in a positive mindset</li>
                <li>They land on the Review Hub (Google, Yelp, Instagram, Menu, etc.)</li>
                <li className="font-medium text-emerald-600 dark:text-emerald-400">Happy customers choose to leave 5-star reviews on their own</li>
              </ol>
            </div>
            <p className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 font-medium text-emerald-800 dark:text-emerald-300">
              This is why TapAway works — it's natural, not forced.
            </p>
          </CardContent>
        </Card>

        {/* Section 2: Why Card Usage Matters */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-700 shadow-sm mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-amber-500" />
              Why Using the Cards Matters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
            <p className="font-medium text-slate-900 dark:text-white">
              TapAway only works when the cards are actually used —
              but NOT by giving them to every table.
            </p>
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3">
              <p className="font-medium text-amber-800 dark:text-amber-300 mb-2">
                Instead, TapAway works best when used intentionally:
              </p>
              <ul className="space-y-1 text-amber-700 dark:text-amber-400">
                <li>✔ When a customer compliments the food</li>
                <li>✔ When they say they love the restaurant</li>
                <li>✔ When they praise the service or ambiance</li>
                <li>✔ When the team already knows the guest is happy</li>
              </ul>
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              These natural positive moments create curiosity, and the customer taps the card on their own — no asking required.
            </p>
            <div className="space-y-2 bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
              <p><strong>TapAway is NOT magic</strong> — it's a tool.</p>
              <p>It boosts visibility & reviews only when used with intention:</p>
              <p className="font-medium text-slate-900 dark:text-white">
                Good moment → Card present → Customer taps → Customer chooses to leave a review
              </p>
            </div>
            <ul className="space-y-1 text-slate-600 dark:text-slate-400">
              <li>• No scripts</li>
              <li>• No pressure</li>
              <li>• No selective filtering of negative customers (all customers still see the card in natural environments)</li>
            </ul>
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
                "TapAway helps your restaurant get more 5-star reviews — without ever having to ask customers. When guests say good things, your staff simply place the card down, and customers tap it naturally."
              </p>
            </div>
            <div className="space-y-2">
              <p className="font-medium text-slate-900 dark:text-white">Reps should hit:</p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>Staff don't need to ask for reviews</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>Google reviews push ranking → ranking brings new customers</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>1 extra 5-star review daily = huge long-term boost</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>Takes 60 seconds to set up</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>Works in any type of restaurant</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>Consistent use = consistent growth</span>
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
                "We already ask customers for reviews."
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                <span className="font-medium text-emerald-600 dark:text-emerald-400">→ </span>
                TapAway removes awkward asks completely.
                When customers say something nice, placing the card nearby is all that's needed — they tap out of curiosity.
              </p>
            </div>

            {/* Objection 2 - Staff forget */}
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
              <p className="font-medium text-orange-700 dark:text-orange-400 mb-1">
                "My staff won't remember to use it."
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                <span className="font-medium text-emerald-600 dark:text-emerald-400">→ </span>
                You don't need them to use it every time.
                They only need to use it when customers already say positive things.
                That's the moment TapAway converts the best.
              </p>
            </div>

            {/* Objection 3 - QR codes (enhanced) */}
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
              <p className="font-medium text-orange-700 dark:text-orange-400 mb-2">
                "We already use QR codes."
              </p>
              <p className="text-slate-700 dark:text-slate-300 mb-3">
                <span className="font-medium text-emerald-600 dark:text-emerald-400">→ </span>
                Great — you're already thinking digitally. TapAway enhances what you're doing:
              </p>
              <ul className="space-y-1 text-slate-600 dark:text-slate-400 mb-3">
                <li>• QR codes require effort (camera → aim → line up)</li>
                <li>• NFC taps instantly trigger curiosity</li>
                <li>• Customers tap without being asked</li>
                <li>• TapAway organizes Google, Yelp, Instagram, and menu into one branded hub</li>
              </ul>
              <p className="font-medium text-slate-900 dark:text-white mb-2">Most importantly: TapAway avoids encouraging negative reviews</p>
              <ul className="space-y-1 text-slate-600 dark:text-slate-400 mb-3">
                <li>• QR codes placed everywhere make it easier for upset customers to leave bad reviews</li>
                <li>• TapAway activates only in positive moments, which naturally builds reputation</li>
              </ul>
              <p className="text-slate-700 dark:text-slate-300 font-medium">
                TapAway doesn't replace QR codes — it makes your reputation strategy smarter.
              </p>
            </div>

            {/* Objection 4 - Ranking */}
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
              <p className="font-medium text-orange-700 dark:text-orange-400 mb-1">
                "Will this really help ranking?"
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                <span className="font-medium text-emerald-600 dark:text-emerald-400">→ </span>
                Yes. More consistent 5-star reviews = stronger Google visibility = more customers.
              </p>
            </div>
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
          <CardContent className="text-sm text-slate-700 dark:text-slate-300 space-y-4">
            <ul className="space-y-2">
              {[
                "Use TapAway only when customers show they're happy",
                "Place the card during or right after a positive comment",
                "Keep a card at the server station or host stand for quick access",
                "Replace lost/damaged cards immediately",
                "No scripts, no pressure — keep it natural",
                "TapAway never filters or directs customer sentiment"
              ].map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Section 6: How Customers Interact */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-700 shadow-sm mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-violet-500" />
              How Customers Interact with TapAway
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-700 dark:text-slate-300 space-y-4">
            <p className="font-medium text-slate-900 dark:text-white">
              TapAway is customer-initiated. Staff do not need to steer anyone.
            </p>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 space-y-2">
              <ul className="space-y-1">
                <li>• Customers tap out of curiosity</li>
                <li>• Positive customers convert at the highest rate</li>
                <li>• The card doesn't change or influence opinions</li>
                <li>• Customer chooses their own review platform</li>
                <li>• Review posting is fully controlled by Google/Yelp</li>
              </ul>
            </div>
            <p className="bg-violet-50 dark:bg-violet-900/20 rounded-lg p-3 text-violet-800 dark:text-violet-300">
              TapAway is simply a modern doorway — customers choose whether to walk through it.
            </p>
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
                "Built around natural customer behavior",
                "No awkward requests",
                "Staff-friendly and low effort",
                "Dashboard shows every tap and engagement",
                "AI helps with review replies and service improvement",
                "Trusted by restaurants focused on growth"
              ].map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-indigo-500">⭐</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Section 8: Sales Scripts That Actually Work */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-700 shadow-sm mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mic className="h-5 w-5 text-rose-500" />
              Sales Scripts That Actually Work
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-700 dark:text-slate-300">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="mini-pitch" className="border-slate-200 dark:border-slate-700">
                <AccordionTrigger className="text-left font-medium text-slate-900 dark:text-white hover:no-underline">
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-rose-500" />
                    Mini Pitch (15 seconds)
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-slate-600 dark:text-slate-400">
                  <div className="bg-rose-50 dark:bg-rose-900/20 rounded-lg p-3 italic">
                    "TapAway helps restaurants get more 5-star reviews without ever asking customers. The card sparks curiosity, customers tap it, and happy guests leave reviews naturally."
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="full-pitch" className="border-slate-200 dark:border-slate-700">
                <AccordionTrigger className="text-left font-medium text-slate-900 dark:text-white hover:no-underline">
                  <span className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-rose-500" />
                    Full Pitch (30–45 seconds)
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-slate-600 dark:text-slate-400">
                  <div className="bg-rose-50 dark:bg-rose-900/20 rounded-lg p-3 italic">
                    "Every great review boosts ranking, which brings in more customers. The TapAway card sits at checkout or gets handed to customers after a positive moment. They tap it, land on the restaurant's review hub, and leave 5-star reviews on their own. No scripts, no awkward asks, no pressure on staff."
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="handoff" className="border-slate-200 dark:border-slate-700">
                <AccordionTrigger className="text-left font-medium text-slate-900 dark:text-white hover:no-underline">
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-rose-500" />
                    When handing the card after a positive moment
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-slate-600 dark:text-slate-400">
                  <div className="bg-rose-50 dark:bg-rose-900/20 rounded-lg p-3 italic">
                    "Perfect! Let me show you something you're going to love — it's a TapAway card. Customers tap it out of curiosity and leave reviews naturally. No asking, no awkward moments."
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="closing" className="border-slate-200 dark:border-slate-700">
                <AccordionTrigger className="text-left font-medium text-slate-900 dark:text-white hover:no-underline">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-rose-500" />
                    Closing a sale
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-slate-600 dark:text-slate-400">
                  <div className="bg-rose-50 dark:bg-rose-900/20 rounded-lg p-3 italic">
                    "TapAway works because customers initiate the tap — not staff. If you place the card where customers finish their experience and hand it out after positive moments, you'll consistently get new reviews without pushing your team."
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Section 9: Objections & High-Confidence Responses */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-700 shadow-sm mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Objections & High-Confidence Responses
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-700 dark:text-slate-300">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="staff-forget" className="border-slate-200 dark:border-slate-700">
                <AccordionTrigger className="text-left font-medium text-orange-700 dark:text-orange-400 hover:no-underline">
                  "My staff won't remember to use it."
                </AccordionTrigger>
                <AccordionContent className="text-slate-600 dark:text-slate-400">
                  <p className="mb-2">
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">→ </span>
                    Good news — TapAway doesn't rely on scripts or remembering lines. Staff only need to hand the card after a positive moment or keep one at checkout. Customers engage with it naturally because the design sparks curiosity.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="qr-codes" className="border-slate-200 dark:border-slate-700">
                <AccordionTrigger className="text-left font-medium text-orange-700 dark:text-orange-400 hover:no-underline">
                  "We already use QR codes."
                </AccordionTrigger>
                <AccordionContent className="text-slate-600 dark:text-slate-400 space-y-3">
                  <p>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">→ </span>
                    Love that. You're already ahead of most restaurants. TapAway isn't competing with QR — it's enhancing it.
                  </p>
                  <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <Smartphone className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                      <span>QR requires effort (open camera → aim → hold still)</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Zap className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span>NFC tap = instant curiosity → higher interaction</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Star className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <span>TapAway looks premium → gets more attention</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <span>QR codes everywhere can make it easy for upset customers to leave negative reviews</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span>TapAway avoids that because customers only interact after a genuinely positive moment</span>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="ranking" className="border-slate-200 dark:border-slate-700">
                <AccordionTrigger className="text-left font-medium text-orange-700 dark:text-orange-400 hover:no-underline">
                  "Does this actually help ranking?"
                </AccordionTrigger>
                <AccordionContent className="text-slate-600 dark:text-slate-400">
                  <p>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">→ </span>
                    Yes — Google ranks restaurants with consistent 5-star reviews higher. Even 1 extra review per day can massively shift search visibility over time.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="bother-tapping" className="border-slate-200 dark:border-slate-700">
                <AccordionTrigger className="text-left font-medium text-orange-700 dark:text-orange-400 hover:no-underline">
                  "Will customers bother tapping it?"
                </AccordionTrigger>
                <AccordionContent className="text-slate-600 dark:text-slate-400">
                  <p>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">→ </span>
                    They do — because it feels modern. NFC is the same tech people use for Apple Pay. Curiosity drives the action, not staff.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="bad-review" className="border-slate-200 dark:border-slate-700">
                <AccordionTrigger className="text-left font-medium text-orange-700 dark:text-orange-400 hover:no-underline">
                  "What if customers leave a bad review?"
                </AccordionTrigger>
                <AccordionContent className="text-slate-600 dark:text-slate-400">
                  <p>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">→ </span>
                    TapAway doesn't filter or block anything — but because the card is used after positive experiences, restaurants naturally get more 5-star reviews without steering sentiment. It stays fully compliant.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Section 10: Visuals & Sales-Boosting Graphics */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-700 shadow-sm mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-cyan-500" />
              Visuals & Sales-Boosting Graphics
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-700 dark:text-slate-300 space-y-6">
            {/* Benefits Icon Grid */}
            <div>
              <p className="font-medium text-slate-900 dark:text-white mb-3">Key Benefits</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: TrendingUp, title: "More 5-Star Reviews", desc: "Consistent positive moments + curiosity taps = more reviews", color: "text-emerald-500" },
                  { icon: Star, title: "Higher Google Ranking", desc: "Each additional 5-star review boosts visibility", color: "text-amber-500" },
                  { icon: Smartphone, title: "No Awkward Asking", desc: "Customers tap on their own — staff don't need scripts", color: "text-blue-500" },
                  { icon: Clock, title: "60-Second Setup", desc: "Card placement + onboarding is instant", color: "text-violet-500" },
                  { icon: Brain, title: "AI Coach Included", desc: "Helps restaurants improve based on real feedback", color: "text-rose-500" },
                  { icon: ClipboardList, title: "Easy for Staff", desc: "Requires no special training or remembering lines", color: "text-cyan-500" },
                ].map((item, index) => (
                  <div key={index} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                    <item.icon className={`h-5 w-5 ${item.color} mb-2`} />
                    <p className="font-medium text-slate-900 dark:text-white text-xs">{item.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* QR vs NFC Comparison */}
            <div>
              <p className="font-medium text-slate-900 dark:text-white mb-3">Why TapAway Outperforms QR Codes</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-3">
                  <p className="font-bold text-slate-500 dark:text-slate-400 text-xs mb-2">QR Codes</p>
                  <ul className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <li>• Requires effort</li>
                    <li>• Easy for anyone to scan (including unhappy customers)</li>
                    <li>• Often ignored when printed everywhere</li>
                    <li>• Low curiosity factor</li>
                  </ul>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 border border-emerald-200 dark:border-emerald-800">
                  <p className="font-bold text-emerald-600 dark:text-emerald-400 text-xs mb-2">TapAway NFC</p>
                  <ul className="space-y-1.5 text-xs text-emerald-700 dark:text-emerald-300">
                    <li>• One tap → instant action</li>
                    <li>• Only used after positive moments</li>
                    <li>• Looks premium</li>
                    <li>• Curiosity + modern feel → more reviews</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Workflow Diagram */}
            <div>
              <p className="font-medium text-slate-900 dark:text-white mb-3">TapAway Workflow</p>
              <div className="flex flex-col sm:flex-row items-stretch gap-2">
                {[
                  { step: "1", label: "Customer enjoys the experience" },
                  { step: "2", label: "Staff hands TapAway card after a positive comment" },
                  { step: "3", label: "Customer taps out of curiosity" },
                  { step: "4", label: "Leaves a 5-star review naturally" },
                ].map((item, index, arr) => (
                  <div key={index} className="flex-1 flex items-center gap-2">
                    <div className="flex-1 bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-900/10 rounded-xl p-3 text-center">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-bold mb-1">
                        {item.step}
                      </span>
                      <p className="text-xs text-slate-700 dark:text-slate-300">{item.label}</p>
                    </div>
                    {index < arr.length - 1 && (
                      <ChevronRight className="hidden sm:block h-4 w-4 text-slate-400 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Rep Instructions Footer */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
              <div className="flex items-start gap-2 mb-2">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="font-medium text-blue-900 dark:text-blue-200 text-xs">How Reps Should Use These Tools</p>
              </div>
              <p className="text-xs text-blue-700 dark:text-blue-300 mb-2 italic">For internal reps only:</p>
              <ul className="space-y-1 text-xs text-blue-700 dark:text-blue-300">
                <li>• These scripts reduce friction</li>
                <li>• The goal is to show how simple TapAway is</li>
                <li>• Use positive-moment framing</li>
                <li>• Never imply gating or steering reviews</li>
                <li>• Your role is to build trust, not push</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Section: Starter Kits */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-700 shadow-sm mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="h-5 w-5 text-purple-500" />
              Starter Kits & Demo Cards
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-700 dark:text-slate-300 space-y-4">
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
              <p className="font-medium text-purple-900 dark:text-purple-200 mb-3">For Restaurants:</p>
              <ul className="space-y-2 text-purple-800 dark:text-purple-300">
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 font-bold">•</span>
                  <span>Every new restaurant receives <strong>15 TapAway cards</strong> in their starter package.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 font-bold">•</span>
                  <span>They may request up to <strong>10 replacement cards each month</strong> at no cost.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 font-bold">•</span>
                  <span>If a restaurant ever needs more, TapAway can provide them — but Sales Partners should <strong>never suggest or upsell additional card quantities</strong>.</span>
                </li>
              </ul>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
              <p className="font-medium text-slate-900 dark:text-white mb-2">For Sales Partners:</p>
              <p className="text-slate-600 dark:text-slate-400">
                Sales Partners receive <strong>8 demo cards</strong> to show owners how TapAway works. 
                Request yours inside the <span className="font-medium text-purple-600 dark:text-purple-400">Sales Partner Portal → Profile</span>.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Compliance Note / Disclaimer */}
        <div className="text-center text-xs text-slate-400 dark:text-slate-500 mt-6 mb-4 px-4">
          <p className="font-medium mb-1">Compliance Note:</p>
          <p>
            TapAway does not filter, gate, or influence reviews.
            Cards are used in natural, positive moments, and customers choose to engage on their own.
            Review platforms fully control moderation and posting.
          </p>
        </div>

      </div>

      {/* Bottom mobile nav */}
      <nav className="fixed inset-x-0 bottom-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 sm:hidden">
        <div className="flex justify-around py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-1 px-3 py-1 ${
                  isActive
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default RepDocs;
