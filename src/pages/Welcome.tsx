import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Check, Circle, Loader2, Mail, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GooglePlacesAutocomplete } from "@/components/GooglePlacesAutocomplete";
import { callFunction } from "@/lib/paymentFirst";
import { track } from "@/lib/analytics";
import { getOnboardingData } from "@/lib/onboardingData";
import { Brand } from "@/components/landing/LandingNav";
import "@/components/landing/storefront.css";
import { verifyTokenHash } from "@/lib/authGuard";

type Address = { name?: string | null; line1?: string | null; line2?: string | null; city?: string | null; state?: string | null; postal_code?: string | null };
type OnboardingState = {
  session: null | { step: "business" | "logo" | "shipping" | "done"; business_name: string | null; business_address: string | null; shipping_address: Address | null; logo_url: string | null };
  needsReview?: boolean;
};
type Phase = "loading" | "verify_email" | "sign_in" | "processing" | "flow" | "error" | "recover";

const shell = "checkout-surface min-h-screen bg-hero text-hero-foreground";

export default function Welcome() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = params.get("session_id");
  const [phase, setPhase] = useState<Phase>("loading");
  const [emailHint, setEmailHint] = useState<string | null>(null);
  const [state, setState] = useState<OnboardingState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tracked = useRef(false);
  const [retryAttempt, setRetryAttempt] = useState(0);

  const token = async () => (await supabase.auth.getSession()).data.session?.access_token;

  const refresh = useCallback(async (body: Record<string, unknown> = { action: "state" }) => {
    try {
      const t = await token();
      if (!t) { setPhase("sign_in"); return null; }
      const { ok, data } = await callFunction<OnboardingState & { error?: string }>("payment-first-onboarding", body, t);
      if (!ok) throw new Error(data.error || "We couldn't save that. Please try again.");
      setError(null);
      setState(data);
      setPhase(data.session ? "flow" : "processing");
      return data;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection lost. Please try again.");
      setPhase(current => current === "flow" ? current : "recover");
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setPhase("loading");
    (async () => {
      const existing = await token();
      if (!sessionId) { if (existing) await refresh(); else setPhase("sign_in"); return; }
      for (let attempt = 0; attempt < 6 && !cancelled; attempt++) {
        const { ok, data } = await callFunction<{ status?: string; token_hash?: string; emailHint?: string }>("payment-first-welcome", { session_id: sessionId });
        if (cancelled) return;
        if (!ok) { setPhase("recover"); return; }
        if (data.emailHint) setEmailHint(data.emailHint);
        if (!tracked.current && ["ready", "verify_email", "sign_in"].includes(data.status || "")) { tracked.current = true; track("purchase_completed", { hubKind: "site" }); }
        if (data.status === "ready" && data.token_hash) {
          const { error: e } = await verifyTokenHash(data.token_hash, "email");
          if (!e) { await refresh(); return; }
          console.warn("welcome sign-in failed", e.message);
          setPhase("sign_in"); return;
        }
        if (data.status === "verify_email") { setPhase("verify_email"); return; }
        if (data.status === "sign_in") { if (existing) await refresh(); else setPhase("sign_in"); return; }
        if (data.status === "not_paid") { track("purchase_failed", { hubKind: "site" }); setPhase("error"); return; }
        await new Promise((r) => setTimeout(r, 2000));
      }
      if (!cancelled) setPhase("processing");
    })().catch(() => { if (!cancelled) setPhase("recover"); });
    return () => { cancelled = true; };
  }, [sessionId, refresh, retryAttempt]);

  const step = state?.session?.step;
  const searchTracked = useRef(false);
  useEffect(() => { if (step === "business" && !searchTracked.current) { searchTracked.current = true; track("business_search_started", { hubKind: "site" }); } }, [step]);

  return (
    <div className={shell}>
      <Helmet><title>Finish setting up your TapAway</title><meta name="robots" content="noindex" /></Helmet>
      <main className="mx-auto max-w-md px-4 py-10">
        <div className="mb-8 flex items-center justify-between"><Brand /><Link to="/support#question" className="text-xs underline">Need help?</Link></div>
        {phase === "loading" && <Centered><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="mt-4 text-hero-foreground/70">Confirming your order…</p></Centered>}
        {phase === "processing" && <Centered><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="mt-4 text-hero-foreground/70">Your order is still being confirmed. This can take a minute. If you completed checkout, check your email for a setup link. You do not need to place another order.</p></Centered>}
        {(phase === "processing" || phase === "recover") && <div className="mt-6 space-y-4">{phase === "recover" && <><h1 className="text-2xl font-bold">Let's reconnect to your order.</h1><p className="text-sm text-muted-foreground">We couldn't confirm your order right now. If you completed checkout, don't pay again. Retry here or open the setup link in your email.</p></>}<Button className="w-full h-12" onClick={() => setRetryAttempt(n => n + 1)}>Check my order again</Button><Link className="block text-center text-sm underline" to="/support#question">Get help with my order</Link></div>}
        {phase === "error" && <Centered><h1 className="text-2xl font-bold">Checkout not completed</h1><p className="mt-3 text-hero-foreground/70">Your checkout was not completed. You can return to your order and try again.</p><Button asChild className="mt-6 h-12 w-full"><Link to="/onboarding?flow=payment_first">Try again</Link></Button></Centered>}
        {phase === "verify_email" && <Centered><Mail className="h-10 w-10 text-primary" /><h1 className="mt-4 text-2xl font-bold">Check your email to continue</h1><p className="mt-3 text-hero-foreground/70">Your payment went through. You already have a TapAway account{emailHint ? ` at ${emailHint}` : ""}, so we sent a link to confirm it's you. Open it to attach this order and finish setup.</p></Centered>}
        {phase === "sign_in" && <SignIn emailHint={emailHint} />}
        {phase === "flow" && step === "business" && <BusinessStep busy={busy} error={error} onSubmit={async (b) => { setBusy(true); const r = await refresh({ action: "business", ...b }); setBusy(false); if (r) track(b.notFound ? "business_not_found" : "business_selected", { hubKind: "site" }); }} />}
        {phase === "flow" && step === "logo" && <LogoStep busy={busy} error={error} onSubmit={async (logoUrl) => { setBusy(true); const r = await refresh({ action: "logo", logoUrl }); setBusy(false); if (r) track(logoUrl ? "logo_uploaded" : "logo_skipped", { hubKind: "site" }); }} />}
        {phase === "flow" && step === "shipping" && <ShippingStep current={state?.session?.shipping_address ?? null} busy={busy} error={error} onSubmit={async (address) => { setBusy(true); const r = await refresh({ action: "shipping", address }); setBusy(false); if (r) { track("shipping_confirmed", { hubKind: "site" }); track("onboarding_completed", { hubKind: "site" }); } }} />}
        {phase === "flow" && step === "done" && <DoneStep hasLogo={!!state?.session?.logo_url} onDashboard={() => { track("dashboard_opened", { hubKind: "site" }); navigate("/dashboard"); }} />}
      </main>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col items-center text-center">{children}</div>;
}

function SignIn({ emailHint }: { emailHint: string | null }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Continue your TapAway setup</h1>
      <p className="text-hero-foreground/70">{sent ? "If there's an order for that email, a sign-in link is on its way." : `Enter the email you used at checkout${emailHint ? ` (${emailHint})` : ""} and we'll send you a sign-in link. No password needed.`}</p>
      {!sent && (
        <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); setBusy(true); setError(null); try { const result = await callFunction("payment-first-welcome", { action: "send_link", email }); if (!result.ok) throw new Error(); setSent(true); } catch { setError("We couldn’t send the link. Please try again or contact support."); } finally { setBusy(false); } }}>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Label htmlFor="welcome-email">Email</Label>
          <Input id="welcome-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12" />
          <Button type="submit" className="h-12 w-full" disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Email me a sign-in link"}</Button>
        </form>
      )}
    </div>
  );
}

