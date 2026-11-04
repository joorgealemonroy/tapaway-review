import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
type State = { invitation: { selection: { plan: "solo" | "venue"; interval: "month" | "year" }; shipping_address: { line1: string; city: string; state: string; postal_code: string } } | null; club?: { id: string; status: string } | null; entitlement?: { eligible: boolean; quantity: number; next_eligible_at: string | null } | null };
export default function SubscriptionInvitationCards({ hubId }: { hubId: string }) {
  const [state, setState] = useState<State | null>(null), [busy, setBusy] = useState(false);
  const load = useCallback(async () => { const { data, error } = await supabase.functions.invoke("subscription-invitation", { body: { action: "owner_state", hubId } }); if (!error) setState(data); }, [hubId]);
  useEffect(() => { void load(); }, [load]);
  if (!state?.invitation) return null;
  const i = state.invitation, qty = i.selection.plan === "venue" ? 15 : 4;
  return <section className="space-y-3 rounded-lg border border-border p-4"><h2 className="text-lg font-semibold">Your subscription cards</h2><p>{qty} included cards</p><p className="text-sm text-muted-foreground">{i.shipping_address.line1}, {i.shipping_address.city}, {i.shipping_address.state} {i.shipping_address.postal_code}</p>{state.club && <><h3 className="font-semibold">Card Club · {i.selection.interval === "year" ? "$60/year" : "$5/month"}</h3><p className="text-sm">{state.club.status} · Up to {qty} replacement cards per rolling month</p>{state.entitlement?.next_eligible_at && <p className="text-sm text-muted-foreground">Next replacement: {new Date(state.entitlement.next_eligible_at).toLocaleDateString()}</p>}<Button disabled={busy || !state.entitlement?.eligible} onClick={async () => { setBusy(true); const { data, error } = await supabase.functions.invoke("card-club-request", { body: { membershipId: state.club?.id, idempotencyKey: crypto.randomUUID(), designNote: "" } }); setBusy(false); if (error || !data?.ok) toast.error(data?.error || "Replacement request unavailable"); else { toast.success("Replacement request received"); void load(); } }}>Request replacement cards</Button></>}</section>;
}