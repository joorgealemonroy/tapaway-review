import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { CONSENT_NOTICE, getConsent, onConsentChange, setConsent } from "@/lib/consent";

export function ConsentBanner() {
  const [pending, setPending] = useState(getConsent() === "pending");
  const [settings, setSettings] = useState(false);
  useEffect(() => {
    const unsubscribe = onConsentChange((state) => setPending(state === "pending"));
    const open = () => setSettings(true);
    window.addEventListener("tapaway:open-consent-settings", open);
    return () => { unsubscribe(); window.removeEventListener("tapaway:open-consent-settings", open); };
  }, []);
  const choose = (state: "accepted" | "declined") => { setConsent(state); setSettings(false); };
  const actions = <div className="mt-4 flex gap-3"><Button variant="outline" className="flex-1 min-h-11" onClick={() => choose("declined")}>Decline</Button><Button variant="outline" className="flex-1 min-h-11" onClick={() => choose("accepted")}>Accept</Button></div>;
  const links = <p className="mt-3 text-xs text-muted-foreground"><Link to="/privacy" className="underline">Privacy Policy</Link> · <Link to="/cookie-policy" className="underline">Cookie Policy</Link></p>;
  return <>
    {pending && !settings && <section aria-label="Tracking consent" className="fixed inset-x-3 bottom-3 z-[90] mx-auto max-w-md rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-xl">
      <h2 className="font-semibold">Your privacy choices</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">With permission, Meta and Trybe measure advertising and creator referrals, and TapAway remembers returning visits. Declining does not affect your cards, hub, or checkout.</p>
      <Button variant="link" className="h-auto px-0 text-sm" onClick={() => setSettings(true)}>Review cookie settings</Button>{actions}{links}
    </section>}
    <Dialog open={settings} onOpenChange={setSettings}><DialogContent className="max-h-[85dvh] overflow-y-auto"><DialogTitle>Cookie settings</DialogTitle>
      <DialogDescription>{CONSENT_NOTICE}</DialogDescription>
      <p className="text-sm text-muted-foreground">Current choice: {getConsent()}. Necessary authentication, security, and saved signup selections stay enabled. First-party tap and usage reporting continues without a returning-visitor identifier when declined.</p>
      <p className="text-sm text-muted-foreground">Declining stops new optional advertising activity. If Trybe has loaded, the page reloads to stop its SDK. Data already sent cannot be recalled here. If storage is blocked, optional tracking stays disabled.</p>
      {actions}{links}
    </DialogContent></Dialog>
  </>;
}