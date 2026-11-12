import { useEffect, useId, useState } from "react";
import { Bell, CheckCircle2, Loader2 } from "lucide-react";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useManagedHub } from "@/hooks/useManagedHub";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeUrl } from "@/lib/sanitizeUrl";
import { track } from "@/lib/analytics";

interface Props {
  profileId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedLocationId?: string;
  invalidLocation?: boolean;
  accentColor: string;
}

/** This form records permission only; subscribing never initiates a campaign. */
export function ManagedSmsOptInDrawer({ profileId, open, onOpenChange, selectedLocationId, invalidLocation, accentColor }: Props) {
  const isMobile = useIsMobile();
  const id = useId();
  const hub = useManagedHub(profileId);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [locationId, setLocationId] = useState("");
  const [restockConsent, setRestockConsent] = useState(false);
  const [orderingConsent, setOrderingConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const locations = hub.locations.filter(location => !location.is_placeholder && location.is_active);
  const program = hub.program;

  useEffect(() => {
    if (!open) return;
    setName(""); setPhone(""); setRestockConsent(false); setOrderingConsent(false);
    setWebsite(""); setError(""); setSaved(false);
    setLocationId(selectedLocationId || "");
  }, [open, selectedLocationId, profileId]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!program || hub.programError || program.signup_ready === false) {
      setError("Text signup is temporarily unavailable. Please try again shortly."); return;
    }
    if (!restockConsent && !orderingConsent) {
      setError("Choose at least one kind of text you’d like to receive."); return;
    }
    if (restockConsent && !locations.some(location => location.id === locationId)) {
      setError("Choose an available location for restock alerts."); return;
    }
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 15 || !/^[+\d\s().-]+$/.test(phone)) {
      setError("Enter a valid mobile number, including the area code."); return;
    }
    setSubmitting(true);
    try {
      const { data, error: requestError } = await supabase.functions.invoke("public-intake", { body: {
        action: "location_sms_subscribe", profileId, locationId: restockConsent ? locationId : null,
        name: name.trim(), phone: phone.trim(), website,
        restockConsent, orderingConsent, consentVersion: program.consent_version,
      } });
      if (requestError || !data?.success) {
        let message = data?.error;
        if (!message && requestError && "context" in requestError) {
          try { message = (await (requestError as any).context.json()).error; } catch { /* generic retry below */ }
        }
        void hub.refetchProgram();
        throw new Error(typeof message === "string" ? message : "We couldn’t save your choices. Please try again.");
      }
      setSaved(true); setPhone(""); setName("");
      track("lead_submit", { hubId: profileId, hubKind: "solo", props: { source: "managed_sms", location_id: restockConsent ? locationId : null, restock: restockConsent, ordering: orderingConsent } });
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Please try again.");
    } finally { setSubmitting(false); }
  }

  const title = saved ? "You’re on the list." : "Choose your AV text updates";
  const description = saved ? "Your preferences have been saved." : "Only the updates you choose. No account needed.";
  const content = saved ? <div className="space-y-4 px-4 pb-6 text-center">
    <CheckCircle2 className="mx-auto h-10 w-10" style={{ color: accentColor }} />
    <p className="text-sm text-muted-foreground">{program?.sender_ready ? "Watch for updates from " + program.brand_name + "." : "AV will send updates once text alerts are available."} You can unsubscribe at any time.</p>
    <Button className="h-12 w-full" style={{ backgroundColor: accentColor, color: "white" }} onClick={() => onOpenChange(false)}>Back to the hub</Button>
  </div> : hub.programLoading ? <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Loading text preferences…</div> : !program || hub.programError || program.signup_ready === false ? <div className="space-y-3 px-4 pb-6 text-center"><p className="text-sm text-muted-foreground">Text signup is temporarily unavailable. You can still explore AV’s menu and locations.</p><Button variant="outline" onClick={() => { void hub.refetchProgram(); }}>Try again</Button></div> : <form onSubmit={submit} className="space-y-4 px-4 pb-6">
    <input name="website" value={website} onChange={event => setWebsite(event.target.value)} tabIndex={-1} aria-hidden="true" autoComplete="off" className="absolute h-0 w-0 overflow-hidden opacity-0" />
    <div className="space-y-1.5"><Label htmlFor={`${id}-name`}>First name <span className="font-normal text-muted-foreground">(optional)</span></Label><Input id={`${id}-name`} autoComplete="given-name" maxLength={100} value={name} onChange={event => setName(event.target.value)} placeholder="Your name" className="h-11" /></div>
    <div className="space-y-1.5"><Label htmlFor={`${id}-phone`}>Mobile number</Label><Input id={`${id}-phone`} type="tel" inputMode="tel" autoComplete="tel" maxLength={25} required value={phone} onChange={event => setPhone(event.target.value)} placeholder="(661) 555-0123" className="h-12 text-base" /></div>
    <fieldset className="space-y-3"><legend className="mb-2 text-sm font-semibold">Which updates would you like?</legend>
      <div className="rounded-xl border border-border p-3">
        <label className={`flex items-start gap-3 ${locations.length === 0 ? "opacity-60" : "cursor-pointer"}`}>
          <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 rounded" style={{ accentColor }} checked={restockConsent} disabled={locations.length === 0 || invalidLocation} onChange={event => setRestockConsent(event.target.checked)} />
          <span><span className="block text-sm font-semibold">Restock alerts for my location</span><span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{program.restock_consent_text}</span></span>
        </label>
        {locations.length > 0 && !invalidLocation ? <div className="mt-3 space-y-1.5"><Label htmlFor={`${id}-location`} className="text-xs">Your location</Label><select id={`${id}-location`} value={locations.some(location => location.id === locationId) ? locationId : ""} onChange={event => setLocationId(event.target.value)} className="flex min-h-11 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground" required={restockConsent}><option value="">Choose a location</option>{locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}</select></div> : <p className="mt-2 text-xs text-muted-foreground">{invalidLocation ? "Open an available location to choose its restock alerts." : "Restock alerts will open as locations are confirmed."}</p>}
      </div>
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3"><input type="checkbox" className="mt-1 h-5 w-5 shrink-0 rounded" style={{ accentColor }} checked={orderingConsent} onChange={event => setOrderingConsent(event.target.checked)} /><span><span className="block text-sm font-semibold">Weekly ordering reminders</span><span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{program.ordering_consent_text}</span></span></label>
    </fieldset>
    <p className="text-xs leading-relaxed text-muted-foreground">Consent is optional and isn’t required to purchase. <a className="underline underline-offset-2" href={sanitizeUrl(program.terms_url || "")} target="_blank" rel="noopener noreferrer">SMS terms</a> · <a className="underline underline-offset-2" href={sanitizeUrl(program.privacy_url || "")} target="_blank" rel="noopener noreferrer">Privacy</a></p>
    {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    <Button type="submit" disabled={submitting || (!restockConsent && !orderingConsent)} className="h-12 w-full text-base" style={{ backgroundColor: accentColor, color: "white" }}>{submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : "Save my text preferences"}</Button>
  </form>;

  const mark = <Bell className="mx-auto mb-2 h-6 w-6" style={{ color: accentColor }} />;
  if (isMobile) return <Drawer open={open} onOpenChange={value => { if (!submitting) onOpenChange(value); }}><DrawerContent className="max-h-[90dvh]"><div className="overflow-y-auto overscroll-contain"><DrawerHeader className="text-center">{mark}<DrawerTitle>{title}</DrawerTitle><DrawerDescription>{description}</DrawerDescription></DrawerHeader>{content}</div></DrawerContent></Drawer>;
  return <Dialog open={open} onOpenChange={value => { if (!submitting) onOpenChange(value); }}><DialogContent className="max-h-[88vh] max-w-md overflow-y-auto"><DialogHeader className="text-center">{mark}<DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>{content}</DialogContent></Dialog>;
}
