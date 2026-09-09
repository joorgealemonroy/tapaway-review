import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PERSONAL_AFFILIATE_PAYMENT_LINK } from "@/lib/personalConfig";
import { 
  ArrowRight, 
  Check, 
  Loader2, 
  Shield, 
  Link2, 
  BarChart3, 
  Sparkles,
  Eye,
  AlertCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import { Check as CheckIcon } from "lucide-react";

interface Props {
  referralCode: string;
}

export const AffiliatePaywall = ({ referralCode }: Props) => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [processing, setProcessing] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  // Debounced username availability check
  useEffect(() => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null);
      setUsernameError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingUsername(true);
      try {
        const { data } = await supabase
          .from("personal_profiles")
          .select("id")
          .eq("username", username.toLowerCase())
          .maybeSingle();
        
        setUsernameAvailable(!data);
        setUsernameError(data ? "Username is taken" : null);
      } catch {
        setUsernameAvailable(null);
      } finally {
        setCheckingUsername(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username]);

  const isPasswordValid = password.length >= 8 && /\d/.test(password) && /[^a-zA-Z0-9]/.test(password);
  const isFormValid = fullName.trim() && email.includes("@") && username.length >= 3 && usernameAvailable && isPasswordValid;

  const handleSubmit = async () => {
    if (!isFormValid) return;

    setProcessing(true);
    try {
      // Save signup data to sessionStorage
      const signupData = {
        fullName,
        email,
        username: username.toLowerCase(),
        planType: "monthly", // Affiliate plan
        links: [],
        blocks: [],
        cardHeadline: "",
        headerType: "banner",
        headerColor: "#6BCB77",
        backgroundColor: "#000000",
        profilePhotoBase64: null,
        addExtraCard: false,
        extraCardCount: 0,
      };

      localStorage.setItem("personal_signup_data", JSON.stringify(signupData));
      // SECURITY: never persist the plaintext password across the Stripe redirect.
      // Account activation happens via magic link on return.
      localStorage.setItem("tapaway_ref", referralCode);

      // Build Stripe URL
      const url = new URL(PERSONAL_AFFILIATE_PAYMENT_LINK);
      url.searchParams.set("prefilled_email", email);
      url.searchParams.set("client_reference_id", username.toLowerCase());

      window.location.href = url.toString();
    } catch (err) {
      console.error("Checkout error:", err);
      toast.error("Something went wrong. Please try again.");
      setProcessing(false);
    }
  };

  const valueProps = [
    { icon: Link2, text: "Unlimited links — Instagram, TikTok, YouTube, payments" },
    { icon: Eye, text: "Custom profile page at tapaway.co/yourname" },
    { icon: BarChart3, text: "Track every profile visit with analytics" },
    { icon: Sparkles, text: "Custom headers, contact card, email capture" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3">
          <a href="/personal" className="font-black text-xl tracking-tight text-foreground">
            TapAway
          </a>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        {/* Trial Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
          <Sparkles className="w-4 h-4" />
          <span>2 weeks free — no charge today</span>
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">
          Start your free trial
        </h1>
        <p className="text-muted-foreground mb-8">
          Set up your TapAway profile and share all your links from one place.
        </p>

        {/* Form */}
        <div className="space-y-4 mb-8">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Full Name</label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
              disabled={processing}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={processing}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Choose your username</label>
            <div className="relative">
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""))}
                placeholder="yourname"
                disabled={processing}
                className="pr-10"
              />
              {checkingUsername && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {!checkingUsername && usernameAvailable === true && (
                <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
              )}
              {!checkingUsername && usernameAvailable === false && (
                <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
              )}
            </div>
            {username.length >= 3 && (
              <p className={`text-xs mt-1 ${usernameAvailable ? "text-green-600" : usernameError ? "text-destructive" : "text-muted-foreground"}`}>
                {checkingUsername ? "Checking..." : usernameAvailable ? `tapaway.co/${username} is available!` : usernameError}
              </p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              disabled={processing}
            />
            <div className="mt-2 space-y-1">
              {[
                { label: "8+ characters", ok: password.length >= 8 },
                { label: "Contains a number", ok: /\d/.test(password) },
                { label: "Contains a symbol", ok: /[^a-zA-Z0-9]/.test(password) },
              ].map((rule) => (
                <p key={rule.label} className={`text-xs flex items-center gap-1.5 ${rule.ok ? "text-green-600" : "text-muted-foreground"}`}>
                  <CheckIcon className={`h-3 w-3 ${rule.ok ? "text-green-600" : "text-muted-foreground/50"}`} />
                  {rule.label}
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* Value Props */}
        <div className="space-y-3 mb-8 p-4 bg-muted/50 rounded-xl">
          <h3 className="font-semibold text-foreground text-sm">What you get</h3>
          {valueProps.map((prop, i) => (
            <div key={i} className="flex items-start gap-3">
              <prop.icon className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span className="text-sm text-foreground">{prop.text}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <Button
          onClick={handleSubmit}
          disabled={!isFormValid || processing}
          className="w-full h-14 text-base font-semibold mb-4"
        >
          {processing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Redirecting...
            </>
          ) : (
            <>
              Start Free Trial
              <ArrowRight className="h-5 w-5 ml-2" />
            </>
          )}
        </Button>

        {/* Trust */}
        <div className="space-y-2 text-center mb-6">
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-3 w-3" />
            <span>Secure checkout • Cancel anytime</span>
          </div>
          <p className="text-xs text-muted-foreground">
            After your 14-day free trial, you'll be charged. Cancel before trial ends and you won't be charged.
          </p>
          <p className="text-xs text-muted-foreground">
            We'll place a temporary $1 hold to verify your card. It's released automatically — never charged.
          </p>
        </div>

        {/* Legal */}
        <p className="text-xs text-muted-foreground text-center">
          By continuing, you agree to our{" "}
          <Link to="/terms" className="text-primary hover:underline">Terms</Link>
          {" "}and{" "}
          <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
        </p>
      </main>
    </div>
  );
};
