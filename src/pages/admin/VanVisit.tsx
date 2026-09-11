// VanVisit — Jorge's on-the-spot van sales page (/admin/van).
//
// Mobile-first, one-thumb flow for closing a business in person:
//   1. Find-or-create the business (personal_profiles demo row)
//   2. Print   — records print_status='printed' via admin_set_print_status
//               (the physical print happens on the van printer)
//   3. Activate — claims a physical NFC card to the hub via admin_activate_card
//   4. Payment  — NO-TRIAL checkout session (immediate charge, sub starts
//               'active'); owner pays on THEIR phone via QR/link; this page
//               polls verify-personal-checkout until it succeeds.
//   5. Close   — pipeline -> 'converted'; optional rep commission.
//
// Admin-only (useAdminGuard). All privileged writes go through
// SECURITY DEFINER RPCs or existing admin RLS policies.
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import QRCode from "react-qr-code";
import { useAuth } from "@/hooks/useAuth";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getTrybeVisitorId } from "@/lib/trybePixel";
import {
  ArrowLeft,
  ArrowRight,
  Search,
  Printer,
  Nfc,
  CreditCard,
  CheckCircle2,
  Loader2,
  Plus,
  Copy,
  ExternalLink,
  UserPlus,
} from "lucide-react";

type Step = "find" | "print" | "activate" | "payment" | "close" | "done";

interface Business {
  id: string;
  username: string;
  full_name: string;
  business_phone: string | null;
  formatted_address: string | null;
  pipeline_status: string;
  print_status: string | null;
}

interface SalesRep {
  id: string;
  name: string;
}

const STEP_LABELS: Record<Step, string> = {
  find: "Find business",
  print: "Print card",
  activate: "Activate card",
  payment: "Collect payment",
  close: "Close sale",
  done: "Done",
};

const STEP_ORDER: Step[] = ["find", "print", "activate", "payment", "close", "done"];

const PLANS = [
  { id: "solo", label: "Solo", price: "$20/mo" },
  { id: "venue", label: "Venue", price: "$39/mo" },
];

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 24) || "business"
  );
}

