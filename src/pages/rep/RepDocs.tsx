import { useEffect, useState, useMemo } from 'react';
import { useRepNavigate } from '@/hooks/useRepNavigate';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useSalesRep } from '@/hooks/useSalesRep';
import { useAuth } from '@/hooks/useAuth';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Search, ExternalLink, Gift, BookOpen, Palette, ChevronRight } from 'lucide-react';
import { RepShell } from '@/components/rep/RepShell';
import { RepCard } from '@/components/rep/RepCard';
import { PitchScriptDialog } from '@/components/rep/PitchScriptDialog';

const CANVA_URL = 'https://canva.link/tapaway-temp';

const SETUP_STEPS = [
  { title: 'Scout & drop the card', body: 'Walk in casually with the branded envelope containing 5 sample cards and the printed demo hub QR. Ask for the owner, hand them the gift, drop the pitch script.' },
  { title: 'Send the demo hub link', body: 'While there, pull up their pre-built demo hub on your phone. Show the review flow — Google, Yelp, Instagram, menu — all in one tap. Text them the link before leaving.' },
  { title: 'Follow up in 24h', body: 'Text: "Any thoughts on the hub? Happy to activate at $20/mo, or $25/mo with the Card Club — or save $101 with the $199 annual pass. 5-day free trial included."' },
  { title: 'Activate & mark converted', body: 'Send them the Stripe checkout link. When they subscribe, mark the pipeline row as Paying Customer — you earn a $75 Annual Upsell Bounty if they choose annual, plus every conversion counts toward your monthly Closer\'s Pool ($250 at 10, $600 at 20, $1,200 at 35).' },
  { title: 'Upload the print PDF', body: 'Design their permanent card in Canva using the template, export as PDF, and attach it to the business row so ops can ship the physical cards.' },
];

const OBJECTIONS = [
  { q: 'We already ask for reviews.', a: 'TapAway removes the awkward ask entirely. Your staff just place the card down when a customer says something positive — guests tap it out of curiosity and leave reviews on their own. No scripts, no pressure.' },
  { q: 'My staff won\'t remember to use it.', a: 'They don\'t need to remember every table. Only after a positive moment. That single behavior converts 10x better than any script — and it\'s the only rule.' },
  { q: 'We already use QR codes.', a: 'Great — you\'re already thinking digitally. TapAway isn\'t competing with QR. NFC taps are instant, feel premium, and only activate after positive moments — which naturally protects your rating instead of exposing it to bad reviews from angry customers scanning a QR at the door.' },
  { q: 'Will this really move ranking?', a: 'Yes. Even 1 extra 5-star review per day compounds. Google surfaces businesses with fresh, consistent reviews above stale competitors — that\'s directly measurable in Maps ranking.' },
  { q: 'What if customers leave a bad review?', a: 'TapAway never filters, gates or screens reviews — that would violate Google\'s policies and FTC rules, and you must never coach a business to hide the card from unhappy guests or offer anything in exchange for a review. The card stays out for every customer equally. Honest feedback is the product: businesses that respond well to it rank better over time.' },
  { q: 'How much does it cost the restaurant?', a: '$20/mo for the software, or $25/mo with the Card Club add-on. Annual is $199/yr with Card Club included (saves $101). 5-day free trial. Cancel anytime. Physical cards, hub, AI review-reply coach, and analytics are all included.' },
];

