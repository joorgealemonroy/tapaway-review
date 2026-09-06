import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PRICING } from "@/lib/constants";
import {
  Loader2,
  Check,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  MapPin,
  Star,
  QrCode,
  BarChart3,
  LayoutDashboard,
  RefreshCw,
  Sparkles,
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
  cards: string;
}[] = [
  {
    id: "base",
    title: PRICING.base.label,
    price: PRICING.base.display,
    interval: PRICING.base.interval,
    blurb: PRICING.base.blurb,
    cards: "Your printed cards included",
  },
  {
    id: "bundle",
    title: PRICING.bundle.label,
    price: PRICING.bundle.display,
    interval: PRICING.bundle.interval,
    blurb: `${PRICING.base.blurb} Plus ${PRICING.cardClub.blurb.toLowerCase()}`,
    badge: "Most popular",
    cards: "Fresh cards shipped every quarter",
  },
  {
    id: "annual",
    title: PRICING.annual.label,
    price: PRICING.annual.display,
    interval: PRICING.annual.interval,
    blurb: PRICING.annual.blurb,
    badge: "Best value",
    cards: "Your printed cards included",
  },
];

const BENEFITS: { icon: React.ReactNode; title: string; body: string }[] = [
  {
    icon: <Sparkles className="h-4 w-4" />,
    title: "Everything in one place",
    body: "Menu, socials, directions and contact details on a single page customers actually use.",
  },
  {
    icon: <Star className="h-4 w-4" />,
    title: "More Google reviews",
    body: "One tap takes a happy customer straight to your review page.",
  },
  {
    icon: <QrCode className="h-4 w-4" />,
    title: "Tap and scan cards",
    body: "Physical NFC and QR cards on your counter — no app for customers to download.",
  },
  {
    icon: <BarChart3 className="h-4 w-4" />,
    title: "See what's working",
    body: "Taps, review clicks and link activity tracked for you.",
  },
  {
    icon: <LayoutDashboard className="h-4 w-4" />,
    title: "Your own dashboard",
    body: "Change anything yourself in a couple of taps, any time.",
  },
  {
    icon: <RefreshCw className="h-4 w-4" />,
    title: "Update without reprinting",
    body: "Change a link and every card you already own updates instantly.",
  },
];

interface PreparedItem {
  label: string;
  done: boolean;
}

