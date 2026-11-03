import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { Copy, ExternalLink, Loader2, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { tapawayUrl } from "@/lib/siteUrl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export type SubscriptionInvitationTarget = { id: string; kind: "personal" | "restaurant"; name: string } | null;
export default function SubscriptionInvitationDialog({ target, onClose }: { target: SubscriptionInvitationTarget; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [bound, setBound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setUrl(null); setEmail(""); setError(null);
    if (!target) return;
    let current = true;
    setBusy(true);
    supabase.functions.invoke("subscription-invitation", { body: { action: "admin_info", kind: target.kind, hubId: target.id } }).then(({ data, error: failure }) => {
      if (!current) return;
      if (failure || !data?.eligible) setError("This account needs review before inviting it to subscribe.");
      else { setEmail(data.email || ""); setBound(data.bound === true); }
    }).catch(() => { if (current) setError("Account details could not be loaded."); }).finally(() => { if (current) setBusy(false); });
    return () => { current = false; };
  }, [target]);
  const generate = async () => {
    if (!target) return;
    setBusy(true);
    try {
      const { data, error: failure } = await supabase.functions.invoke("subscription-invitation", { body: { action: "mint", kind: target.kind, hubId: target.id, email } });
      if (failure || !data?.token) throw new Error(data?.error || "Invitation could not be created. Confirm the owner email and billing.");
      setUrl(tapawayUrl(`/subscribe?invite=${encodeURIComponent(data.token)}`));
    } catch (e) { toast.error(e instanceof Error ? e.message : "Invitation unavailable"); }
    finally { setBusy(false); }
  };
  return <Dialog open={!!target} onOpenChange={open => { if (!open) onClose(); }}><DialogContent className="sm:max-w-md"><DialogHeader>
    <DialogTitle>Payment link · {target?.name}</DialogTitle><DialogDescription>Optional subscription. The existing hub stays online. No email is sent until the customer pays.</DialogDescription>
  </DialogHeader>
    {error ? <p role="alert" className="text-destructive">{error}</p> : <div className="space-y-4">
      {!url && <><div className="space-y-2"><Label htmlFor="invitation-email">Dashboard email</Label><Input id="invitation-email" type="email" value={email} onChange={e => setEmail(e.target.value)} readOnly={bound} disabled={busy} />{bound && <p className="text-xs text-muted-foreground">Bound to the existing owner. A payment cannot transfer ownership.</p>}</div><Button className="w-full min-h-11" onClick={generate} disabled={busy || !email}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate payment link"}</Button></>}
      {url && <><div className="flex justify-center rounded-lg bg-card p-4"><QRCode value={url} size={192} className="max-w-full" /></div><p className="text-sm text-muted-foreground">Expires in 24 hours. Choose 4 or 15 cards, monthly or yearly, with optional Card Club.</p><div className="grid gap-2"><Button asChild><a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Open payment link</a></Button><Button variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(url); toast.success("Payment link copied"); } catch { toast.error("Could not copy link"); } }}><Copy className="mr-2 h-4 w-4" />Copy link</Button>{typeof navigator.share === "function" && <Button variant="outline" onClick={async () => { try { await navigator.share({ title: `TapAway · ${target?.name}`, url }); } catch { /* Native cancellation does not change the invitation. */ } }}><Share2 className="mr-2 h-4 w-4" />Share</Button>}<Button variant="ghost" onClick={async () => { if (!target) return; const { data, error: failure } = await supabase.functions.invoke("subscription-invitation", { body: { action: "revoke", kind: target.kind, hubId: target.id } }); if (failure || !data?.revoked) toast.error("Cannot revoke while payment is processing"); else { setUrl(null); toast.success("Invitation revoked; hub unchanged"); } }}>Revoke invitation</Button></div></>}
    </div>}
  </DialogContent></Dialog>;
}