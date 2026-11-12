import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, CheckCircle2, Clock3, FileText, Loader2, MessageSquare, Save, Send, ShoppingBag, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProfileLocation, ProfileSmsDashboard, profileLocationUrl } from "@/lib/profileLocations";

interface Props { profileId: string; username: string; businessName?: string; }
const MAX_LEN = 160;
type CampaignType = "restock" | "ordering";

export default function LocationSmsMarketingTab({ profileId, username, businessName }: Props) {
  const [dashboard, setDashboard] = useState<ProfileSmsDashboard | null>(null);
  const [locations, setLocations] = useState<ProfileLocation[]>([]);
  const [campaignType, setCampaignType] = useState<CampaignType>("restock");
  const [locationId, setLocationId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [restockConfirmed, setRestockConfirmed] = useState(false);
  const [sending, setSending] = useState(false);
  const requestId = useRef(0);
  const draftKey = `tapaway_location_sms_draft_${profileId}`;

  const load = useCallback(async () => {
    const request = ++requestId.current;
    setLoading(true); setError(null);
    try {
      const [programResult, locationsResult] = await Promise.all([
        (supabase.rpc as any)("get_profile_sms_dashboard", { p_profile_id: profileId }),
        (supabase.from("profile_locations" as any) as any).select("*").eq("profile_id", profileId).eq("is_active", true).order("sort_order"),
      ]);
      if (programResult.error || locationsResult.error) throw programResult.error || locationsResult.error;
      if (!programResult.data?.program || !programResult.data?.audience || !Array.isArray(programResult.data?.locations) || !Array.isArray(programResult.data?.campaigns)) {
        throw new Error("Text messaging setup is unavailable.");
      }
      if (request !== requestId.current) return;
      setDashboard(programResult.data);
      setLocations(locationsResult.data ?? []);
      setLocationId(current => locationsResult.data?.some((location: ProfileLocation) => location.id === current)
        ? current : locationsResult.data?.find((location: ProfileLocation) => !location.is_placeholder)?.id || locationsResult.data?.[0]?.id || "");
    } catch { if (request === requestId.current) setError("Couldn't load your text messaging dashboard. Please try again."); }
    finally { if (request === requestId.current) setLoading(false); }
  }, [profileId]);

  useEffect(() => { void load(); return () => { requestId.current += 1; }; }, [load]);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(draftKey) || "null");
      if (saved && typeof saved.message === "string") {
        setMessage(saved.message.slice(0, MAX_LEN));
        setCampaignType(saved.campaignType === "ordering" ? "ordering" : "restock");
        if (typeof saved.locationId === "string") setLocationId(saved.locationId);
      }
    } catch { /* A local draft is optional. */ }
  }, [draftKey]);

  const selected = locations.find(location => location.id === locationId);
  const audienceCount = dashboard && !error ? (campaignType === "ordering" ? dashboard.audience.ordering
    : dashboard.locations.find(location => location.id === locationId)?.subscriber_count ?? 0) : null;
  const brand = dashboard?.program.brand_name || businessName || "Your business";
  const senderReady = !error && dashboard?.program.sender_ready === true;
  const targetReady = campaignType === "ordering" || !!selected && !selected.is_placeholder && selected.is_active;
  const canSend = senderReady && targetReady && audienceCount > 0 && message.trim().length > 0 && message.length <= MAX_LEN && !sending && !loading && !error;
  const previewText = `${brand}: ${message.trim()}\nReply STOP to opt out.`;

  const useTemplate = () => {
    const template = campaignType === "restock"
      ? `Fresh meals just arrived at ${selected?.name || "[Store name]"}. Stop by while supplies last! ${profileLocationUrl(username, selected?.id)}`
      : `Get next week's meals handled. Browse the menu and order for pickup or delivery: ${profileLocationUrl(username)}`;
    if (template.length > MAX_LEN) {
      setMessage(campaignType === "restock"
        ? `Fresh meals are here! Your fridge has been restocked. ${profileLocationUrl(username, selected?.id)}`.slice(0, MAX_LEN)
        : template.slice(0, MAX_LEN));
    } else setMessage(template);
  };

  const saveDraft = () => {
    try { localStorage.setItem(draftKey, JSON.stringify({ message, campaignType, locationId })); toast.success("Draft saved on this device"); }
    catch { toast.error("Couldn't save the draft on this device."); }
  };

  const send = async () => {
    if (!canSend || campaignType === "restock" && !restockConfirmed) return;
    setSending(true);
    try {
      const { data, error: sendError } = await supabase.functions.invoke("send-mass-sms", { body: {
        profile_id: profileId, message: message.trim(), campaign_type: campaignType,
        location_id: campaignType === "restock" ? locationId : null,
        confirmed_restock: campaignType === "restock" && restockConfirmed,
      } });
      if (sendError || data?.error) {
        let detail = data?.error;
        if (sendError && !detail) {
          try { detail = (await (sendError as any).context?.json())?.error; } catch { /* Use a neutral fallback. */ }
        }
        throw new Error(detail || "The message couldn't be sent. Please try again.");
      }
      if (typeof data?.success_count !== "number" || typeof data?.recipient_count !== "number") throw new Error("We couldn't confirm the send result. Refresh campaign history before trying again.");
      const count = Number(data.success_count);
      const failed = Number(data?.failure_count ?? 0);
      toast.success(`${count} text${count === 1 ? "" : "s"} submitted${failed ? `; ${failed} could not be submitted` : ""}.`);
      setPreviewOpen(false); setMessage(""); setRestockConfirmed(false);
      try { localStorage.removeItem(draftKey); } catch { /* Draft cleanup is optional. */ }
      await load();
    } catch (failure) { toast.error(failure instanceof Error ? failure.message : "Couldn't send the text."); }
    finally { setSending(false); }
  };

  return <div className="space-y-5">
    {error && <Card className="p-4 space-y-3" role="alert"><p className="text-sm">{error}</p><Button variant="outline" onClick={() => void load()}>Retry</Button></Card>}
    <Card className="p-4 sm:p-5">
      <div className="flex items-start gap-3">{senderReady ? <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" /> : <Clock3 className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />}<div><h2 className="font-semibold">{loading ? "Checking text messaging…" : senderReady ? "Text messaging is ready" : dashboard?.program.sender_status === "paused" ? "Text messaging is paused" : "Text messaging setup pending"}</h2><p className="mt-1 text-sm text-muted-foreground">{senderReady ? "Send useful updates to customers who chose to hear from your business." : "You can prepare and preview messages now. Sending becomes available once your business's messaging setup is approved."}</p></div></div>
      <div className="mt-4 flex items-center gap-2 text-sm"><Users className="h-4 w-4 text-muted-foreground" /><span>{loading ? "Loading subscribers…" : error || !dashboard ? "Subscriber count unavailable" : `${dashboard.audience.total} subscribed customers`}</span></div>
      {dashboard?.program.frequency_text && <p className="mt-2 text-xs text-muted-foreground">Your signup promise: {dashboard.program.frequency_text}</p>}
    </Card>
    <Card className="p-4 sm:p-5 space-y-4">
      <div><h2 className="font-semibold text-lg">Prepare a text</h2><p className="text-sm text-muted-foreground">Choose the audience, personalize the message, then preview it.</p></div>
      <div className="space-y-2"><Label htmlFor="location-sms-type">Message purpose</Label><Select value={campaignType} onValueChange={value => { setCampaignType(value as CampaignType); setRestockConfirmed(false); }} disabled={sending}><SelectTrigger id="location-sms-type" className="h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="restock">Fridge restock alert</SelectItem><SelectItem value="ordering">Weekly ordering reminder</SelectItem></SelectContent></Select></div>
      {campaignType === "restock" && <div className="space-y-2"><Label htmlFor="location-sms-location">Fridge location</Label><Select value={locationId} onValueChange={value => { setLocationId(value); setRestockConfirmed(false); }} disabled={sending || locations.length === 0}><SelectTrigger id="location-sms-location" className="h-11"><SelectValue placeholder="Add a location first" /></SelectTrigger><SelectContent>{locations.map(location => <SelectItem key={location.id} value={location.id}>{location.name}{location.is_placeholder ? " (placeholder)" : ""}</SelectItem>)}</SelectContent></Select>{selected?.is_placeholder && <p className="text-xs text-muted-foreground">Set up the real store in Locations before collecting or sending restock alerts.</p>}</div>}
      <div className="flex items-center gap-2 rounded-lg bg-muted p-3 text-sm">{campaignType === "restock" ? <Bell className="h-4 w-4 shrink-0" /> : <ShoppingBag className="h-4 w-4 shrink-0" />}<span>{loading ? "Loading audience…" : audienceCount === null ? "Audience count unavailable" : `${audienceCount} customer${audienceCount === 1 ? "" : "s"} subscribed to ${campaignType === "ordering" ? "ordering reminders" : "this location's restock alerts"}`}</span></div>
      <Button type="button" variant="outline" onClick={useTemplate} disabled={sending}><FileText className="mr-2 h-4 w-4" />Use {campaignType === "restock" ? "restock" : "ordering"} draft</Button>
      <div className="space-y-2"><Label htmlFor="location-sms-message">Your message</Label><Textarea id="location-sms-message" value={message} onChange={event => setMessage(event.target.value.slice(0, MAX_LEN))} maxLength={MAX_LEN} rows={4} placeholder="Start with a draft or write your own update…" disabled={sending} /><div className="flex justify-between gap-3 text-xs text-muted-foreground"><span>Your business name and STOP instructions are added automatically.</span><span className="shrink-0">{message.length}/{MAX_LEN}</span></div></div>
      <div className="flex flex-wrap gap-2"><Button onClick={() => { setRestockConfirmed(false); setPreviewOpen(true); }} disabled={!message.trim() || sending}><MessageSquare className="mr-2 h-4 w-4" />Preview text</Button><Button variant="outline" onClick={saveDraft} disabled={!message.trim() || sending}><Save className="mr-2 h-4 w-4" />Save draft</Button></div>
      <p className="text-xs text-muted-foreground">Messages are sent only after you review and confirm them. Drafts are saved on this device.</p>
    </Card>
    <Card className="p-4 sm:p-5 space-y-4"><h2 className="font-semibold">Recent campaigns</h2>{loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : error || !dashboard ? <p className="text-sm text-muted-foreground">Campaign history is unavailable.</p> : dashboard.campaigns.length ? <div className="divide-y">{dashboard.campaigns.map(campaign => <div key={campaign.id} className="py-3 first:pt-0 space-y-2"><div className="flex flex-wrap justify-between gap-1 text-xs text-muted-foreground"><span>{campaign.campaign_type === "ordering" ? "Ordering reminder" : dashboard.locations.find(location => location.id === campaign.location_id)?.name || "Restock alert"}</span><span>{new Date(campaign.created_at).toLocaleString()}</span></div><p className="text-sm whitespace-pre-wrap break-words">{campaign.message}</p><p className="text-xs text-muted-foreground">{campaign.success_count} submitted · {campaign.failure_count} failed</p></div>)}</div> : <p className="text-sm text-muted-foreground">Your first campaign will appear here after you send it.</p>}<p className="text-xs text-muted-foreground">Submission counts do not confirm message delivery or meal purchases.</p></Card>
    <Dialog open={previewOpen} onOpenChange={open => { if (!sending) setPreviewOpen(open); }}><DialogContent className="w-[calc(100%_-_2rem)] sm:max-w-md"><DialogHeader><DialogTitle>Review your text</DialogTitle><DialogDescription>{campaignType === "restock" ? selected?.name || "Choose a location" : "Customers who chose ordering reminders"} · {audienceCount === null ? "Audience unavailable" : `${audienceCount} subscribed`}</DialogDescription></DialogHeader><div className="rounded-2xl bg-muted p-4 text-sm whitespace-pre-wrap break-words">{previewText}</div>
      {campaignType === "restock" && <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={restockConfirmed} onChange={event => setRestockConfirmed(event.target.checked)} disabled={sending} className="mt-1 h-4 w-4 shrink-0" /><span>I confirm this fridge has been restocked and the message is accurate.</span></label>}
      {!senderReady && <p className="text-sm text-muted-foreground">This is a preview. Sending is unavailable until your messaging setup is approved.</p>}
      {senderReady && audienceCount === 0 && <p className="text-sm text-muted-foreground">This audience has no subscribers yet.</p>}
      <DialogFooter><Button variant="outline" disabled={sending} onClick={() => setPreviewOpen(false)}>Keep editing</Button><Button disabled={!canSend || campaignType === "restock" && !restockConfirmed} onClick={() => void send()}>{sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Send text</Button></DialogFooter>
    </DialogContent></Dialog>
  </div>;
}