export default function ClaimHubPage() {
  const [params] = useSearchParams();
  const token = params.get("t");
  const success = params.get("success") === "true";
  const sessionId = params.get("session_id");

  const [summary, setSummary] = useState<ClaimSummary | null>(null);
  const [prepared, setPrepared] = useState<PreparedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<PlanChoice>("bundle");
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(success);
  const [buyerEmail, setBuyerEmail] = useState<string | null>(null);

  // The hub id travels inside the signed token; the signature (not the id)
  // is what authorises checkout on the backend.
  const hubId = useMemo(() => {
    if (!token) return null;
    try {
      const payload = token.split(".")[0].replace(/-/g, "+").replace(/_/g, "/");
      const json = JSON.parse(atob(payload + "===".slice((payload.length + 3) % 4))) as {
        h?: string;
        exp?: number;
      };
      if (!json.h) return null;
      return json.h;
    } catch {
      return null;
    }
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!hubId) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.rpc("get_claim_summary" as never, {
        _id: hubId,
        _slug: null,
      } as never);
      if (cancelled) return;
      if (error) console.error("[claim] summary error", error);
      const rows = (data ?? []) as unknown as ClaimSummary[];
      const row = Array.isArray(rows) ? rows[0] ?? null : null;
      setSummary(row ?? null);

      if (row) {
        const { data: links } = await supabase
          .from("personal_links")
          .select("link_type, label, url")
          .eq("profile_id", row.id)
          .eq("is_active", true);
        if (cancelled) return;
        const list = links ?? [];
        const has = (needles: string[]) =>
          list.some((l) =>
            needles.some((n) =>
              `${l.link_type ?? ""} ${l.label ?? ""} ${l.url ?? ""}`.toLowerCase().includes(n),
            ),
          );
        setPrepared([
          { label: "Your TapAway hub is built and live", done: true },
          { label: "Branding and photos added", done: !!(row.profile_photo_url || row.header_image_url) },
          { label: "Your important links connected", done: list.length > 0 },
          { label: "Google review link connected", done: has(["google_review", "google.com/", "review"]) },
          { label: "Social profiles connected", done: has(["instagram", "facebook", "tiktok", "yelp"]) },
          { label: "Menu or website connected", done: has(["menu", "website", "order"]) },
          { label: "Directions set up", done: has(["directions", "maps"]) },
          { label: "Your NFC and QR cards prepared", done: true },
          { label: "Owner dashboard prepared", done: true },
        ]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [hubId]);

  // Read-only status check after returning from Stripe. Activation happens in
  // the signed webhook, never here.
  useEffect(() => {
    if (!success || !sessionId) {
      setChecking(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.functions.invoke("verify-claim-checkout", {
          body: { sessionId },
        });
        if (!cancelled) setBuyerEmail((data as { email?: string | null })?.email ?? null);
      } catch (err) {
        console.error("[claim] status error", err);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [success, sessionId]);

  const hubUrl = summary?.username ? `https://tapaway.co/${summary.username}` : null;

  const handleCheckout = async () => {
    if (!token) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-claim-checkout", {
        body: { token, plan },
      });
      if (error) throw error;
      const url = (data as { url?: string })?.url;
      if (!url) throw new Error((data as { error?: string })?.error || "Checkout could not be started");
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
          <h1 className="text-2xl font-bold text-white">This link has expired</h1>
          <p className="text-white/60 text-sm">
            Ask your TapAway rep for a fresh link, or email{" "}
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
          <meta name="description" content="Your TapAway account is now active." />
          <meta name="robots" content="noindex" />
        </Helmet>
        <div className="max-w-lg mx-auto space-y-6 text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
            {checking ? (
              <Loader2 className="h-7 w-7 animate-spin text-emerald-400" />
            ) : (
              <Check className="h-7 w-7 text-emerald-400" />
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold">Welcome to TapAway!</h1>
          <p className="text-white/70 text-sm leading-relaxed">
            Your {summary.display_name ?? "business"} account is now active. We sent your dashboard
            access link and payment confirmation to {buyerEmail ?? "your email"}. Everything we
            prepared for your business is ready to use.
          </p>

          <div className="grid gap-3 pt-2">
            {hubUrl && (
              <Button asChild className="w-full h-12 text-base font-semibold">
                <a href={hubUrl} target="_blank" rel="noopener noreferrer">
                  View my TapAway hub <ExternalLink className="h-4 w-4 ml-2" />
                </a>
              </Button>
            )}
            <Button asChild variant="outline" className="w-full h-12 border-white/15 text-white">
              <Link to="/">Done</Link>
            </Button>
          </div>
          <p className="text-[11px] text-white/40">
            No need to open your dashboard now — the access email works whenever you're ready.
          </p>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------- presentation
  const selected = PLAN_OPTIONS.find((p) => p.id === plan);

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white px-5 py-10">
      <Helmet>
        <title>{`Your TapAway setup is ready | ${summary.display_name ?? "TapAway"}`}</title>
        <meta name="description" content="Your TapAway hub is built and ready to activate." />
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="max-w-lg mx-auto space-y-10">
        {/* 1 — personalized intro */}
        <section className="text-center space-y-4">
          {summary.profile_photo_url && (
            <img
              src={summary.profile_photo_url}
              alt={`${summary.display_name ?? "Business"} logo`}
              className="h-20 w-20 rounded-2xl object-cover mx-auto ring-1 ring-white/10"
            />
          )}
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary/80 font-semibold">
              Your TapAway setup is ready
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold mt-2">{summary.display_name}</h1>
            <p className="text-white/60 text-sm mt-2 leading-relaxed">
              Everything has already been built for {summary.display_name}. Choose your plan below
              to activate your account.
            </p>
          </div>
          {hubUrl && (
            <Button asChild variant="outline" className="border-white/15 text-white">
              <a href={hubUrl} target="_blank" rel="noopener noreferrer">
                Preview your hub <ExternalLink className="h-4 w-4 ml-2" />
              </a>
            </Button>
          )}
        </section>

        {/* 2 — what TapAway does */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-white/80">What TapAway does for you</h2>
          <div className="grid gap-3">
            {BENEFITS.map((b) => (
              <div
                key={b.title}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex gap-3"
              >
                <div className="h-8 w-8 shrink-0 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                  {b.icon}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm">{b.title}</p>
                  <p className="text-xs text-white/50 mt-1 leading-relaxed">{b.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3 — already prepared */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-white/80">
            Already prepared for {summary.display_name}
          </h2>
          <Card className="border-white/10 bg-white/[0.03] p-4 space-y-2.5">
            {prepared
              .filter((p) => p.done)
              .map((p) => (
                <div key={p.label} className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                  <span className="text-sm text-white/75">{p.label}</span>
                </div>
              ))}
            <div className="flex items-start gap-2.5 pt-1">
              <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <span className="text-sm text-white/50">
                Done-for-you setup — nothing for you to build.
              </span>
            </div>
          </Card>
        </section>

        {/* 4 — choose a plan */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-white/80">Choose your plan</h2>
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{opt.title}</span>
                      {opt.badge && (
                        <span className="text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                          {opt.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/50 mt-1">{opt.blurb}</p>
                    <p className="text-[11px] text-white/40 mt-1">{opt.cards}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold">{opt.price}</div>
                    <div className="text-[11px] text-white/40">{opt.interval}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </section>

        {/* 5 — checkout */}
        <section>
          <Card className="border-white/10 bg-white/[0.03] p-4 space-y-3">
            <p className="text-xs text-white/50">
              No account or password needed. Stripe collects the best email for your receipt and
              TapAway dashboard access.
            </p>
            <Button
              onClick={handleCheckout}
              disabled={submitting}
              className="w-full h-14 text-base font-semibold"
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <ShieldCheck className="h-5 w-5 mr-2" />
              )}
              Activate — {selected?.price}
              {selected?.interval}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <p className="text-[11px] text-center text-white/40">
              Apple Pay &amp; Google Pay supported · Cancel anytime · Questions?{" "}
              <a href="mailto:tap@tapaway.co" className="underline">
                tap@tapaway.co
              </a>
            </p>
          </Card>
        </section>
      </div>
    </div>
  );
}