function BusinessStep({ busy, error, onSubmit }: { busy: boolean; error: string | null; onSubmit: (b: Record<string, unknown>) => void }) {
  const [place, setPlace] = useState<{ placeId: string; name: string; address: string } | null>(null);
  const personal = getOnboardingData().audience === "personal";
  const [notFound, setNotFound] = useState(personal);
  const [name, setName] = useState(""); const [city, setCity] = useState(""); const [link, setLink] = useState("");
  if (notFound) return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSubmit({ notFound: true, businessName: name, city, link }); }}>
      <h1 className="text-2xl font-bold">{personal ? "Tell us about you." : "Tell us about your business."}</h1>
      <p className="text-hero-foreground/70">Add your name or brand and a link to help us get your hub started. You can share design ideas with our team.</p>
      <div className="space-y-2"><Label htmlFor="nf-name">Your name or business name</Label><Input id="nf-name" required value={name} onChange={(e) => setName(e.target.value)} className="h-12" /></div>
      <div className="space-y-2"><Label htmlFor="nf-city">City</Label><Input id="nf-city" required value={city} onChange={(e) => setCity(e.target.value)} className="h-12" /></div>
      <div className="space-y-2"><Label htmlFor="nf-link">Website or Instagram (optional)</Label><Input id="nf-link" value={link} onChange={(e) => setLink(e.target.value)} className="h-12" /></div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="h-12 w-full" disabled={busy}>Continue</Button>
      <button type="button" className="min-h-11 w-full text-sm text-hero-foreground/70 underline" onClick={() => setNotFound(false)}>Search Google again</button>
    </form>
  );
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Now, which business is yours?</h1>
      {!place ? (
        <GooglePlacesAutocomplete label="Search your business name" placeholder="Search your business name" onPlaceSelected={(p) => setPlace({ placeId: p.placeId, name: p.name, address: p.address })} />
      ) : (
        <div className="rounded-2xl border border-hero-foreground/15 bg-hero-foreground/[0.05] p-5">
          <p className="text-lg font-bold">{place.name}</p>
          <p className="mt-1 text-sm text-hero-foreground/70">{place.address}</p>
          <Button className="mt-4 h-12 w-full" disabled={busy} onClick={() => onSubmit({ placeId: place.placeId, businessName: place.name, address: place.address })}>Yes, that's my business</Button>
          <button type="button" className="mt-2 min-h-11 w-full text-sm text-hero-foreground/70 underline" onClick={() => setPlace(null)}>Not it? Search again</button>
        </div>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <button type="button" className="min-h-11 w-full rounded-full border border-hero-foreground/20 text-sm" onClick={() => setNotFound(true)}>Not on Google, or setting up a personal brand?</button>
    </div>
  );
}

