// AdminDiscounts — Jorge's QUICK DISCOUNT TOOL (/admin/discounts).
//
// Mobile-first, one-thumb flow for offering a discount on the spot when
// standing in front of a business owner — under a minute, no Stripe dashboard:
//   1. "New discount": name, percent-or-$-off, duration (once / X months / forever)
//      -> creates a Stripe coupon + row in public.admin_coupons.
//   2. Per discount: "Make pay link" -> pick plan (Solo $20/mo / Venue $39/mo)
//      + optional customer email -> Stripe Checkout Session with the coupon
//      applied -> big tappable link + copy button, ready to hand the owner
//      THEIR phone (or Jorge texts it).
//
// Admin-only (useAdminGuard). All Stripe/DB work runs inside the
// create-admin-coupon edge function (admin-gated via is_admin()).
// Hard rule: everything stays subscription-recurring — no one-time sales,
// no activation fees (sales-tax constraint).
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Loader2,
  Copy,
  ExternalLink,
  Percent,
  Plus,
  Tag,
  CheckCircle2,
} from "lucide-react";

interface AdminCoupon {
  id: string;
  stripe_coupon_id: string;
  name: string;
  percent_off: number | null;
  amount_off_cents: number | null;
  duration: "once" | "repeating" | "forever";
  duration_in_months: number | null;
  note: string | null;
  created_at: string;
}

const PLANS = [
  { id: "solo", label: "Solo", price: "$20/mo" },
  { id: "venue", label: "Venue", price: "$39/mo" },
];

function describeDiscount(c: AdminCoupon): string {
  const off =
    c.percent_off != null ? `${c.percent_off}% off` : `$${((c.amount_off_cents ?? 0) / 100).toFixed(2)} off`;
  const dur =
    c.duration === "once"
      ? "first month"
      : c.duration === "forever"
        ? "forever"
        : `${c.duration_in_months} months`;
  return `${off}, ${dur}`;
}

