// FeatureUpdateComposer — the /admin/emails Compose tab.
//
// Minimal broadcast tool (NOT a newsletter editor): Jorge fills headline +
// body + optional CTA (text + link), previews the actual email render, sees
// the recipient count, confirms, and sends.
//
// Recipients (decided, corrected 2026-09-09): ACTIVE + PAST-DUE subscribers —
//   restaurants:  subscription_status IN (active, past_due)
//                 AND payment_state != 'complimentary' AND email IS NOT NULL
//   personal_profiles: subscription_status IN (active, past_due)
//                 AND payment_state != 'complimentary' AND email IS NOT NULL
// Excluded: trialing, comped/family (complimentary), canceled.
// past_due is INCLUDED — a manual nudge once got a past-due client paying
// immediately; staying in touch recovers revenue. (Matches the MRR logic.)
// NOTE: personal_profiles.payment_state exists after migration
// 20260909320000_personal_payment_state.sql.
//
// The count shown here is an ESTIMATE (count-only queries, no PII pulled to
// the phone). The edge function computes the real recipient list server-side
// and dedupes by email. See EMAIL-ADMIN.md for the send-feature-update contract.
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Send, Users, AlertTriangle } from "lucide-react";
import EmailPreviewFrame from "./EmailPreviewFrame";

const ACTIVE_STATUSES = ["active", "past_due"];