const RepDocs = () => {
  const navigate = useRepNavigate();
  const { user, loading: authLoading } = useAuth();
  const { loading: repLoading, isSalesRep } = useSalesRep();
  const { isAdmin, loading: adminLoading } = useAdminAccess();
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!authLoading && !user) { navigate('/auth'); return; }
    if (!repLoading && !adminLoading && !isSalesRep) { navigate(isAdmin ? '/admin/reps' : '/'); return; }
  }, [authLoading, repLoading, adminLoading, user, isSalesRep, isAdmin, navigate]);

  const filteredObjections = useMemo(() => {
    if (!query.trim()) return OBJECTIONS;
    const q = query.toLowerCase();
    return OBJECTIONS.filter(o => o.q.toLowerCase().includes(q) || o.a.toLowerCase().includes(q));
  }, [query]);

  const filteredSteps = useMemo(() => {
    if (!query.trim()) return SETUP_STEPS;
    const q = query.toLowerCase();
    return SETUP_STEPS.filter(s => s.title.toLowerCase().includes(q) || s.body.toLowerCase().includes(q));
  }, [query]);

  if (authLoading || repLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0e1a]">
        <div className="animate-pulse text-white/40">Loading…</div>
      </div>
    );
  }

  return (
    <RepShell title="Docs & Training" subtitle="Scripts, objections, and the 5-minute hub playbook.">
      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search scripts, objections, setup steps…"
          className="w-full h-11 pl-10 pr-4 rounded-2xl border border-white/10 bg-white/[0.03] text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 focus:bg-white/[0.05]"
        />
      </div>

      {/* Resource Vault */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <a
          href={CANVA_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group"
        >
          <RepCard className="p-5 h-full hover:bg-white/[0.04] transition-colors">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-400/20 w-fit mb-3">
              <Palette className="h-5 w-5 text-purple-300" />
            </div>
            <p className="text-sm font-semibold text-white">Canva Template</p>
            <p className="text-xs text-white/50 mt-1">Design your business card PDFs — open the shared template.</p>
            <p className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-purple-300">
              Open in Canva <ExternalLink className="h-3 w-3" />
            </p>
          </RepCard>
        </a>

        <PitchScriptDialog
          trigger={
            <button className="text-left group">
              <RepCard className="p-5 h-full hover:bg-white/[0.04] transition-colors cursor-pointer">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-400/20 w-fit mb-3">
                  <Gift className="h-5 w-5 text-emerald-300" />
                </div>
                <p className="text-sm font-semibold text-white">The Local Gift Drop Script</p>
                <p className="text-xs text-white/50 mt-1">Copy-paste script for the walk-in gift-drop pitch.</p>
                <p className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-emerald-300">
                  Open & copy <ChevronRight className="h-3 w-3" />
                </p>
              </RepCard>
            </button>
          }
        />

        <a href="#setup-guide" className="group">
          <RepCard className="p-5 h-full hover:bg-white/[0.04] transition-colors">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-400/20 w-fit mb-3">
              <BookOpen className="h-5 w-5 text-blue-300" />
            </div>
            <p className="text-sm font-semibold text-white">5-Minute Hub Setup Guide</p>
            <p className="text-xs text-white/50 mt-1">Step-by-step walkthrough for pitching, activating & shipping.</p>
            <p className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-blue-300">
              Read guide <ChevronRight className="h-3 w-3" />
            </p>
          </RepCard>
        </a>
      </div>

      {/* Setup Guide accordion */}
      <div id="setup-guide" className="mb-8">
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-widest mb-3">The 5-Minute Playbook</h2>
        <RepCard className="px-2 py-1">
          <Accordion type="single" collapsible className="w-full">
            {filteredSteps.map((step, i) => (
              <AccordionItem key={i} value={`step-${i}`} className="border-white/5">
                <AccordionTrigger className="px-3 hover:no-underline text-white text-sm font-medium">
                  <span className="flex items-center gap-3">
                    <span className="text-emerald-300 font-mono text-xs">{String(i + 1).padStart(2, '0')}</span>
                    {step.title}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-3 text-white/60 text-sm leading-relaxed">
                  {step.body}
                </AccordionContent>
              </AccordionItem>
            ))}
            {filteredSteps.length === 0 && (
              <div className="px-3 py-6 text-center text-white/40 text-sm">No matches.</div>
            )}
          </Accordion>
        </RepCard>
      </div>

      {/* Objections */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-widest mb-3">Objections & FAQs</h2>
        <RepCard className="px-2 py-1">
          <Accordion type="single" collapsible className="w-full">
            {filteredObjections.map((o, i) => (
              <AccordionItem key={i} value={`obj-${i}`} className="border-white/5">
                <AccordionTrigger className="px-3 hover:no-underline text-white text-sm font-medium text-left">
                  {o.q}
                </AccordionTrigger>
                <AccordionContent className="px-3 text-white/60 text-sm leading-relaxed">
                  <span className="text-emerald-300 font-medium mr-1">→</span>{o.a}
                </AccordionContent>
              </AccordionItem>
            ))}
            {filteredObjections.length === 0 && (
              <div className="px-3 py-6 text-center text-white/40 text-sm">No matches.</div>
            )}
          </Accordion>
        </RepCard>
      </div>
    </RepShell>
  );
};

export default RepDocs;
