import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import SmsTemplateGallery from "@/components/dashboard/SmsTemplateGallery";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MessageSquare, Users, Send, Loader2, Check, XCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const MAX_LEN = 160;
/** Same review-request signal the server uses — any mention of reviews. */
const REVIEW_RE = /\breviews?\b/i;

interface Campaign {
  id: string;
  message: string;
  recipient_count: number;
  success_count: number;
  failure_count: number;
  created_at: string;
}

interface Props {
  restaurantId: string;
  /** Optional — fetched from restaurants when not provided. */
  businessName?: string;
  /** Optional — built from the restaurant custom_slug when not provided. */
  hubLink?: string;
}

const RestaurantSmsMarketingTab = ({ restaurantId, businessName, hubLink }: Props) => {
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvedName, setResolvedName] = useState("");
  const [resolvedLink, setResolvedLink] = useState("");
  const composerRef = useRef<HTMLDivElement>(null);
  // Which template the composer text came from (null = typed freehand).
  const [usedTemplateId, setUsedTemplateId] = useState<string | null>(null);
  // How many of this business's subscribers already got a review request.
  const [alreadySentCount, setAlreadySentCount] = useState<number | null>(null);

  // Review-request intent: owner used the review template, or the message
  // mentions reviews (matches the server-side dedup detection).
  const reviewIntent = usedTemplateId === "review-request" || REVIEW_RE.test(message);

  // Load the dedup state whenever a review request is being composed.
  useEffect(() => {
    if (!reviewIntent) {
      setAlreadySentCount(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { count } = await (supabase.from("review_request_sends" as any) as any)
        .select("id", { count: "exact", head: true })
        .eq("restaurant_id", restaurantId);
      if (!cancelled) setAlreadySentCount(count ?? 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [reviewIntent, restaurantId]);

  const load = useCallback(async () => {
    setLoading(true);
    const subs: any = supabase.from("restaurant_sms_subscribers" as any);
    const camps: any = supabase.from("restaurant_sms_campaigns" as any);
    const [countRes, campaignsRes] = await Promise.all([
      subs
        .select("id", { count: "exact", head: true })
        .eq("restaurant_id", restaurantId)
        .eq("sms_opt_in", true)
        .not("phone", "is", null),
      camps
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
    setSubscriberCount(countRes.count ?? 0);
    if (!campaignsRes.error && campaignsRes.data) {
      setCampaigns(campaignsRes.data as Campaign[]);
    }
    // Resolve template placeholders: props win, otherwise the restaurant row.
    if (businessName && hubLink) {
      setResolvedName(businessName);
      setResolvedLink(hubLink);
    } else {
      const { data: restaurant } = await supabase
        .from("restaurants" as any)
        .select("restaurant_name, custom_slug")
        .eq("id", restaurantId)
        .maybeSingle();
      const r: any = restaurant;
      setResolvedName(
        businessName || (r?.restaurant_name && String(r.restaurant_name).trim()) || "us",
      );
      setResolvedLink(
        hubLink ||
          (r?.custom_slug
            ? tapawayUrl(`/${r.custom_slug}`)
            : tapawayUrl(`/hub/${restaurantId}`)),
      );
    }
    setLoading(false);
  }, [restaurantId, businessName, hubLink]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSend = async () => {
    setConfirmOpen(false);
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-mass-sms", {
        body: {
          restaurant_id: restaurantId,
          message: message.trim(),
          // Flags the review-request template so the server enforces
          // once-per-customer dedup even if the owner edited the wording.
          review_request: usedTemplateId === "review-request",
        },
      });
      if (error) throw error;
      const result = data as {
        recipient_count: number;
        success_count: number;
        failure_count: number;
        skipped_duplicates?: number;
      };
      toast.success(
        `Sent to ${result.success_count} of ${result.recipient_count} subscribers${
          result.failure_count > 0 ? ` (${result.failure_count} failed)` : ""
        }${
          (result.skipped_duplicates ?? 0) > 0
            ? ` — ${result.skipped_duplicates} skipped (already got a review request)`
            : ""
        }`,
      );
      setMessage("");
      setUsedTemplateId(null);
      load();
    } catch (err: any) {
      console.error("send-mass-sms error", err);
      toast.error(err?.message || "Failed to send messages.");
    } finally {
      setSending(false);
    }
  };

  // Loads a template into the composer — the owner edits it before the
  // existing confirm flow; nothing about send is automatic.
  const handleUseTemplate = useCallback((filled: string, templateId: string) => {
    setMessage(filled.slice(0, MAX_LEN));
    setUsedTemplateId(templateId);
    requestAnimationFrame(() => {
      composerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const canSend =
    !sending &&
    message.trim().length > 0 &&
    message.length <= MAX_LEN &&
    (subscriberCount ?? 0) > 0;

  return (
    <div className="space-y-6">


      {/* Audience */}
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total SMS Subscribers</p>
            <p className="text-3xl font-bold">
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : subscriberCount ?? 0}
            </p>
          </div>
        </div>
      </Card>

      {/* Template gallery — loads a pre-written message into the composer */}
      <SmsTemplateGallery
        businessName={resolvedName || "us"}
        hubLink={resolvedLink}
        onUse={handleUseTemplate}
      />

      {/* Composer */}
      <Card ref={composerRef} className="p-4 sm:p-6 space-y-4 scroll-mt-4">
        <div className="flex flex-wrap items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary shrink-0" />
          <h3 className="font-semibold">Compose mass text</h3>
        </div>
        <Textarea
          placeholder="Hey! Quick update from us…"
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, MAX_LEN))}
          maxLength={MAX_LEN}
          rows={4}
          disabled={sending}
        />
        <div className="flex flex-wrap items-center justify-between gap-1 text-xs text-muted-foreground">
          <span>"Reply STOP to opt out." will be appended automatically.</span>
          <span className={message.length >= MAX_LEN ? "text-destructive font-medium" : ""}>
            {message.length}/{MAX_LEN}
          </span>
        </div>
        {reviewIntent && (
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs">
            <span className="font-medium">Review request — sent once per customer, ever.</span>{" "}
            {alreadySentCount === null ? (
              <span className="text-muted-foreground">Checking who&apos;s already gotten one…</span>
            ) : alreadySentCount > 0 ? (
              <span className="text-muted-foreground">
                {alreadySentCount} of your {subscriberCount ?? 0} subscribers already got one and
                will be skipped — no repeat texts.
              </span>
            ) : (
              <span className="text-muted-foreground">
                None of your subscribers have gotten one yet.
              </span>
            )}
          </div>
        )}
        <Button
          onClick={() => setConfirmOpen(true)}
          disabled={!canSend}
          className="w-full"
          size="lg"
        >
          {sending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending…
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" /> Send Mass Text
            </>
          )}
        </Button>
        {(subscriberCount ?? 0) === 0 && !loading && (
          <p className="text-xs text-muted-foreground text-center">
            Start collecting subscribers when customers tap your TapAway cards!
          </p>
        )}

      </Card>

      {/* Recent campaigns */}
      {campaigns.length > 0 && (
        <Card className="p-6">
          <h3 className="font-semibold">Recent campaigns</h3>
          <p className="text-[11px] text-muted-foreground mt-1 mb-4">
            &ldquo;Sent&rdquo; means accepted by the carrier — delivery isn&rsquo;t tracked.
          </p>
          <div className="space-y-3">
            {campaigns.map((c) => (
              <div key={c.id} className="flex items-start justify-between gap-3 pb-3 border-b last:border-b-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="text-sm truncate">{c.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(c.created_at), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs whitespace-nowrap">
                  <span
                    className="flex items-center gap-1 text-muted-foreground"
                    title="Accepted by carrier — delivery not tracked"
                  >
                    <Check className="h-3.5 w-3.5" /> {c.success_count} sent
                  </span>
                  {c.failure_count > 0 && (
                    <span
                      className="flex items-center gap-1 text-destructive"
                      title="Rejected by the carrier"
                    >
                      <XCircle className="h-3.5 w-3.5" /> {c.failure_count} failed
                    </span>
                  )}
                  <span className="text-muted-foreground">/ {c.recipient_count}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send to {subscriberCount ?? 0} subscribers?</AlertDialogTitle>
            <AlertDialogDescription>
              This will send your message to every customer who opted in to SMS marketing on your review hub.
              You can&apos;t undo a send.
              {reviewIntent && (alreadySentCount ?? 0) > 0 && (
                <>
                  {" "}
                  {alreadySentCount} of them already got a review request and will be skipped — each
                  customer only gets one, ever.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSend}>Send now</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RestaurantSmsMarketingTab;