function LogoStep({ busy, error, onSubmit }: { busy: boolean; error: string | null; onSubmit: (url: string) => void }) {
  const personal = getOnboardingData().audience === "personal";
  const [preview, setPreview] = useState<string | null>(null);
  const [url, setUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [upErr, setUpErr] = useState<string | null>(null);
  const upload = async (file: File) => {
    if (!file.type.startsWith("image/") || file.size > 20 * 1024 * 1024) { setUpErr("Choose an image up to 20MB."); return; }
    setUploading(true); setUpErr(null);
    const { data: u } = await supabase.auth.getUser();
    const path = `${u.user?.id}/logo-${Date.now()}.${file.name.split(".").pop() || "png"}`;
    const { error: e } = await supabase.storage.from("restaurant-logos").upload(path, file, { upsert: true });
    setUploading(false);
    if (e) { setUpErr("Upload failed. You can skip and send it later."); return; }
    setUrl(supabase.storage.from("restaurant-logos").getPublicUrl(path).data.publicUrl);
    setPreview(URL.createObjectURL(file));
  };
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Have a logo or profile image?</h1>
      <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-hero-foreground/25 p-5 text-center">
        {preview ? <img src={preview} alt="Your logo preview" className="max-h-28 object-contain" /> : <><Upload className="h-6 w-6 text-primary" /><span className="mt-2 font-semibold">{uploading ? "Uploading…" : "Upload Logo"}</span></>}
        <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      </label>
      {(upErr || error) && <p role="alert" className="text-sm text-destructive">{upErr || error}</p>}
      <div className="rounded-2xl bg-hero-foreground/[0.05] p-5">
        <h2 className="font-bold">We'll take it from here.</h2><p className="mt-2 text-sm"><Link to="/support?topic=personal#question" className="underline" target="_blank" rel="noopener noreferrer">Send us artwork or a custom design idea</Link></p>
        <p className="mt-2 text-sm leading-relaxed text-hero-foreground/75">{personal ? "We'll use the details and links you shared to build your personal hub. Send any other links or design ideas to our team whenever you're ready." : "We'll find your Google review link, website, social profiles, directions, contact information, photos, and other important business links. Our team will build your TapAway page for you."}</p>
      </div>
      <Button className="h-12 w-full" disabled={busy || uploading || !url} onClick={() => onSubmit(url)}>Continue to shipping</Button>
      <button type="button" disabled={busy} className="min-h-11 w-full text-sm text-hero-foreground/75 underline" onClick={() => onSubmit("")}>{personal ? "Skip for now, I'll send it later" : "Skip this, we'll find it for you"}</button>
    </div>
  );
}

