import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Copy, ExternalLink, Loader2, Plus, Check, Tag, Pencil, Power, X } from "lucide-react";
import { toast } from "sonner";

interface CustomPlan {
  id: string;
  name: string;
  description: string | null;
  amount_cents: number;
  stripe_product_id: string;
  stripe_price_id: string;
  trial_days: number;
  is_active: boolean;
  updated_at: string | null;
  created_at: string;
}

const fmtMoney = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

const AdminCustomPlans = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminAccess();
  const { loading: guardLoading } = useAdminGuard();

  const [plans, setPlans] = useState<CustomPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  // New plan form
  const [name, setName] = useState("");
  const [priceDollars, setPriceDollars] = useState("");
  const [description, setDescription] = useState("");
  const [trialOn, setTrialOn] = useState(false);
  const [trialDays, setTrialDays] = useState("14");
  const [creating, setCreating] = useState(false);

  // Result / per-row pay links
  const [newPlanLink, setNewPlanLink] = useState<{ plan: CustomPlan; url: string } | null>(null);
  const [rowLinks, setRowLinks] = useState<Record<string, string>>({});
  const [fetchingLink, setFetchingLink] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Edit / deactivate state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editTrialDays, setEditTrialDays] = useState("0");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deactivating, setDeactivating] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    setLoadingPlans(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-custom-plan", {
        body: { action: "list" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setPlans(data?.plans ?? []);
    } catch (err) {
      console.error("Failed to load custom plans:", err);
      toast.error(err instanceof Error ? err.message : "Couldn't load custom plans.");
    } finally {
      setLoadingPlans(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) fetchPlans();
  }, [isAdmin, fetchPlans]);

  const handleGetLink = async (planId: string): Promise<string | null> => {    setFetchingLink(planId);
    try {
      const { data, error } = await supabase.functions.invoke("create-custom-plan", {
        body: { action: "make_link", plan_id: planId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const url = data?.url as string | undefined;
      if (!url) throw new Error("No pay link returned.");
      setRowLinks((prev) => ({ ...prev, [planId]: url }));
      return url;
    } catch (err) {
      console.error("make_link failed:", err);
      toast.error(err instanceof Error ? err.message : "Couldn't create the pay link.");
      return null;
    } finally {
      setFetchingLink(null);
    }
  };

  const handleCopy = async (url: string) => {
    const ok = await copyText(url);
    if (ok) {
      setCopiedUrl(url);
      toast.success("Pay link copied — send it or open it for them.");
      setTimeout(() => setCopiedUrl(null), 2500);
    } else {
      toast.error("Copy failed — long-press the link to copy it manually.");
    }
  };

  const handleCreate = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Give the plan a name (e.g. \"400-Card Enterprise\").");
      return;
    }
    const dollars = parseFloat(priceDollars.replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(dollars) || dollars <= 0) {
      toast.error("Enter a monthly price greater than $0.");
      return;
    }
    const amount_cents = Math.round(dollars * 100);
    if (amount_cents > 1_000_000) {
      toast.error("That price looks too high (max $10,000/mo) — check for a typo.");
      return;
    }
    const days = trialOn ? parseInt(trialDays, 10) : 0;
    if (trialOn && (!Number.isInteger(days) || days < 0 || days > 90)) {
      toast.error("Trial must be between 0 and 90 days.");
      return;
    }

    setCreating(true);
    setNewPlanLink(null);
    try {
      const { data, error } = await supabase.functions.invoke("create-custom-plan", {
        body: {
          action: "create",
          name: trimmedName,
          amount_cents,
          description: description.trim() || undefined,
          trial_days: days,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const plan = data?.plan as CustomPlan | undefined;
      if (!plan) throw new Error("Plan was not created.");

      if (data?.reused) {
        toast.info("That plan already exists — showing the existing one.");
      } else {
        toast.success(`"${plan.name}" created at ${fmtMoney(plan.amount_cents)}/mo.`);
      }

      const url = await handleGetLink(plan.id);
      if (url) setNewPlanLink({ plan, url });

      // Refresh list + reset form
      setPlans((prev) => {
        const without = prev.filter((p) => p.id !== plan.id);
        return [plan, ...without];
      });
      setName("");
      setPriceDollars("");
      setDescription("");
      setTrialOn(false);
      setTrialDays("14");
    } catch (err) {
      console.error("create plan failed:", err);
      toast.error(err instanceof Error ? err.message : "Couldn't create the plan.");
    } finally {
      setCreating(false);
    }
  };

  // ---------- Edit / deactivate ----------

  const startEdit = (plan: CustomPlan) => {
    setEditingId(plan.id);
    setEditName(plan.name);
    setEditPrice((plan.amount_cents / 100).toString());
    setEditDesc(plan.description ?? "");
    setEditTrialDays(String(plan.trial_days ?? 0));
  };

  const cancelEdit = () => setEditingId(null);

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const trimmedName = editName.trim();
    if (!trimmedName) {
      toast.error("Give the plan a name.");
      return;
    }
    const dollars = parseFloat(editPrice.replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(dollars) || dollars <= 0) {
      toast.error("Enter a monthly price greater than $0.");
      return;
    }
    const amount_cents = Math.round(dollars * 100);
    if (amount_cents > 1_000_000) {
      toast.error("That price looks too high (max $10,000/mo) — check for a typo.");
      return;
    }
    const trial_days = parseInt(editTrialDays.replace(/[^0-9]/g, "") || "0", 10);
    if (!Number.isInteger(trial_days) || trial_days < 0 || trial_days > 90) {
      toast.error("Trial must be between 0 and 90 days.");
      return;
    }

    setSavingEdit(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-custom-plan", {
        body: {
          action: "update",
          plan_id: editingId,
          name: trimmedName,
          amount_cents,
          description: editDesc.trim(),
          trial_days,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const plan = data?.plan as CustomPlan | undefined;
      if (!plan) throw new Error("Plan was not updated.");
      setPlans((prev) => prev.map((p) => (p.id === plan.id ? plan : p)));
      setEditingId(null);
      toast.success(`"${plan.name}" updated.`);
    } catch (err) {
      console.error("update plan failed:", err);
      toast.error(err instanceof Error ? err.message : "Couldn't update the plan.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeactivate = async (plan: CustomPlan) => {
    if (
      !window.confirm(
        `Deactivate "${plan.name}" (${fmtMoney(plan.amount_cents)}/mo)?\n\nPay links stop working for this plan. Existing subscribers are NOT affected — only new checkouts.`
      )
    )
      return;
    setDeactivating(plan.id);
    try {
      const { data, error } = await supabase.functions.invoke("create-custom-plan", {
        body: { action: "deactivate", plan_id: plan.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const updated = data?.plan as CustomPlan | undefined;
      if (!updated) throw new Error("Plan was not deactivated.");
      setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      toast.success(`"${plan.name}" deactivated.`);
    } catch (err) {
      console.error("deactivate plan failed:", err);
      toast.error(err instanceof Error ? err.message : "Couldn't deactivate the plan.");
    } finally {
      setDeactivating(null);
    }
  };

  if (adminLoading || guardLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-4 md:p-8">
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Admin
          </Button>
        </div>

        <h1 className="text-2xl font-bold mb-1">Custom Plans</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Build a custom-priced recurring plan on the spot and hand the customer a pay link. Subscription only — no one-time charges.
        </p>

        {/* ---------- New plan form ---------- */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">New plan</CardTitle>
            <CardDescription>Name it, price it, get the pay link.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="plan-name">Plan name</Label>
              <Input
                id="plan-name"
                placeholder="e.g. 400-Card Enterprise"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={120}
                className="text-base"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="plan-price">Monthly price</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-base">$</span>
                <Input
                  id="plan-price"
                  inputMode="decimal"
                  placeholder="250"
                  value={priceDollars}
                  onChange={(e) => setPriceDollars(e.target.value)}
                  className="pl-7 text-base"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">/mo</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="plan-desc">Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                id="plan-desc"
                placeholder="What's included"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                className="text-base"
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div>
                <div className="text-sm font-medium">Free trial</div>
                <div className="text-xs text-muted-foreground">
                  {trialOn ? "Customer is billed after the trial." : "Off — card is charged immediately (best for in-person closes)."}
                </div>
              </div>
              <Switch checked={trialOn} onCheckedChange={setTrialOn} aria-label="Free trial" />
            </div>

            {trialOn && (
              <div className="space-y-1.5">
                <Label htmlFor="trial-days">Trial length (days)</Label>
                <Input
                  id="trial-days"
                  inputMode="numeric"
                  value={trialDays}
                  onChange={(e) => setTrialDays(e.target.value.replace(/[^0-9]/g, ""))}
                  className="w-28 text-base"
                />
              </div>
            )}

            <Button onClick={handleCreate} disabled={creating} className="w-full min-h-[48px] text-base">
              {creating ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Plus className="h-5 w-5 mr-2" />}
              {creating ? "Creating…" : "Create plan"}
            </Button>

            {/* ---------- Freshly created pay link ---------- */}
            {newPlanLink && (
              <div className="rounded-lg border-2 border-primary/40 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600" />
                  <div className="font-semibold">
                    {newPlanLink.plan.name} · {fmtMoney(newPlanLink.plan.amount_cents)}/mo
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Hand this link to the customer — it works for a recurring subscription and can be reused.
                </p>
                <Input value={newPlanLink.url} readOnly onFocus={(e) => e.target.select()} className="text-sm" />
                <div className="flex gap-2">
                  <Button onClick={() => handleCopy(newPlanLink.url)} className="flex-1 min-h-[48px]">
                    {copiedUrl === newPlanLink.url ? <Check className="h-5 w-5 mr-2" /> : <Copy className="h-5 w-5 mr-2" />}
                    {copiedUrl === newPlanLink.url ? "Copied!" : "Copy pay link"}
                  </Button>
                  <Button
                    variant="outline"
                    className="min-h-[48px] px-4"
                    onClick={() => window.open(newPlanLink.url, "_blank", "noopener")}
                    aria-label="Open pay link"
                  >
                    <ExternalLink className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ---------- Plan list ---------- */}
        <h2 className="text-lg font-semibold mb-3">Saved plans</h2>
        {loadingPlans ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : plans.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              <Tag className="h-8 w-8 mx-auto mb-2 opacity-50" />
              No custom plans yet. Create one above when a business needs a custom price.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {plans.map((plan) => {
              const url = rowLinks[plan.id];
              const busy = fetchingLink === plan.id;
              const inactive = plan.is_active === false;
              const isEditing = editingId === plan.id;

              // ---------- Inline edit form ----------
              if (isEditing) {
                return (
                  <Card key={plan.id}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold">Edit plan</div>
                        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={cancelEdit} aria-label="Cancel edit">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`edit-name-${plan.id}`}>Plan name</Label>
                        <Input
                          id={`edit-name-${plan.id}`}
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          maxLength={120}
                          className="text-base"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`edit-price-${plan.id}`}>Monthly price</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-base">$</span>
                          <Input
                            id={`edit-price-${plan.id}`}
                            inputMode="decimal"
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                            className="pl-7 text-base"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">/mo</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Changing the price creates a new Stripe price — existing subscribers keep their old price.
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`edit-desc-${plan.id}`}>Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
                        <Input
                          id={`edit-desc-${plan.id}`}
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          maxLength={500}
                          className="text-base"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`edit-trial-${plan.id}`}>Trial length (days, 0 = charge immediately)</Label>
                        <Input
                          id={`edit-trial-${plan.id}`}
                          inputMode="numeric"
                          value={editTrialDays}
                          onChange={(e) => setEditTrialDays(e.target.value.replace(/[^0-9]/g, ""))}
                          className="w-28 text-base"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleSaveEdit} disabled={savingEdit} className="flex-1 min-h-[48px]">
                          {savingEdit ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Check className="h-5 w-5 mr-2" />}
                          {savingEdit ? "Saving…" : "Save changes"}
                        </Button>
                        <Button variant="outline" onClick={cancelEdit} className="min-h-[48px]">
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              }

              // ---------- Normal row ----------
              return (
                <Card key={plan.id} className={inactive ? "opacity-70" : undefined}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div className="font-semibold leading-tight min-w-0 break-words">{plan.name}</div>
                      <div className="font-bold whitespace-nowrap">{fmtMoney(plan.amount_cents)}<span className="text-xs font-normal text-muted-foreground">/mo</span></div>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs text-muted-foreground">{fmtDate(plan.created_at)}</span>
                      {plan.trial_days > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {plan.trial_days}-day trial
                        </Badge>
                      )}
                      {inactive && (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          Inactive — pay links disabled
                        </Badge>
                      )}
                    </div>

                    {inactive ? (
                      <p className="text-xs text-muted-foreground">
                        Deactivated. Existing subscribers are unaffected — only new checkouts are blocked.
                      </p>
                    ) : url ? (
                      <div className="space-y-2">
                        <Input value={url} readOnly onFocus={(e) => e.target.select()} className="text-sm" />
                        <Button onClick={() => handleCopy(url)} className="w-full min-h-[48px]">
                          {copiedUrl === url ? <Check className="h-5 w-5 mr-2" /> : <Copy className="h-5 w-5 mr-2" />}
                          {copiedUrl === url ? "Copied!" : "Copy pay link"}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full min-h-[52px] text-base"
                        onClick={() => handleGetLink(plan.id)}
                        disabled={busy}
                      >
                        {busy ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                        {busy ? "Getting link…" : "Get pay link"}
                      </Button>
                    )}

                    {/* Row management */}
                    {!inactive && (
                      <div className="flex gap-2 mt-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1 h-10 text-sm"
                          onClick={() => startEdit(plan)}
                        >
                          <Pencil className="h-4 w-4 mr-2" /> Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1 h-10 text-sm text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeactivate(plan)}
                          disabled={deactivating === plan.id}
                        >
                          {deactivating === plan.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Power className="h-4 w-4 mr-2" />
                          )}
                          {deactivating === plan.id ? "Deactivating…" : "Deactivate"}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCustomPlans;