export default function VanVisit() {
  const { loading: guardLoading } = useAdminGuard();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("find");
  const [business, setBusiness] = useState<Business | null>(null);

  // Step 1 — find / create
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Business[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [creating, setCreating] = useState(false);

  // Rep attribution (optional — Diego only earns $5/demo if selected here
  // AND the sale closes; Jorge closing alone = no rep payout).
  const [reps, setReps] = useState<SalesRep[]>([]);
  const [repId, setRepId] = useState<string>("");

  // Step 2 — print
  const [printing, setPrinting] = useState(false);

  // Step 3 — activate
  const [cardCode, setCardCode] = useState("");
  const [activating, setActivating] = useState(false);

  // Step 4 — payment
  const [plan, setPlan] = useState("solo");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [sessionUrl, setSessionUrl] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [creatingSession, setCreatingSession] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Step 5 — close
  const [closing, setClosing] = useState(false);
  const [savingLead, setSavingLead] = useState(false);

  // Van handoff — password-setup link sent after payment (SMS to the owner
  // mobile on file, else email to the receipt address). Queried here so
  // Jorge's screen only ever shows "sent" + channel, never the link itself.
  const [handoff, setHandoff] = useState<{ sent_at: string | null; channel: string | null } | null>(null);
  const [resendingHandoff, setResendingHandoff] = useState(false);

  // Load the handoff status once the sale is closed.
  useEffect(() => {
    if (step !== "done" || !business) return;
    (async () => {
      const { data } = await supabase
        .from("personal_profiles")
        .select("van_handoff_sent_at, van_handoff_channel")
        .eq("id", business.id)
        .maybeSingle();
      if (data) {
        setHandoff({
          sent_at: (data.van_handoff_sent_at as string | null) ?? null,
          channel: (data.van_handoff_channel as string | null) ?? null,
        });
      }
    })();
  }, [step, business]);

  // Manual resend (admin-gated, exactly the same function verify-personal-checkout
  // calls automatically — useful if the owner lost the text or the link expired).
  const resendHandoff = async () => {
    if (!business) return;
    setResendingHandoff(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-van-handoff", {
        body: { profile_id: business.id, resend: true },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Send failed");
      setHandoff({ sent_at: new Date().toISOString(), channel: (data.channel as string | undefined) ?? null });
      toast.success(`Setup link resent via ${data.channel === "email" ? "email" : "SMS"}`);
    } catch (e) {
      toast.error("Resend failed: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setResendingHandoff(false);
    }
  };

  // Load active reps for the optional attribution select.
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("sales_reps")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (data) setReps(data as SalesRep[]);
    })();
  }, []);

  // ── Step 1: search ──────────────────────────────────────────────
  const runSearch = useCallback(async () => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    // The .or() filter is comma/parenthesis-delimited: strip those so a
    // business name with a comma can't break the query syntax.
    const like = `%${q.replace(/[,()]/g, "")}%`;
    const { data, error } = await supabase
      .from("personal_profiles")
      .select("id, username, full_name, business_phone, formatted_address, pipeline_status, print_status")
      .or(`full_name.ilike.${like},business_phone.ilike.${like},username.ilike.${like}`)
      .order("created_at", { ascending: false })
      .limit(10);
    setSearching(false);
    if (error) {
      toast.error("Search failed: " + error.message);
      return;
    }
    setResults((data ?? []) as Business[]);
  }, [query]);

  const pickBusiness = (b: Business) => {
    setBusiness(b);
    setShowCreate(false);
    setStep("print");
  };

  // ── Step 1: quick-create ────────────────────────────────────────
  const createBusiness = async (asLead = false) => {
    const name = newName.trim();
    if (!name) {
      toast.error("Business name is required");
      return;
    }
    if (!user?.id) {
      toast.error("Not signed in");
      return;
    }
    setCreating(true);
    try {
      // Unique username: slug + 4 random chars; retry on collision.
      let username = "";
      for (let i = 0; i < 5; i++) {
        const candidate = `${slugify(name)}_${Math.random().toString(36).slice(2, 6)}`;
        const { data: clash } = await supabase
          .from("personal_profiles")
          .select("id")
          .eq("username", candidate)
          .maybeSingle();
        if (!clash) {
          username = candidate;
          break;
        }
      }
      if (!username) throw new Error("Could not generate a unique username");

      const { data, error } = await supabase
        .from("personal_profiles")
        .insert({
          user_id: user.id,
          username,
          full_name: name,
          email: `${username}@demo.tapaway.local`,
          business_phone: newPhone.trim() || null,
          formatted_address: newAddress.trim() || null,
          contact_address: newAddress.trim() || null,
          plan_type: "solo_pro",
          subscription_status: null,
          is_approved: true, // Jorge-created: no review needed
          pipeline_status: "draft",
          source: "van_visit",
          sales_rep_id: repId || null,
          created_by_rep_id: repId || null,
          header_type: "banner",
          show_username: true,
        } as never)
        .select("id, username, full_name, business_phone, formatted_address, pipeline_status, print_status")
        .single();
      if (error) throw error;

      const b = data as Business;
      if (asLead) {
        toast.success(`${name} saved as a lead — find it in the fulfillment queue`);
        resetFlow();
      } else {
        setBusiness(b);
        setShowCreate(false);
        setStep("print");
        toast.success(`${name} created — print the card`);
      }
    } catch (e) {
      toast.error("Create failed: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setCreating(false);
    }
  };

  // ── Step 2: record print ────────────────────────────────────────
  const markPrinted = async () => {
    if (!business) return;
    setPrinting(true);
    const { error } = await supabase.rpc("admin_set_print_status", {
      _profile_id: business.id,
      _status: "printed",
      _notes: "Van visit — printed on van printer",
    });
    setPrinting(false);
    if (error) {
      toast.error("Print record failed: " + error.message);
      return;
    }
    setBusiness({ ...business, print_status: "printed" });
    setStep("activate");
    toast.success("Marked printed — now activate the card");
  };

  // ── Step 3: activate card ───────────────────────────────────────
  const activateCard = async () => {
    if (!business) return;
    const code = cardCode.trim().toUpperCase();
    if (!code) {
      toast.error("Enter the card's public code (or scan it)");
      return;
    }
    setActivating(true);
    const { data, error } = await supabase.rpc("admin_activate_card", {
      _profile_id: business.id,
      _card_public_code: code,
    });
    setActivating(false);
    if (error) {
      toast.error("Activation failed: " + error.message);
      return;
    }
    const res = data as { public_code?: string; username?: string } | null;
    setBusiness({ ...business, pipeline_status: "activated" });
    setStep("payment");
    toast.success(`Card ${res?.public_code ?? code} is live → /${res?.username ?? business.username}`);
  };

  // ── Step 4: create NO-TRIAL checkout session ────────────────────
  const createPaymentSession = async () => {
    if (!business || !user?.id) return;
    const email = ownerEmail.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      toast.error("Enter the owner's email for the receipt");
      return;
    }
    setCreatingSession(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: {
          email,
          userId: user.id,
          restaurantId: "",
          planType: plan,
          noTrial: true, // charges immediately; subscription starts 'active'
          personalProfileId: business.id,
          successPath: `/van-success?profile=${business.id}&name=${encodeURIComponent(business.full_name)}`,
          trybeVisitorId: getTrybeVisitorId(),
        },
      });
      if (error) throw error;
      if (!data?.url || !data?.sessionId) throw new Error("No checkout URL returned");
      setSessionUrl(data.url as string);
      setSessionId(data.sessionId as string);
      toast.success("Payment link ready — have the owner scan it");
    } catch (e) {
      toast.error("Checkout failed: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setCreatingSession(false);
    }
  };

  // ── Step 4: poll verify-personal-checkout until the owner pays ───
  useEffect(() => {
    if (!sessionId || paymentConfirmed) return;
    const poll = async () => {
      const { data, error } = await supabase.functions.invoke("verify-personal-checkout", {
        body: { sessionId },
      });
      if (!error && data) {
        // Payment complete — verify-personal-checkout has provisioned the
        // profile (subscription_status='active', stripe ids set, no trial).
        if (pollTimer.current) clearInterval(pollTimer.current);
        setPaymentConfirmed(true);
        toast.success("Payment confirmed — close the sale");
      }
      // else: still unpaid (400 "Payment not completed") — keep polling.
    };
    poll();
    pollTimer.current = setInterval(poll, 4000);
    const stopAfter = setTimeout(() => {
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
        toast.info("Stopped checking — tap “Check again” if they just paid");
      }
    }, 10 * 60 * 1000);
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
      clearTimeout(stopAfter);
    };
  }, [sessionId, paymentConfirmed]);

  const recheckPayment = async () => {
    if (!sessionId) return;
    setPaymentConfirmed(false);
    const { data, error } = await supabase.functions.invoke("verify-personal-checkout", {
      body: { sessionId },
    });
    if (!error && data) {
      setPaymentConfirmed(true);
      toast.success("Payment confirmed — close the sale");
    } else {
      toast.info("Not paid yet");
    }
  };

  // ── Step 5: mark converted + optional rep commission ────────────
  const closeSale = async () => {
    if (!business) return;
    setClosing(true);
    try {
      const { error } = await supabase
        .from("personal_profiles")
        .update({ pipeline_status: "converted", is_approved: true } as never)
        .eq("id", business.id);
      if (error) throw error;

      if (repId) {
        // Same $5 demo-bonus path used when a demo is approved.
        const { error: commErr } = await supabase.functions.invoke("award-demo-commission", {
          body: { personal_profile_id: business.id },
        });
        if (commErr) {
          toast.warning("Sale closed, but the rep commission needs a manual check: " + commErr.message);
        } else {
          toast.success("Rep commission awarded");
        }
      }
      setStep("done");
    } catch (e) {
      toast.error("Close failed: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setClosing(false);
    }
  };

  // ── Escape hatch: save as lead ──────────────────────────────────
  const saveAsLead = async () => {
    if (business) {
      // Existing row: drop to draft + tag source.
      setSavingLead(true);
      const { error } = await supabase
        .from("personal_profiles")
        .update({ pipeline_status: "draft", source: "van_visit" } as never)
        .eq("id", business.id);
      setSavingLead(false);
      if (error) {
        toast.error("Save failed: " + error.message);
        return;
      }
      toast.success("Saved as lead — it’s in the fulfillment “needs review” queue");
      resetFlow();
    } else {
      // No row yet: quick-create as a draft lead.
      await createBusiness(true);
    }
  };

  const resetFlow = () => {
    setBusiness(null);
    setStep("find");
    setQuery("");
    setResults([]);
    setShowCreate(false);
    setNewName("");
    setNewPhone("");
    setNewAddress("");
    setCardCode("");
    setOwnerEmail("");
    setSessionUrl(null);
    setSessionId(null);
    setPaymentConfirmed(false);
    setHandoff(null);
  };

  const copyLink = async () => {
    if (!sessionUrl) return;
    try {
      await navigator.clipboard.writeText(sessionUrl);
      toast.success("Link copied — text it to the owner");
    } catch {
      toast.error("Copy failed — long-press the link instead");
    }
  };

  // Step back one screen without losing the business in progress
  // (e.g. typed the wrong card code). Recorded state is never undone.
  const goBack = () => {
    const idx = STEP_ORDER.indexOf(step);
    if (idx > 0) setStep(STEP_ORDER[idx - 1]);
  };

  const BackButton = () => (
    <Button variant="ghost" className="w-full h-12 text-base" onClick={goBack}>
      <ArrowLeft className="h-5 w-5 mr-2" /> Back
    </Button>
  );

  if (guardLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const stepIndex = STEP_ORDER.indexOf(step);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} aria-label="Back to admin">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold leading-tight">Van Visit</h1>
            <p className="text-xs text-muted-foreground">
              Step {Math.min(stepIndex + 1, 5)} of 5 · {STEP_LABELS[step]}
            </p>
          </div>
        </div>
        {/* Step dots */}
        <div className="flex gap-1.5 mt-3">
          {STEP_ORDER.slice(0, 5).map((s, i) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full ${i <= stepIndex ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>
        {business && (
          <p className="text-sm font-medium mt-2 truncate">{business.full_name}</p>
        )}
      </div>

      <div className="px-4 pt-4 space-y-4 max-w-lg mx-auto">
        {/* ── STEP 1: FIND / CREATE ─────────────────────────────── */}
        {step === "find" && !showCreate && (
          <>
            <div className="space-y-3">
              <label className="text-sm font-semibold">Find the business</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && runSearch()}
                    placeholder="Name or phone…"
                    className="pl-10 h-14 text-base"
                    autoFocus
                  />
                </div>
                <Button onClick={runSearch} className="h-14 px-5" disabled={searching}>
                  {searching ? <Loader2 className="h-5 w-5 animate-spin" /> : "Go"}
                </Button>
              </div>

              {results.length > 0 && (
                <div className="space-y-2">
                  {results.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => pickBusiness(r)}
                      className="w-full text-left border rounded-xl p-4 active:bg-muted flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{r.full_name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {r.business_phone ?? r.formatted_address ?? `@${r.username}`}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                          {r.pipeline_status.replace(/_/g, " ")}
                          {r.print_status ? ` · print: ${r.print_status}` : ""}
                        </p>
                      </div>
                      <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}

              {query.trim().length >= 2 && !searching && (
                <Button
                  variant="outline"
                  className="w-full h-14 text-base"
                  onClick={() => {
                    setNewName(query.trim());
                    setShowCreate(true);
                  }}
                >
                  <Plus className="h-5 w-5 mr-2" /> New business: “{query.trim()}”
                </Button>
              )}
            </div>

            {/* Rep attribution — optional */}
            <div className="space-y-2 pt-2">
              <label className="text-sm font-semibold">Who’s selling? <span className="font-normal text-muted-foreground">(optional)</span></label>
              <select
                value={repId}
                onChange={(e) => setRepId(e.target.value)}
                className="w-full h-14 rounded-xl border bg-background px-3 text-base"
              >
                <option value="">Just me (Jorge) — no rep payout</option>
                {reps.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} — earns $5 on close
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Rep only gets the $5 demo bonus if you pick them AND the sale closes.
              </p>
            </div>
          </>
        )}

        {/* ── STEP 1b: QUICK CREATE ─────────────────────────────── */}
        {step === "find" && showCreate && (
          <div className="space-y-3">
            <label className="text-sm font-semibold">New business</label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Business name *"
              className="h-14 text-base"
            />
            <Input
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="Owner mobile — gets the setup text"
              inputMode="tel"
              className="h-14 text-base"
            />
            <Textarea
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              placeholder="Address"
              className="text-base"
              rows={2}
            />
            <Button onClick={() => createBusiness(false)} className="w-full h-14 text-base" disabled={creating}>
              {creating ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Plus className="h-5 w-5 mr-2" />}
              Create & continue
            </Button>
            <Button variant="ghost" className="w-full h-12" onClick={() => setShowCreate(false)}>
              Back to search
            </Button>
          </div>
        )}

        {/* ── STEP 2: PRINT ─────────────────────────────────────── */}
        {step === "print" && business && (
          <div className="space-y-4 text-center pt-4">
            <div className="mx-auto w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Printer className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Print the card</h2>
              <p className="text-muted-foreground mt-1">
                Print {business.full_name}’s NFC card on the van printer now.
              </p>
            </div>
            <Button onClick={markPrinted} className="w-full h-16 text-lg" disabled={printing}>
              {printing ? <Loader2 className="h-6 w-6 animate-spin mr-2" /> : <Printer className="h-6 w-6 mr-2" />}
              Card printed — record it
            </Button>
            <p className="text-xs text-muted-foreground">
              This just records print_status = printed. The physical print happens on your printer.
            </p>
            <BackButton />
          </div>
        )}

        {/* ── STEP 3: ACTIVATE ──────────────────────────────────── */}
        {step === "activate" && business && (
          <div className="space-y-4 pt-4">
            <div className="text-center">
              <div className="mx-auto w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Nfc className="h-10 w-10 text-primary" />
              </div>
              <h2 className="text-xl font-bold mt-3">Activate the card</h2>
              <p className="text-muted-foreground mt-1">
                Enter the printed card’s public code — this links the chip to{" "}
                <span className="font-semibold">/{business.username}</span> and makes taps work.
              </p>
            </div>
            <Input
              value={cardCode}
              onChange={(e) => setCardCode(e.target.value.toUpperCase())}
              placeholder="e.g. A7X2K9"
              className="h-16 text-center text-2xl font-mono tracking-widest uppercase"
              autoCapitalize="characters"
            />
            <Button onClick={activateCard} className="w-full h-16 text-lg" disabled={activating}>
              {activating ? <Loader2 className="h-6 w-6 animate-spin mr-2" /> : <Nfc className="h-6 w-6 mr-2" />}
              Activate card
            </Button>
            <BackButton />
          </div>
        )}

        {/* ── STEP 4: PAYMENT ───────────────────────────────────── */}
        {step === "payment" && business && (
          <div className="space-y-4 pt-2">
            {!sessionUrl ? (
              <>
                <div className="text-center">
                  <div className="mx-auto w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <CreditCard className="h-10 w-10 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold mt-3">Collect payment</h2>
                  <p className="text-muted-foreground mt-1">
                    No trial — the owner pays <span className="font-semibold">right now</span> and the
                    subscription starts active immediately.
                  </p>
                </div>
                <div>
                  <label className="text-sm font-semibold">Plan</label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {PLANS.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setPlan(p.id)}
                        className={`rounded-xl border-2 p-4 text-left ${
                          plan === p.id ? "border-primary bg-primary/5" : "border-muted"
                        }`}
                      >
                        <p className="font-bold">{p.label}</p>
                        <p className="text-sm text-muted-foreground">{p.price}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold">Owner’s email (receipt + setup link backup)</label>
                  <Input
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="owner@business.com"
                    inputMode="email"
                    className="h-14 text-base mt-2"
                  />
                </div>
                <Button onClick={createPaymentSession} className="w-full h-16 text-lg" disabled={creatingSession}>
                  {creatingSession ? (
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  ) : (
                    <CreditCard className="h-6 w-6 mr-2" />
                  )}
                  Create payment link
                </Button>
                <BackButton />
              </>
            ) : (
              <div className="space-y-4 text-center">
                {!paymentConfirmed ? (
                  <>
                    <h2 className="text-xl font-bold">Owner scans to pay</h2>
                    <p className="text-muted-foreground">
                      {plan === "solo" ? "Solo · $20/mo" : "Venue · $39/mo"} — charged today, no trial.
                    </p>
                    <div className="bg-white rounded-2xl p-6 inline-block">
                      <QRCode value={sessionUrl} size={220} />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1 h-14" onClick={copyLink}>
                        <Copy className="h-5 w-5 mr-2" /> Copy link
                      </Button>
                      <Button variant="outline" className="flex-1 h-14" asChild>
                        <a href={sessionUrl} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-5 w-5 mr-2" /> Open
                        </a>
                      </Button>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <p className="text-sm">Waiting for payment… auto-checking</p>
                    </div>
                    <Button variant="ghost" className="h-12" onClick={recheckPayment}>
                      Check again now
                    </Button>
                    <Button
                      variant="ghost"
                      className="h-12 text-destructive"
                      onClick={() => {
                        setSessionUrl(null);
                        setSessionId(null);
                      }}
                    >
                      Cancel this link
                    </Button>
                    <BackButton />
                  </>
                ) : (
                  <>
                    <div className="mx-auto w-20 h-20 rounded-2xl bg-green-500/10 flex items-center justify-center">
                      <CheckCircle2 className="h-10 w-10 text-green-600" />
                    </div>
                    <h2 className="text-xl font-bold">Payment confirmed</h2>
                    <p className="text-muted-foreground">
                      Subscription is active. Finish the close.
                    </p>
                    <Button onClick={() => setStep("close")} className="w-full h-16 text-lg">
                      Continue <ArrowRight className="h-5 w-5 ml-2" />
                    </Button>
                    <BackButton />
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 5: CLOSE ─────────────────────────────────────── */}
        {step === "close" && business && (
          <div className="space-y-4 text-center pt-4">
            <div className="mx-auto w-20 h-20 rounded-2xl bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Close the sale</h2>
              <p className="text-muted-foreground mt-1">
                {business.full_name} paid. Mark them converted
                {repId ? " and award the $5 rep bonus" : " (no rep payout — your close)"}.
              </p>
            </div>
            <Button onClick={closeSale} className="w-full h-16 text-lg" disabled={closing}>
              {closing ? <Loader2 className="h-6 w-6 animate-spin mr-2" /> : <CheckCircle2 className="h-6 w-6 mr-2" />}
              Mark closed — payment received
            </Button>
            <BackButton />
          </div>
        )}

        {/* ── DONE ──────────────────────────────────────────────── */}
        {step === "done" && business && (
          <div className="space-y-4 text-center pt-8">
            <div className="mx-auto w-24 h-24 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold">Closed!</h2>
            <p className="text-muted-foreground">
              {business.full_name} is a paying customer. Card live at /{business.username}.
            </p>
            {/* Password-setup handoff status — only "sent" + channel, never the link */}
            {handoff?.sent_at ? (
              <div className="rounded-xl border bg-muted/50 p-4 text-left">
                <p className="text-sm font-semibold">Setup link sent ✓</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Went out via {handoff.channel === "email" ? "email" : "SMS"}.
                  The owner sets their own password later — you never touch it.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-500/40 p-4 text-left">
                <p className="text-sm font-semibold">Setup link hasn’t gone out yet</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  The owner gets their password link by text (or email as backup).
                  Hit resend if they never got it.
                </p>
              </div>
            )}
            <Button
              variant="outline"
              onClick={resendHandoff}
              disabled={resendingHandoff}
              className="w-full h-14 text-base"
            >
              {resendingHandoff ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : null}
              Resend setup link
            </Button>
            <Button onClick={resetFlow} className="w-full h-14 text-base">
              Next visit
            </Button>
            <Button variant="outline" onClick={() => navigate("/admin")} className="w-full h-14 text-base">
              Back to admin
            </Button>
          </div>
        )}
      </div>

      {/* Save-as-lead escape hatch (not on done) */}
      {step !== "done" && (
        <div className="fixed bottom-0 inset-x-0 bg-background/95 backdrop-blur border-t p-4">
          <div className="max-w-lg mx-auto">
            <Button
              variant="outline"
              className="w-full h-14 text-base"
              onClick={saveAsLead}
              disabled={savingLead || creating}
            >
              {savingLead ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <UserPlus className="h-5 w-5 mr-2" />
              )}
              Owner not here / didn’t close — save as lead
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