export default function AdminDiscounts() {
  const { loading: guardLoading } = useAdminGuard();
  const navigate = useNavigate();

  // List
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  // New discount form
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "amount">("percent");
  const [value, setValue] = useState("");
  const [duration, setDuration] = useState<"once" | "repeating" | "forever">("once");
  const [durationMonths, setDurationMonths] = useState("3");
  const [note, setNote] = useState("");
  const [creating, setCreating] = useState(false);

  // Make pay link
  const [linkFor, setLinkFor] = useState<AdminCoupon | null>(null);
  const [linkPlan, setLinkPlan] = useState("solo");
  const [linkEmail, setLinkEmail] = useState("");
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const [makingLink, setMakingLink] = useState(false);

  // Archive
  const [archivingId, setArchivingId] = useState<string | null>(null);

  const archiveCoupon = async (c: AdminCoupon) => {
    if (!window.confirm(`Archive "${c.name}"? It can no longer be used for new pay links.`)) return;
    setArchivingId(c.id);
    try {
      const { data, error } = await supabase.functions.invoke("create-admin-coupon", {
        body: { action: "archive", coupon_id: c.id },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setCoupons((prev) => prev.filter((x) => x.id !== c.id));
      if (linkFor?.id === c.id) {
        setLinkFor(null);
        setLinkUrl(null);
      }
      toast.success("Discount archived");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to archive discount");
    } finally {
      setArchivingId(null);
    }
  };

  const loadCoupons = useCallback(async () => {
    setLoadingList(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-admin-coupon", {
        body: { action: "list" },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setCoupons((data?.coupons ?? []) as AdminCoupon[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load discounts");
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  const createCoupon = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Give the discount a name");
      return;
    }
    const num = Number(value);
    if (!value || !Number.isInteger(num) || num <= 0) {
      toast.error(discountType === "percent" ? "Enter a percent (1-100)" : "Enter an amount in dollars");
      return;
    }
    if (discountType === "percent" && num > 100) {
      toast.error("Percent can't be over 100");
      return;
    }
    if (duration === "repeating") {
      const m = Number(durationMonths);
      if (!Number.isInteger(m) || m < 1 || m > 60) {
        toast.error("Months must be between 1 and 60");
        return;
      }
    }

    setCreating(true);
    try {
      const payload: Record<string, unknown> = {
        action: "create",
        name: trimmedName,
        duration,
        note: note.trim() || undefined,
      };
      if (discountType === "percent") payload.percent_off = num;
      else payload.amount_off_cents = num * 100;
      if (duration === "repeating") payload.duration_in_months = Number(durationMonths);

      const { data, error } = await supabase.functions.invoke("create-admin-coupon", {
        body: payload,
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      toast.success("Discount created");
      setCoupons((prev) => [data.coupon as AdminCoupon, ...prev]);
      // Reset form
      setName("");
      setValue("");
      setDuration("once");
      setDurationMonths("3");
      setNote("");
      setShowForm(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create discount");
    } finally {
      setCreating(false);
    }
  };

  const openMakeLink = (c: AdminCoupon) => {
    setLinkFor(c);
    setLinkPlan("solo");
    setLinkEmail("");
    setLinkUrl(null);
  };

  const makeLink = async () => {
    if (!linkFor) return;
    setMakingLink(true);
    setLinkUrl(null);
    try {
      const { data, error } = await supabase.functions.invoke("create-admin-coupon", {
        body: {
          action: "make_link",
          coupon_id: linkFor.id,
          plan_key: linkPlan,
          customer_email: linkEmail.trim() || undefined,
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (!data?.url) throw new Error("No checkout URL returned");
      setLinkUrl(data.url as string);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create pay link");
    } finally {
      setMakingLink(false);
    }
  };

  const copyUrl = async () => {
    if (!linkUrl) return;
    try {
      await navigator.clipboard.writeText(linkUrl);
      toast.success("Link copied — ready to send");
    } catch {
      toast.error("Copy failed — long-press the link instead");
    }
  };

  if (guardLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-white/60" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-24">
      <div className="mx-auto max-w-lg px-4 pt-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin")}
            aria-label="Back to admin"
            className="text-white/70 hover:text-white hover:bg-white/10 min-h-[44px] min-w-[44px]"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Quick Discount</h1>
            <p className="text-sm text-white/50">Discount on the spot — under a minute</p>
          </div>
        </div>

        {/* New discount toggle */}
        {!showForm && (
          <Button
            onClick={() => setShowForm(true)}
            className="w-full h-12 text-base mb-4 bg-emerald-600 hover:bg-emerald-500"
          >
            <Plus className="h-5 w-5 mr-2" /> New discount
          </Button>
        )}

        {/* New discount form */}
        {showForm && (
          <Card className="bg-white/5 border-white/10 mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-base">New discount</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="disc-name" className="text-white/70">Name</Label>
                <Input
                  id="disc-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Closing deal — Maria's Cafe"
                  className="bg-white/10 border-white/10 text-white placeholder:text-white/30 h-12"
                />
              </div>

              {/* Type toggle: percent vs $ amount */}
              <div className="space-y-1.5">
                <Label className="text-white/70">Discount type</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={discountType === "percent" ? "default" : "outline"}
                    className={discountType === "percent" ? "bg-emerald-600 hover:bg-emerald-500 h-12" : "h-12 text-white/70 border-white/15"}
                    onClick={() => setDiscountType("percent")}
                  >
                    <Percent className="h-4 w-4 mr-2" /> Percent
                  </Button>
                  <Button
                    type="button"
                    variant={discountType === "amount" ? "default" : "outline"}
                    className={discountType === "amount" ? "bg-emerald-600 hover:bg-emerald-500 h-12" : "h-12 text-white/70 border-white/15"}
                    onClick={() => setDiscountType("amount")}
                  >
                    <Tag className="h-4 w-4 mr-2" /> $ Amount
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="disc-value" className="text-white/70">
                  {discountType === "percent" ? "Percent off (1-100)" : "Amount off ($)"}
                </Label>
                <Input
                  id="disc-value"
                  inputMode="numeric"
                  value={value}
                  onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder={discountType === "percent" ? "20" : "10"}
                  className="bg-white/10 border-white/10 text-white placeholder:text-white/30 h-12 text-lg"
                />
              </div>

              {/* Duration */}
              <div className="space-y-1.5">
                <Label className="text-white/70">Applies for</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: "once", label: "First month" },
                      { id: "repeating", label: "X months" },
                      { id: "forever", label: "Forever" },
                    ] as const
                  ).map((d) => (
                    <Button
                      key={d.id}
                      type="button"
                      variant={duration === d.id ? "default" : "outline"}
                      className={
                        duration === d.id
                          ? "bg-emerald-600 hover:bg-emerald-500 h-12 text-sm"
                          : "h-12 text-sm text-white/70 border-white/15"
                      }
                      onClick={() => setDuration(d.id)}
                    >
                      {d.label}
                    </Button>
                  ))}
                </div>
              </div>

              {duration === "repeating" && (
                <div className="space-y-1.5">
                  <Label htmlFor="disc-months" className="text-white/70">How many months?</Label>
                  <Input
                    id="disc-months"
                    inputMode="numeric"
                    value={durationMonths}
                    onChange={(e) => setDurationMonths(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="3"
                    className="bg-white/10 border-white/10 text-white placeholder:text-white/30 h-12 text-lg"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="disc-note" className="text-white/70">Note (optional)</Label>
                <Textarea
                  id="disc-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Why you're giving it — for your records"
                  className="bg-white/10 border-white/10 text-white placeholder:text-white/30"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  variant="outline"
                  className="h-12 text-white/70 border-white/15"
                  onClick={() => setShowForm(false)}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button
                  className="h-12 bg-emerald-600 hover:bg-emerald-500"
                  onClick={createCoupon}
                  disabled={creating}
                >
                  {creating ? <Loader2 className="h-5 w-5 animate-spin" /> : "Create discount"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Discount list */}
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wide mb-2">
          Your discounts
        </h2>
        {loadingList ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-white/40" />
          </div>
        ) : coupons.length === 0 ? (
          <p className="text-white/40 text-sm py-8 text-center">
            No discounts yet. Tap "New discount" to create one.
          </p>
        ) : (
          <div className="space-y-3">
            {coupons.map((c) => (
              <Card key={c.id} className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-white truncate">{c.name}</p>
                      <p className="text-emerald-400 font-medium mt-0.5">{describeDiscount(c)}</p>
                      {c.note && <p className="text-white/40 text-xs mt-1 truncate">{c.note}</p>}
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <Badge variant="outline" className="text-white/50 border-white/15">
                        {new Date(c.created_at).toLocaleDateString()}
                      </Badge>
                      <button
                        onClick={() => archiveCoupon(c)}
                        disabled={archivingId === c.id}
                        className="text-xs text-white/40 hover:text-red-300 px-2 py-2 min-h-[44px] disabled:opacity-50"
                        aria-label={`Archive discount ${c.name}`}
                      >
                        {archivingId === c.id ? "Archiving…" : "Archive"}
                      </button>
                    </div>
                  </div>

                  {/* Make pay link panel */}
                  {linkFor?.id === c.id ? (
                    <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        {PLANS.map((p) => (
                          <Button
                            key={p.id}
                            type="button"
                            variant={linkPlan === p.id ? "default" : "outline"}
                            className={
                              linkPlan === p.id
                                ? "bg-emerald-600 hover:bg-emerald-500 h-12"
                                : "h-12 text-white/70 border-white/15"
                            }
                            onClick={() => setLinkPlan(p.id)}
                          >
                            {p.label} · {p.price}
                          </Button>
                        ))}
                      </div>
                      <Input
                        inputMode="email"
                        value={linkEmail}
                        onChange={(e) => setLinkEmail(e.target.value)}
                        placeholder="Owner's email (optional)"
                        className="bg-white/10 border-white/10 text-white placeholder:text-white/30 h-12"
                      />
                      {linkUrl ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-emerald-400">
                            <CheckCircle2 className="h-5 w-5" />
                            <span className="font-medium">Ready — hand them your phone</span>
                          </div>
                          <a
                            href={linkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full text-center bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg py-4 text-lg"
                          >
                            <ExternalLink className="inline h-5 w-5 mr-2 -mt-0.5" />
                            Open pay link
                          </a>
                          <Button
                            variant="outline"
                            className="w-full h-12 text-white/80 border-white/15"
                            onClick={copyUrl}
                          >
                            <Copy className="h-4 w-4 mr-2" /> Copy link to send
                          </Button>
                          <Button
                            variant="ghost"
                            className="w-full text-white/50"
                            onClick={() => {
                              setLinkFor(null);
                              setLinkUrl(null);
                            }}
                          >
                            Done
                          </Button>
                        </div>
                      ) : (
                        <Button
                          className="w-full h-12 bg-emerald-600 hover:bg-emerald-500"
                          onClick={makeLink}
                          disabled={makingLink}
                        >
                          {makingLink ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            "Generate pay link"
                          )}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <Button
                      className="w-full h-11 mt-3 bg-white/10 hover:bg-white/15 text-white"
                      onClick={() => openMakeLink(c)}
                    >
                      Make pay link
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
