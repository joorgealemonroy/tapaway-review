import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Loader2, Mail } from "lucide-react";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  businessName: z.string().trim().min(1, "Business name is required").max(100),
  city: z.string().trim().min(1, "City is required").max(100),
  state: z.string().trim().min(2, "State is required").max(50),
  businessType: z.string().trim().min(1, "Business type is required"),
  shippingAddress: z.string().trim().min(1, "Shipping address is required").max(200),
});

const BUSINESS_TYPES = [
  "Restaurant",
  "Cafe / Coffee Shop",
  "Bar / Brewery",
  "Barber / Salon",
  "Food Truck",
  "Bakery",
  "Spa / Wellness",
  "Other",
];

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

type View = "form" | "otp" | "saving";

const OnboardingStartPublic = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const source = searchParams.get("source");

  const [view, setView] = useState<View>("form");
  const [submitting, setSubmitting] = useState(false);
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [useUnbranded, setUseUnbranded] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [form, setForm] = useState({
    email: "",
    businessName: "",
    city: "",
    state: "",
    businessType: "",
    shippingAddress: "",
  });

  const canSubmit = useMemo(() => {
    try {
      schema.parse(form);
      return true;
    } catch {
      return false;
    }
  }, [form]);

  useEffect(() => {
    document.title = "Finish setting up TapAway | Free Trial";

    // Set pending setup flag on any visit to this page (ensures paywall doesn't kick them out)
    localStorage.setItem("tapaway_pending_setup", "true");
    document.cookie = `tapaway_pending_setup=true; path=/; max-age=${60 * 60 * 24 * 14}`;

    // Pre-fill from localStorage
    const pendingEmail = localStorage.getItem("tapaway_pending_email");
    const pendingBusiness = localStorage.getItem("tapaway_pending_business");
    const pendingCity = localStorage.getItem("tapaway_pending_city");
    const pendingState = localStorage.getItem("tapaway_pending_state");
    const pendingType = localStorage.getItem("tapaway_pending_type");

    setForm((prev) => ({
      ...prev,
      email: pendingEmail || prev.email,
      businessName: pendingBusiness || prev.businessName,
      city: pendingCity || prev.city,
      state: pendingState || prev.state,
      businessType: pendingType || prev.businessType,
    }));

    // If already authenticated, skip straight to onboarding
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate("/onboarding");
      }
    });
  }, [navigate, source]);

  const onLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be less than 2MB");
      return;
    }

    setLogoFile(file);
    setUseUnbranded(false);

    const reader = new FileReader();
    reader.onloadend = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const startOtp = async () => {
    const email = form.email.toLowerCase().trim();

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/onboarding-start?source=otp`,
      },
    });

    if (error) throw error;
  };

  const upsertWorkspaceBasics = async (userId: string) => {
    // Keep this non-sensitive: DO NOT store shipping address in restaurants.
    const slug = form.businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50);

    const { data: existing } = await supabase
      .from("restaurants")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await supabase
        .from("restaurants")
        .update({
          restaurant_name: form.businessName.trim(),
          address: `${form.city.trim()}, ${form.state}`,
          type: form.businessType.toLowerCase().replace(/\s+/g, "_"),
          custom_slug: slug,
          email: form.email.toLowerCase().trim(),
          onboarding_step: 1,
          onboarding_completed: false,
        })
        .eq("id", existing.id);

      if (error) throw error;
      return existing.id;
    }

    const { data: created, error } = await supabase
      .from("restaurants")
      .insert({
        owner_id: userId,
        restaurant_name: form.businessName.trim(),
        address: `${form.city.trim()}, ${form.state}`,
        type: form.businessType.toLowerCase().replace(/\s+/g, "_"),
        custom_slug: slug,
        email: form.email.toLowerCase().trim(),
        onboarding_step: 1,
        onboarding_completed: false,
        // Note: we do NOT mark subscription as active here.
      })
      .select("id")
      .single();

    if (error) throw error;
    return created.id;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      schema.parse(form);
    } catch (err: any) {
      toast.error(err?.errors?.[0]?.message || "Please complete all required fields");
      return;
    }

    setSubmitting(true);
    try {
      // Save local fallback (also used by /onboarding)
      localStorage.setItem("tapaway_pending_setup", "true");
      localStorage.setItem("tapaway_pending_email", form.email.toLowerCase().trim());
      localStorage.setItem("tapaway_pending_business", form.businessName.trim());
      localStorage.setItem("tapaway_pending_city", form.city.trim());
      localStorage.setItem("tapaway_pending_state", form.state);
      localStorage.setItem("tapaway_pending_type", form.businessType);
      localStorage.setItem("tapaway_pending_shipping_address", form.shippingAddress.trim());
      localStorage.setItem("tapaway_pending_unbranded", useUnbranded ? "true" : "false");
      localStorage.setItem("tapaway_pending_logo_selected", logoFile ? "true" : "false");

      await startOtp();
      setView("otp");
      toast.success("Check your email for a 6-digit code");
    } catch (err: any) {
      console.error("[onboarding-start] submit error", err);
      toast.error(err?.message || "Could not start email verification");
    } finally {
      setSubmitting(false);
    }
  };

  const onVerify = async () => {
    if (otp.trim().length < 6) {
      toast.error("Enter the 6-digit code");
      return;
    }

    setVerifying(true);
    try {
      const email = form.email.toLowerCase().trim();

      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp.trim(),
        type: "email",
      });

      if (error) throw error;
      if (!data.user) throw new Error("Could not verify email");

      setView("saving");

      await upsertWorkspaceBasics(data.user.id);

      // Do NOT upload logo or save shipping here (shipping is sensitive; handled in /onboarding).
      navigate("/onboarding");
    } catch (err: any) {
      console.error("[onboarding-start] verify error", err);
      toast.error(err?.message || "Invalid code. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <a href="/" className="text-lg font-black tracking-tight text-foreground">
            TapAway
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-10">
        {view === "saving" ? (
          <section className="flex flex-col items-center justify-center py-16 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <h1 className="mt-6 text-2xl font-bold text-foreground">Activating your free trial…</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This usually takes just a moment.
            </p>
          </section>
        ) : view === "otp" ? (
          <section aria-labelledby="otp-title">
            <Card className="p-6">
              <div className="mb-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <h1 id="otp-title" className="text-2xl font-bold text-foreground">
                  Enter your code
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  We sent a 6-digit code to <span className="font-medium text-foreground">{form.email}</span>
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="otp">Verification code</Label>
                  <Input
                    id="otp"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="123456"
                    className="text-center text-2xl tracking-widest"
                  />
                </div>

                <Button onClick={onVerify} disabled={verifying || otp.trim().length < 6} className="w-full">
                  {verifying ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Verifying…
                    </span>
                  ) : (
                    "Continue setup"
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setView("form");
                    setOtp("");
                  }}
                >
                  Change email
                </Button>
              </div>
            </Card>
          </section>
        ) : (
          <section aria-labelledby="title">
            <h1 id="title" className="text-3xl font-black tracking-tight text-foreground">
              Finish setting up TapAway
            </h1>
            <p className="mt-2 text-muted-foreground">
              Your trial is active — we just need a few details to ship your cards.
            </p>

            <article className="mt-6">
              <Card className="p-6">
                <form className="space-y-5" onSubmit={onSubmit}>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={form.email}
                      onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                      placeholder="you@business.com"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessName">Business name</Label>
                    <Input
                      id="businessName"
                      value={form.businessName}
                      onChange={(e) => setForm((p) => ({ ...p, businessName: e.target.value }))}
                      placeholder="Your business name"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={form.city}
                        onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                        placeholder="City"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>State</Label>
                      <Select value={form.state} onValueChange={(v) => setForm((p) => ({ ...p, state: v }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {US_STATES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Business type</Label>
                    <Select
                      value={form.businessType}
                      onValueChange={(v) => setForm((p) => ({ ...p, businessType: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {BUSINESS_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ship">Shipping address</Label>
                    <Input
                      id="ship"
                      value={form.shippingAddress}
                      onChange={(e) => setForm((p) => ({ ...p, shippingAddress: e.target.value }))}
                      placeholder="Street address, unit, etc."
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      We’ll confirm the rest of the shipping details on the next step.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="unbranded"
                        checked={useUnbranded}
                        onCheckedChange={(v) => {
                          const checked = v === true;
                          setUseUnbranded(checked);
                          if (checked) {
                            setLogoFile(null);
                            setLogoPreview(null);
                          }
                        }}
                      />
                      <div className="space-y-1">
                        <Label htmlFor="unbranded">Send unbranded cards</Label>
                        <p className="text-xs text-muted-foreground">You can upload a logo later.</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="logo">Logo upload (optional)</Label>
                      <Input
                        id="logo"
                        type="file"
                        accept="image/*"
                        disabled={useUnbranded}
                        onChange={onLogoChange}
                      />
                      {logoPreview && !useUnbranded && (
                        <img
                          src={logoPreview}
                          alt="Business logo preview"
                          className="mt-2 h-20 w-20 rounded-lg border border-border object-cover"
                          loading="lazy"
                        />
                      )}
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={submitting || !canSubmit}>
                    {submitting ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Sending code…
                      </span>
                    ) : (
                      "Continue"
                    )}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    No password needed — we’ll email you a one-time code.
                  </p>
                </form>
              </Card>
            </article>
          </section>
        )}
      </main>
    </div>
  );
};

export default OnboardingStartPublic;
