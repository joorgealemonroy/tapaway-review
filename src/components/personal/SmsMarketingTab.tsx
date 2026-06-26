import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
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
import { MessageSquare, Users, Send, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const MAX_LEN = 160;

interface Campaign {
  id: string;
  message: string;
  recipient_count: number;
  success_count: number;
  failure_count: number;
  created_at: string;
}

interface Props {
  profileId: string;
}

const SmsMarketingTab = ({ profileId }: Props) => {
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const captures: any = supabase.from("personal_email_captures" as any);
    const campaignsTable: any = supabase.from("sms_campaigns" as any);
    const [countRes, campaignsRes] = await Promise.all([
      captures
        .select("id", { count: "exact", head: true })
        .eq("profile_id", profileId)
        .eq("sms_opt_in", true)
        .not("phone", "is", null),
      campaignsTable
        .select("*")
        .eq("profile_id", profileId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
    setSubscriberCount(countRes.count ?? 0);
    if (!campaignsRes.error && campaignsRes.data) {
      setCampaigns(campaignsRes.data as Campaign[]);
    }
    setLoading(false);
  }, [profileId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSend = async () => {
    setConfirmOpen(false);
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-mass-sms", {
        body: { profile_id: profileId, message: message.trim() },
      });
      if (error) throw error;
      const result = data as { recipient_count: number; success_count: number; failure_count: number };
      toast.success(
        `Sent to ${result.success_count} of ${result.recipient_count} subscribers${
          result.failure_count > 0 ? ` (${result.failure_count} failed)` : ""
        }`,
      );
      setMessage("");
      load();
    } catch (err: any) {
      console.error("send-mass-sms error", err);
      toast.error(err?.message || "Failed to send messages.");
    } finally {
      setSending(false);
    }
  };

  const canSend =
    !sending &&
    message.trim().length > 0 &&
    message.length <= MAX_LEN &&
    (subscriberCount ?? 0) > 0;

  const SENDING_LOCKED = false;

  return (
    <div className="space-y-6">
      {/* Pending carrier approval banner */}
      <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800/60 p-4 text-sm text-amber-900 dark:text-amber-200">
        🚧 SMS Marketing is currently pending carrier approval. Mass texting will be unlocked in a few days!
      </div>

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

      {/* Composer */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Compose mass text</h3>
        </div>
        <Textarea
          placeholder="Hey! Quick update from us…"
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, MAX_LEN))}
          maxLength={MAX_LEN}
          rows={4}
          disabled={sending || SENDING_LOCKED}
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>"Reply STOP to opt out." will be appended automatically.</span>
          <span className={message.length >= MAX_LEN ? "text-destructive font-medium" : ""}>
            {message.length}/{MAX_LEN}
          </span>
        </div>
        <Button
          onClick={() => setConfirmOpen(true)}
          disabled={SENDING_LOCKED || !canSend}
          className="w-full"
          size="lg"
        >
          {SENDING_LOCKED ? (
            "Coming Soon"
          ) : sending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending…
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" /> Send Mass Text
            </>
          )}
        </Button>
        {!SENDING_LOCKED && (subscriberCount ?? 0) === 0 && !loading && (
          <p className="text-xs text-muted-foreground text-center">
            No SMS subscribers yet. Visitors who opt in via your contact form will appear here.
          </p>
        )}
      </Card>

      {/* Recent campaigns */}
      {campaigns.length > 0 && (
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Recent campaigns</h3>
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
                  <span className="flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {c.success_count}
                  </span>
                  {c.failure_count > 0 && (
                    <span className="flex items-center gap-1 text-destructive">
                      <XCircle className="h-3.5 w-3.5" /> {c.failure_count}
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
              This will send your message to every visitor who opted in to SMS marketing on your profile.
              You can&apos;t undo a send.
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

export default SmsMarketingTab;