function ShippingStep({ current, busy, error, onSubmit }: { current: Address | null; busy: boolean; error: string | null; onSubmit: (a: Address | null) => void }) {
  const [editing, setEditing] = useState(!current?.line1);
  const [a, setA] = useState<Address>(current ?? {});
  const f = (k: keyof Address, label: string, req = true) => (
    <div className="space-y-1"><Label htmlFor={`ship-${k}`}>{label}</Label><Input id={`ship-${k}`} required={req} value={a[k] ?? ""} onChange={(e) => setA({ ...a, [k]: e.target.value })} className="h-12" /></div>
  );
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Shipping to</h1>
      {!editing ? (
        <>
          <div className="rounded-2xl border border-hero-foreground/15 p-5 text-hero-foreground/85">
            {current?.name && <p className="font-semibold">{current.name}</p>}
            <p>{current?.line1}{current?.line2 ? `, ${current.line2}` : ""}</p>
            <p>{current?.city}, {current?.state} {current?.postal_code}</p>
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button className="h-12 w-full" disabled={busy} onClick={() => onSubmit(null)}>Looks Good</Button>
          <button type="button" className="min-h-11 w-full text-sm underline text-hero-foreground/75" onClick={() => setEditing(true)}>Edit Address</button>
        </>
      ) : (
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); onSubmit(a); }}>
          {f("name", "Name")}{f("line1", "Address")}{f("line2", "Apt, suite (optional)", false)}{f("city", "City")}{f("state", "State")}{f("postal_code", "ZIP code")}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="h-12 w-full" disabled={busy}>Save address</Button>
        </form>
      )}
    </div>
  );
}

export function SetupProgress({ hasLogo }: { hasLogo?: boolean }) {
  const items: [string, boolean][] = [["Payment complete", true], ["Business received", true], ...(hasLogo !== undefined ? [["Logo received", hasLogo] as [string, boolean]] : []), ["We're building your TapAway", false], ["Cards printed", false], ["Cards shipped", false]];
  return (
    <ul className="space-y-3 text-left">
      {items.map(([label, done]) => (
        <li key={label} className="flex items-center gap-3">{done ? <Check className="h-5 w-5 text-primary" /> : <Circle className="h-5 w-5 text-hero-foreground/40" />}<span className={done ? "" : "text-hero-foreground/70"}>{label}</span></li>
      ))}
    </ul>
  );
}

function DoneStep({ hasLogo, onDashboard }: { hasLogo: boolean; onDashboard: () => void }) {
  return (
    <div className="space-y-6 text-center">
      <h1 className="text-3xl font-bold">You're all set 🎉</h1>
      <p className="text-lg font-semibold">We're building your TapAway.</p>
      <p className="text-hero-foreground/75">Our team will gather your business links, build your page, prepare your custom cards, and make sure everything is ready before they ship.</p>
      <div className="rounded-2xl border border-hero-foreground/15 p-5"><SetupProgress hasLogo={hasLogo ? true : undefined} /></div>
      <Button className="h-12 w-full" onClick={onDashboard}>Go to My Dashboard</Button>
    </div>
  );
}
