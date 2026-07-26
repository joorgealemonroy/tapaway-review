import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, Briefcase, DollarSign, Repeat, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { RepCard } from '@/components/rep/RepCard';

const Shell = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-[#0a0e1a] text-white/90 relative">
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 opacity-[0.35]"
      style={{
        background:
          'radial-gradient(ellipse 60% 40% at 20% 0%, rgba(16,185,129,0.10), transparent 60%), radial-gradient(ellipse 50% 40% at 90% 10%, rgba(59,130,246,0.08), transparent 60%)',
      }}
    />
    <div className="relative mx-auto w-full max-w-3xl px-4 py-10 sm:py-16">
      <div className="mb-8">
        <p className="text-[10px] font-semibold tracking-[0.24em] text-white/40 uppercase">
          Sales Partner Portal
        </p>
      </div>
      {children}
    </div>
  </div>
);

const RepApply = () => {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Name and email are required');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.from('rep_applications').insert({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || null,
        message: form.message.trim() || null,
        status: 'pending',
      });

      if (error) {
        if (error.code === '23505') {
          toast.error('An application with this email already exists');
        } else {
          throw error;
        }
        return;
      }

      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting application:', error);
      toast.error('Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

    return (
      <Shell>
        <RepCard className="p-8 sm:p-10 text-center max-w-lg mx-auto">
          <div className="flex justify-center mb-5">
            <div className="h-14 w-14 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <CheckCircle className="h-7 w-7 text-emerald-400" />
            </div>
          </div>
          <h2 className="text-2xl font-semibold text-white tracking-tight">Application received</h2>
          <p className="text-sm text-white/60 mt-2 leading-relaxed">
            Thanks for applying to the TapAway Sales Partner program. We'll review your application
            and get back to you within 24–48 hours.
          </p>
          <Button
            onClick={() => navigate('/')}
            className="mt-6 bg-white text-[#0a0e1a] hover:bg-white/90"
          >
            Return home
          </Button>
        </RepCard>
      </Shell>
    );
  }

  const perks = [
    { icon: DollarSign, title: 'Shift base pay', body: 'Earn a guaranteed base for every field shift you complete.' },
    { icon: Briefcase, title: 'Per-demo bonus', body: 'Bonus paid for every approved demo hub you build in the field.' },
    { icon: Repeat, title: 'Recurring stream', body: 'Keep earning monthly as businesses you sign stay on TapAway.' },
  ];

  return (
    <Shell>
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-semibold text-white tracking-tight">
          Become a TapAway Sales Partner
        </h1>
        <p className="text-white/60 mt-2 max-w-xl">
          A field-first 1099 program built for closers. Base pay for shifts, bonuses per approved
          demo, and a recurring stream on every business that sticks.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 mb-8">
        {perks.map((p) => {
          const Icon = p.icon;
          return (
            <RepCard key={p.title} className="p-4">
              <div className="h-8 w-8 rounded-lg bg-white/[0.04] border border-white/5 flex items-center justify-center mb-3">
                <Icon className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="text-sm font-medium text-white">{p.title}</p>
              <p className="text-xs text-white/50 mt-1 leading-relaxed">{p.body}</p>
            </RepCard>
          );
        })}
      </div>

      <RepCard className="p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="name" className="text-white/70 text-xs font-medium tracking-wide uppercase">
              Full name
            </Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Your full name"
              maxLength={100}
              required
              className="mt-1.5 bg-white/[0.03] border-white/10 text-white placeholder:text-white/30 focus-visible:ring-white/20"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="email" className="text-white/70 text-xs font-medium tracking-wide uppercase">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="you@example.com"
                maxLength={255}
                required
                className="mt-1.5 bg-white/[0.03] border-white/10 text-white placeholder:text-white/30 focus-visible:ring-white/20"
              />
            </div>

            <div>
              <Label htmlFor="phone" className="text-white/70 text-xs font-medium tracking-wide uppercase">
                Phone
              </Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="(555) 555-5555"
                maxLength={20}
                className="mt-1.5 bg-white/[0.03] border-white/10 text-white placeholder:text-white/30 focus-visible:ring-white/20"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="message" className="text-white/70 text-xs font-medium tracking-wide uppercase">
              Why you'd be a great fit
            </Label>
            <Textarea
              id="message"
              value={form.message}
              onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
              placeholder="Relevant experience, cities you'd cover, why sales is your thing…"
              maxLength={1000}
              rows={4}
              className="mt-1.5 bg-white/[0.03] border-white/10 text-white placeholder:text-white/30 focus-visible:ring-white/20"
            />
          </div>

          <div className="pt-1 space-y-3">
            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-white text-[#0a0e1a] hover:bg-white/90 font-semibold h-11"
            >
              {submitting ? 'Submitting…' : (
                <>
                  Submit application
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </>
              )}
            </Button>
            <p className="text-[11px] text-center text-white/40">
              1099 independent contractor role. You are responsible for your own taxes.
            </p>
          </div>
        </form>
      </RepCard>
    </Shell>
  );
};

export default RepApply;
