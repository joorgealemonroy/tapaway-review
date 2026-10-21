import { useEffect, useState } from "react";
import { Loader2, CreditCard, LockKeyhole } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type HubPaymentTarget = { id: string; name: string; slug: string | null } | null;

export default function RequireHubPaymentDialog({ target, onClose, onSaved }: {
  target: HubPaymentTarget;
  onClose: () => void;
  onSaved: (profileId: string) => void | Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { setError(""); }, [target?.id]);
  const requirePayment = async () => {
    if (!target || busy) return;
    setBusy(true);
    setError("");
    try {
      const { data, error: requestError } = await supabase.functions.invoke("hub-payment-request", {
        body: { action: "require", profileId: target.id, confirm: true },
      });
      if (requestError || data?.ok !== true) {
        let reason = data?.error;
        if (!reason && requestError && "context" in requestError) {
          try { reason = (await (requestError.context as Response).json())?.error; } catch { /* use readable fallback */ }
        }
        throw new Error(typeof reason === "string" ? reason : "Could not require payment. This account may already have billing or free access. Refresh its details and try again.");
      }
      await onSaved(target.id);
      toast.success("Hub paused. Its owner can activate it for $20/month.");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update this hub. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={!!target} onOpenChange={open => { if (!open && !busy) onClose(); }}>
      <DialogContent className="w-[calc(100%-2rem)] max-h-[90dvh] overflow-y-auto rounded-2xl border-[#dfe6d8] bg-[#fffdf7] text-[#19382b] sm:max-w-md" onInteractOutside={event => { if (busy) event.preventDefault(); }} onEscapeKeyDown={event => { if (busy) event.preventDefault(); }}>
        <DialogHeader>
          <span className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-[#edf3e6]"><LockKeyhole className="h-5 w-5" /></span>
          <DialogTitle className="text-xl">Require payment for this hub?</DialogTitle>
          <DialogDescription className="break-words text-[#5b695e]">{target?.name}{target?.slug ? ` · tapaway.co/${target.slug}` : ""}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm leading-relaxed text-[#465b4b]">
          <p>This pauses the public links for this hub. The owner will see their activity and one option to activate the 4 cards they already have for <strong className="text-[#19382b]">$20/month</strong>.</p>
          <p>The same cards and page address will work again after verified payment. Their content and activity stay saved.</p>
          <p className="rounded-xl bg-[#edf3e6] p-3 text-xs">This changes only this hub. It doesn’t charge a saved card or send a message. Existing subscriptions and gift accounts are protected.</p>
        </div>
        {error && <p role="alert" className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm leading-relaxed text-orange-900">{error}</p>}
        <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row">
          <button type="button" disabled={busy} onClick={onClose} className="min-h-11 rounded-xl border border-[#dfe6d8] px-4 text-sm font-semibold disabled:opacity-60 sm:flex-1">Keep as is</button>
          <button type="button" disabled={busy} onClick={requirePayment} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#234d37] px-4 text-sm font-semibold text-[#fffdf7] disabled:opacity-60 sm:flex-1">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}Require payment</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
