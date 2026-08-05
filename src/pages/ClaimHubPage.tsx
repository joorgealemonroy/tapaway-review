import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PRICING } from "@/lib/constants";
import {
  Loader2,
  Zap,
  Star,
  Smartphone,
  Check,
  ShieldCheck,
  CreditCard,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

interface ClaimSummary {
  id: string;
  username: string | null;
  display_name: string | null;
  profile_photo_url: string | null;
  header_image_url: string | null;
  contact_name: string | null;
  email: string | null;
  trial_ends_at: string | null;
  subscription_status: string | null;
  plan_type: string | null;
  has_card_addon: boolean;
  taps: number;
  review_clicks: number;
  vip_numbers: number;
}

type PlanChoice = "base" | "bundle" | "annual";

const PLAN_OPTIONS: {
  id: PlanChoice;
  title: string;
  price: string;
  interval: string;
  blurb: string;
  badge?: string;
}[] = [
  {
    id: "base",
    title: PRICING.base.label,
    price: PRICING.base.display,
    interval: PRICING.base.interval,
    blurb: PRICING.base.blurb,
  },
  {
    id: "bundle",
    title: PRICING.bundle.label,
    price: PRICING.bundle.display,
    interval: PRICING.bundle.interval,
    blurb: `${PRICING.base.blurb} Plus ${PRICING.cardClub.blurb.toLowerCase()}`,
    badge: "Most popular",
  },
  {
    id: "annual",
    title: PRICING.annual.label,
    price: PRICING.annual.display,
    interval: PRICING.annual.interval,
    blurb: PRICING.annual.blurb,
    badge: "Save 25%",
  },
];

export default function ClaimHubPage() {
  const [params] = useSearchParams();
  const id = params.get("id");
  const slug = params.get("slug");
  const success = params.get("success") === "true";
  const sessionId = params.get("session_id");

  const [summary, setSummary] = useState<ClaimSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<PlanChoice>("bundle");
  const [submitting, setSubmitting] = useState(false);
  const [activating, setActivating] = useState(success);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id && !slug) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.rpc("get_claim_summary" as never, {
        _id: id,
        _slug: slug,
      } as never);
      if (cancelled) return;
      if (error) {
        console.error("[claim] summary error", error);
      }
      const rows = (data ?? []) as unknown as ClaimSummary[];
      const row = Array.isArray(rows) ? rows[0] ?? null : null;
      setSummary(row ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, slug]);

  // Activate after a successful Stripe return.
  useEffect(() => {
    if (!success || !sessionId) {
      setActivating(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await supabase.functions.invoke("verify-claim-checkout", { body: { sessionId } });
        try {
          localStorage.setItem("tapaway_just_claimed", "1");
        } catch {
          /* ignore */
        }
      } catch (err) {
        console.error("[claim] activation error", err);
      } finally {
        if (!cancelled) setActivating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [success, sessionId]);

  const ownerName = useMemo(() => {
    const raw = summary?.contact_name || summary?.display_name || "";
    return raw.split(" ")[0] || "there";
  }, [summary]);

  const handleClaim = async () => {
    if (!summary) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-claim-checkout", {
        body: { profileId: summary.id, plan },
      });
      if (error) throw error;
      const url = (data as { url?: string })?.url;
      if (!url) throw new Error("Checkout could not be started");
      window.location.href = url;
    } catch (err) {
      console.error("[claim] checkout error", err);
      toast.error("Could not start checkout. Please try again or email tap@tapaway.co");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center px-6 text-center">
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-white">Hub not found</h1>
          <p className="text-white/60 text-sm">
            Double-check your link, or email{" "}
            <a href="mailto:tap@tapaway.co" className="text-primary underline">
              tap@tapaway.co
            </a>
            .
          </p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- success
  if (success) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] text-white px-5 py-12">
        <Helmet>
          <title>Welcome to TapAway | Account Active</title>
          <meta name="description" content="Your TapAway account is fully active." />
        </Helmet>
        <div className="max-w-lg mx-auto space-y-6">
          <div className="text-center space-y-3">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
              {activating ? (
                <Loader2 className="h-7 w-7 animate-spin text-emerald-400" />
              ) : (
                <Check className="h-7 w-7 text-emerald-400" />
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              Welcome to TapAway! Your account is fully active.
            </h1>
            <p className="text-white/60 text-sm">
              Your countertop stand is permanently unlocked and your customer insights are ready below.
            </p>
          </div>

          <div className="grid gap-3">
            <ActionCard
              to="/dashboard?tab=sms"
              icon={<Smartphone className="h-5 w-5 text-primary" />}
              title="View VIP Subscribers"
              subtitle={`${summary.vip_numbers} customer numbers captured`}
            />
            <ActionCard
              to="/dashboard"
              icon={<Sparkles className="h-5 w-5 text-primary" />}
              title="Customize Hub Links"
              subtitle="Add offers, menus, socials and booking links"
            />
            <ActionCard
              to={`/dashboard?tab=cards`}
              icon={<CreditCard className="h-5 w-5 text-primary" />}
              title="Download QR Backup"
              subtitle="Printable QR for your countertop stand"
            />
          </div>

          <Button asChild className="w-full h-12 text-base font-semibold">
            <Link to="/dashboard">
              Go to my dashboard <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------ claim
  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white px-5 py-10">
      <Helmet>
        <title>{`Claim your TapAway hub | ${summary.display_name ?? "TapAway"}`}</title>
        <meta
          name="description"
          content="Keep your TapAway hub, countertop card and customer insights active — $20/month."
        />
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="max-w-lg mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          {summary.profile_photo_url && (
            <img
              src={summary.profile_photo_url}
              alt={`${summary.display_name ?? "Business"} logo`}
              className="h-20 w-20 rounded-2xl object-cover mx-auto ring-1 ring-white/10"
            />
          )}
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary/80 font-semibold">
              Your trial results
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold mt-1">{summary.display_name}</h1>
            <p className="text-white/50 text-sm mt-1">
              Hey {ownerName} — here's what your card did while it sat on the counter.
            </p>
          </div>
        </div>

        {/* Proof of value */}
        <div className="grid grid-cols-3 gap-3">
          <Metric icon={<Zap className="h-4 w-4" />} value={summary.taps} label="Countertop taps" />
          <Metric icon={<Star className="h-4 w-4" />} value={summary.review_clicks} label="Google review clicks" />
          <Metric
            icon={<Smartphone className="h-4 w-4" />}
            value={summary.vip_numbers}
            label="VIP numbers captured"
          />
        </div>

        {/* Plan picker */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-white/80">Choose your plan</p>
          {PLAN_OPTIONS.map((opt) => {
            const active = plan === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setPlan(opt.id)}
                className={`w-full text-left rounded-2xl border p-4 transition-all active:scale-[0.99] ${
                  active
                    ? "border-primary bg-primary/10 ring-1 ring-primary/40"
                    : "border-white/10 bg-white/[0.03] hover:border-white/20"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{opt.title}</span>
                      {opt.badge && (
                        <span className="text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                          {opt.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/50 mt-1">{opt.blurb}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold">{opt.price}</div>
                    <div className="text-[11px] text-white/40">{opt.interval}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Checkout */}
        <Card className="border-white/10 bg-white/[0.03] p-4 space-y-3">
          <p className="text-xs text-white/50">
            No forms to fill in — we already have {summary.display_name}'s details
            {summary.email ? ` and will bill ${summary.email}` : ""}.
          </p>
          <Button
            onClick={handleClaim}
            disabled={submitting}
            className="w-full h-14 text-base font-semibold"
          >
            {submitting ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : (
              <ShieldCheck className="h-5 w-5 mr-2" />
            )}
            Claim my hub — {PLAN_OPTIONS.find((p) => p.id === plan)?.price}
            {PLAN_OPTIONS.find((p) => p.id === plan)?.interval}
          </Button>
          <p className="text-[11px] text-center text-white/40">
            Apple Pay & Google Pay supported · Cancel anytime · Questions?{" "}
            <a href="mailto:tap@tapaway.co" className="underline">
              tap@tapaway.co
            </a>
          </p>
        </Card>
      </div>
    </div>
  );
}

function Metric({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-center">
      <div className="flex justify-center text-primary mb-1">{icon}</div>
      <div className="text-xl font-bold">{value.toLocaleString()}</div>
      <div className="text-[10px] leading-tight text-white/45 mt-0.5">{label}</div>
    </div>
  );
}

function ActionCard({
  to,
  icon,
  title,
  subtitle,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 hover:border-white/20 transition-colors active:scale-[0.99]"
    >
      <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-xs text-white/45">{subtitle}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-white/30 ml-auto" />
    </Link>
  );
}