export default function FeatureUpdateComposer() {
  const [headline, setHeadline] = useState("");
  const [body, setBody] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");

  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [backendMissing, setBackendMissing] = useState(false);

  const loadCount = useCallback(async () => {
    setCountLoading(true);
    try {
      const [biz, solo] = await Promise.allSettled([
        supabase
          .from("restaurants")
          .select("id", { count: "exact", head: true })
          .in("subscription_status", ACTIVE_STATUSES)
          .neq("payment_state", "complimentary")
          .not("email", "is", null),
        supabase
          .from("personal_profiles")
          .select("id", { count: "exact", head: true })
          .in("subscription_status", ACTIVE_STATUSES)
          .neq("payment_state", "complimentary")
          .not("email", "is", null),
      ]);
      const total =
        (biz.status === "fulfilled" ? biz.value.count ?? 0 : 0) +
        (solo.status === "fulfilled" ? solo.value.count ?? 0 : 0);
      setRecipientCount(total);
    } catch {
      setRecipientCount(null);
    } finally {
      setCountLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCount();
  }, [loadCount]);

  const subject = useMemo(
    () => (headline.trim() ? `TapAway update: ${headline.trim()}` : "TapAway update"),
    [headline]
  );

  const ctaUrlClean = ctaUrl.trim();
  const ctaTextClean = ctaText.trim();
  const ctaValid =
    (!ctaTextClean && !ctaUrlClean) ||
    (!!ctaTextClean && /^https:\/\//i.test(ctaUrlClean));

  const errors = useMemo(() => {
    const e: string[] = [];
    if (!headline.trim()) e.push("Add a headline.");
    if (headline.trim().length > 120) e.push("Headline is too long (120 max).");
    if (!body.trim()) e.push("Write the update body.");
    if (body.trim().length > 2000) e.push("Body is too long (2,000 max).");
    if (!ctaValid) e.push("CTA needs text AND a link starting with https:// — or leave both empty.");
    return e;
  }, [headline, body, ctaValid]);

  // Live preview — rendered by the canonical email-template-preview edge
  // function (same registry the sends use), so the preview is exactly what
  // clients get. Debounced: refires 800ms after Jorge stops typing.
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    const vars = {
      headline: headline.trim() || "Your headline goes here",
      body: body.trim(),
      ctaLabel: ctaTextClean || undefined,
      ctaUrl: ctaUrlClean || undefined,
      subject: headline.trim() ? `TapAway update: ${headline.trim()}` : "TapAway update",
      preheader: body.trim().slice(0, 120),
      name: "Alex",
    };
    let cancelled = false;
    setPreviewLoading(true);
    const t = setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke(
          "email-template-preview",
          { body: { template_key: "feature_update", vars } }
        );
        if (cancelled) return;
        if (error) throw new Error(error.message || "Preview backend error.");
        if (!data?.html) throw new Error("Preview backend returned no HTML.");
        setPreviewHtml(data.html as string);
        setPreviewError(null);
      } catch (e) {
        if (!cancelled) {
          setPreviewError(e instanceof Error ? e.message : "Couldn't load the preview.");
          setPreviewHtml(null);
        }
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }, 800);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [headline, body, ctaTextClean, ctaUrlClean]);

  const handleSend = async () => {
    if (errors.length > 0) {
      toast.error(errors[0]);
      return;
    }
    setSending(true);
    setBackendMissing(false);
    try {
      const { data, error } = await supabase.functions.invoke("send-feature-update", {
        body: {
          headline: headline.trim(),
          body: body.trim(),
          cta_text: ctaTextClean || null,
          cta_url: ctaUrlClean || null,
        },
      });
      if (error) {
        // 404 / function-not-found → backend sibling hasn't deployed it yet.
        const msg = error.message ?? "";
        if (/not found|404|function/i.test(msg)) {
          setBackendMissing(true);
        } else {
          toast.error(`Send failed: ${msg}`);
        }
        return;
      }
      const sent = (data as { sent?: number } | null)?.sent ?? 0;
      const failed = (data as { failed?: number } | null)?.failed ?? 0;
      toast.success(`Sent to ${sent} client${sent === 1 ? "" : "s"}${failed > 0 ? `, ${failed} failed` : ""}.`);
      setConfirmOpen(false);
      setHeadline("");
      setBody("");
      setCtaText("");
      setCtaUrl("");
      loadCount();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Send failed.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      {backendMissing && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-200">Send backend isn't live yet</p>
            <p className="text-white/60 text-xs mt-1">
              The send-feature-update edge function hasn't been deployed. Your
              draft is saved below — sending activates once the backend lands.
            </p>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 flex items-center gap-2.5">
        <Users className="h-4 w-4 text-white/50 shrink-0" />
        <p className="text-sm text-white/80">
          {countLoading ? (
            <span className="inline-flex items-center gap-2 text-white/50">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Counting active clients…
            </span>
          ) : recipientCount === null ? (
            "Couldn't count recipients — check filters, then try again."
          ) : (
            <>
              Will reach <span className="font-semibold text-white">{recipientCount}</span>{" "}
              active client{recipientCount === 1 ? "" : "s"}
              <span className="text-white/40 text-xs block">
                Paying subscribers only — no trials, no comped accounts.
              </span>
            </>
          )}
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <Label htmlFor="fu-headline">Headline</Label>
          <Input
            id="fu-headline"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="e.g. Slow-day deals are here"
            maxLength={120}
            className="mt-1 min-h-[48px]"
          />
        </div>
        <div>
          <Label htmlFor="fu-body">Body</Label>
          <Textarea
            id="fu-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What's new and why they should care. Plain text — blank lines make paragraphs."
            rows={6}
            maxLength={2000}
            className="mt-1 text-base"
          />
          <p className="text-[11px] text-white/40 mt-1">{body.trim().length}/2,000</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="fu-cta-text">Button text (optional)</Label>
            <Input
              id="fu-cta-text"
              value={ctaText}
              onChange={(e) => setCtaText(e.target.value)}
              placeholder="e.g. Try it now"
              className="mt-1 min-h-[48px]"
            />
          </div>
          <div>
            <Label htmlFor="fu-cta-url">Button link (optional)</Label>
            <Input
              id="fu-cta-url"
              value={ctaUrl}
              onChange={(e) => setCtaUrl(e.target.value)}
              placeholder="https://…"
              inputMode="url"
              className="mt-1 min-h-[48px]"
            />
          </div>
        </div>
        <p className="text-[11px] text-white/40">
          Subject line: <span className="text-white/70 font-medium">{subject}</span>
        </p>
      </div>

      <div>
        <p className="text-xs font-medium text-white/60 mb-2">Live preview — exactly what clients get</p>
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {previewHtml ? (
              <EmailPreviewFrame
                html={previewHtml}
                title="Feature update preview"
                contentHeight={840}
              />
            ) : previewError ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 px-6 text-center">
                <AlertTriangle className="h-6 w-6 text-amber-400" />
                <p className="text-xs text-white/60">
                  Preview backend isn't live yet — deploy the
                  email-template-preview edge function. Your draft is safe
                  below; sending still works once the send backend is live.
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-white/40" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Button
        onClick={() => setConfirmOpen(true)}
        disabled={errors.length > 0 || countLoading}
        className="w-full min-h-[52px] text-base font-semibold"
      >
        <Send className="h-4 w-4 mr-2" /> Review & send
      </Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Send this update?</DialogTitle>
            <DialogDescription asChild>
              <div className="text-sm space-y-2 pt-1">
                <p className="text-white/80 font-medium">"{headline.trim()}"</p>
                <p className="text-white/60">
                  This goes to{" "}
                  <span className="font-semibold text-white">
                    {recipientCount ?? "—"} active client{recipientCount === 1 ? "" : "s"}
                  </span>{" "}
                  — paying subscribers only. No trials, no comped accounts.
                </p>
                <p className="text-white/40 text-xs">
                  The backend dedupes by email and logs every send. This can't be
                  undone.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              className="flex-1 min-h-[48px]"
              disabled={sending}
            >
              Keep editing
            </Button>
            <Button
              onClick={handleSend}
              className="flex-1 min-h-[48px]"
              disabled={sending}
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending…
                </>
              ) : (
                `Send to ${recipientCount ?? "—"}`
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
