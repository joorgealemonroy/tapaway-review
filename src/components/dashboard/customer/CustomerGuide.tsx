import { useState } from 'react';
import { Sparkles, ArrowRight, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';

export const customerSections = [
  { id: 'overview', title: 'Your hub at a glance', text: 'Your card opens your hub. Start with your name, logo and one useful link, then share it.', match: /start|overview|getting started/ },
  { id: 'links', title: 'Choose what visitors can do', text: 'Add your website, menu, booking page or social links. Use short labels like “Book an appointment”. Preview before sharing.', match: /link|website|menu|instagram|social|booking|button/ },
  { id: 'design', title: 'Make it yours, effortlessly', text: 'Upload your full logo, add an optional cover and pick a soft background. We keep the layout and proportions tidy for you.', match: /logo|photo|image|design|color|background|appearance/ },
  { id: 'leads', title: 'Stay connected with visitors', text: 'See the contact details people choose to share through your hub. A saved contact is not automatically permission to send marketing texts.', match: /contact|lead|email|customer info/ },
  { id: 'sms', title: 'Send a message worth opening', text: 'Choose a ready-made draft, personalize it and review your audience before sending. Text only subscribers who have opted in.', match: /sms|text|campaign|message|draft/ },
  { id: 'analytics', title: 'See what people use', text: 'Check visits and link clicks to learn which actions work. Visits are not a count of unique people or physical card taps.', match: /stat|analytic|visit|click|traffic/ },
  { id: 'plan', title: 'Your plan, in one place', text: 'See your current subscription and billing options here. Your existing account pricing is shown in your plan details.', match: /plan|bill|invoice|cancel|subscription|price/ },
  { id: 'cards', title: 'Your cards connect the dots', text: 'Manage card requests and available benefits. Tap an NFC card near the phone’s NFC reader, or scan its QR code to open your hub.', match: /card|nfc|qr|print|replacement|shipping/ },
];
export function CustomerGuide({ activeTab, onNavigate, legacy = false }: { activeTab: string; onNavigate: (tab: string) => void; legacy?: boolean }) {
  const [open, setOpen] = useState(false), [question, setQuestion] = useState(''), [answer, setAnswer] = useState(''), [destination, setDestination] = useState(''), [busy, setBusy] = useState(false);
  const section = customerSections.find(s => s.id === activeTab) || customerSections[0];
  const navigate = (id: string) => { const mapped = legacy ? ({ links: 'settings', design: 'settings', plan: 'billing', cards: 'billing', leads: 'engagement', analytics: 'overview' } as Record<string, string>)[id] || id : id; onNavigate(mapped); setOpen(false); };
  async function ask() {
    if (!question.trim() || busy) return;
    const local = customerSections.find(s => s.match.test(question.toLowerCase()));
    if (local) { setAnswer(local.text); setDestination(local.id); return; }
    setBusy(true); setDestination(''); setAnswer('');
    try {
      let visitor = sessionStorage.getItem('tapaway-helper-visitor');
      if (!visitor) { visitor = crypto.randomUUID(); sessionStorage.setItem('tapaway-helper-visitor', visitor); }
      const { data, error } = await supabase.functions.invoke('storefront-support', { body: { mode: 'ai', visitor, message: question.slice(0, 1000), history: [] } });
      if (error || !data?.answer) throw new Error(data?.error || 'The AI helper is unavailable right now. Try a section below or contact our team.');
      setAnswer(data.answer);
    } catch (e) { setAnswer(e instanceof Error ? e.message : 'Please try again or contact our team.'); }
    finally { setBusy(false); }
  }
  return <>
    <section className="customer-guide rounded-2xl border border-emerald-900/10 bg-white p-4 sm:p-6 flex flex-col sm:flex-row gap-4 sm:items-center">
      <div className="flex-1"><p className="text-xs font-semibold tracking-wide text-emerald-800 mb-1">YOUR TAPAWAY WORKSPACE</p><h2 className="font-semibold text-lg text-slate-900">{section.title}</h2><p className="text-sm text-slate-600 mt-1 leading-relaxed max-w-2xl">{section.text}</p></div>
      <Button variant="outline" className="min-h-11 shrink-0" onClick={() => setOpen(true)}><Sparkles className="w-4 h-4 mr-2" />Ask TapAway</Button>
    </section>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90dvh] overflow-y-auto bg-white text-slate-900"><DialogHeader><DialogTitle>Your TapAway helper</DialogTitle><DialogDescription>Find a tool or ask how TapAway works. Navigation help is instant; other questions use AI, limited to five per day. I cannot view billing records or change your hub.</DialogDescription></DialogHeader>
      <form className="flex gap-2" onSubmit={e => { e.preventDefault(); void ask(); }}><Input aria-label="Ask TapAway" placeholder="How do I add my logo?" maxLength={1000} value={question} onChange={e => setQuestion(e.target.value)} /><Button type="submit" disabled={busy || !question.trim()} aria-label="Ask question">{busy ? <Loader2 className="w-4 animate-spin" /> : <Send className="w-4" />}</Button></form>
      {answer && <div role="status" className="rounded-xl bg-emerald-50 p-4 text-sm leading-relaxed whitespace-pre-wrap">{answer}{destination && <Button className="mt-3 w-full" onClick={() => navigate(destination)}>Take me there <ArrowRight className="ml-2 w-4" /></Button>}</div>}
      <div className="grid grid-cols-2 gap-2">{customerSections.map(s => <Button key={s.id} variant="outline" className="min-h-11 text-left justify-start whitespace-normal" onClick={() => navigate(s.id)}>{s.id === 'sms' ? 'Text customers' : s.id === 'leads' ? 'Customer info' : s.id.charAt(0).toUpperCase() + s.id.slice(1)}</Button>)}</div>
      <a href="mailto:tap@tapaway.co" className="text-sm text-emerald-800 underline py-2">Prefer a person? Email tap@tapaway.co</a>
    </DialogContent></Dialog>
  </>;
}
