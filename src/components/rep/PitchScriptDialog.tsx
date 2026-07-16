import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Copy, Check, Gift } from 'lucide-react';
import { toast } from 'sonner';

const SCRIPT = `Hey! I'm dropping off a small gift for the owner — a free demo of TapAway.

We help local spots get more 5-star Google reviews without ever asking customers. Your staff just place this card down after a happy moment, guests tap it out of curiosity, and reviews come in on their own.

I've already built you a custom review hub — no signup needed to try it. Take a look and if it's a fit, we can activate for $10–$39/mo. If not, keep the cards, no strings.

Tap here to see your hub: {{hub_url}}

— {{rep_name}}`;

export const PitchScriptDialog = ({ trigger }: { trigger: React.ReactNode }) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(SCRIPT);
    setCopied(true);
    toast.success('Script copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="bg-[#0a0e1a] border-white/10 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Gift className="h-5 w-5 text-emerald-400" />
            The Local Gift Drop Script
          </DialogTitle>
        </DialogHeader>
        <div className="text-xs text-white/50 mb-2">
          Replace <code className="text-emerald-300">{'{{hub_url}}'}</code> and{' '}
          <code className="text-emerald-300">{'{{rep_name}}'}</code> before sending.
        </div>
        <pre className="text-sm text-white/80 bg-white/[0.03] border border-white/5 rounded-xl p-4 whitespace-pre-wrap font-sans leading-relaxed max-h-[50vh] overflow-auto">
          {SCRIPT}
        </pre>
        <button
          onClick={copy}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#0a0e1a] font-semibold py-2.5 transition-colors"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copied!' : 'Copy Script to Clipboard'}
        </button>
      </DialogContent>
    </Dialog>
  );
};

export default PitchScriptDialog;
