import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CheckCircle2,
  CreditCard,
  LifeBuoy,
  Loader2,
  LogIn,
  Mail,
  MessageCircle,
  Receipt,
  Wrench,
} from "lucide-react";
import { RequestMoreCards } from "@/components/dashboard/RequestMoreCards";
import {
  cardAllowanceForPlan,
  cardPlanLabel,
  subscriptionLabel,
  canRequestCards,
} from "@/lib/cardAllowance";

type Account = {
  kind: "restaurant" | "personal";
  id: string;
  name: string;
  businessName: string;
  email: string;
  planType: string | null;
  status: string | null;
};

const ISSUE_CHIPS = [
  "A link is wrong",
  "QR code not scanning",
  "NFC card not working",
  "Hub page looks broken",
  "Something else",
];

const Support = () => {
  const { user, loading: authLoading } = useAuth();

  const [account, setAccount] = useState<Account | null>(null);
  const [loadingAccount, setLoadingAccount] = useState(false);

  // Signed-out: dashboard access
  const [accessEmail, setAccessEmail] = useState("");
  const [accessSending, setAccessSending] = useState(false);
  const [accessSent, setAccessSent] = useState(false);

  // General question (both states)
  const [gName, setGName] = useState("");
  const [gEmail, setGEmail] = useState("");
  const [gMessage, setGMessage] = useState("");
  const [gSending, setGSending] = useState(false);
  const [gSent, setGSent] = useState(false);

  // Signed-in: issue report
  const [issueChips, setIssueChips] = useState<string[]>([]);
  const [issueText, setIssueText] = useState("");
  const [issueSending, setIssueSending] = useState(false);
  const [issueSent, setIssueSent] = useState(false);

  // Signed-in: billing note
  const [billingText, setBillingText] = useState("");
  const [billingSending, setBillingSending] = useState(false);
  const [billingSent, setBillingSent] = useState(false);

  useEffect(() => {
    if (!user) {
      setAccount(null);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoadingAccount(true);
      try {
        const { data: restaurant } = await supabase
          .from("restaurants")
          .select("id, restaurant_name, owner_name, email, plan_type, subscription_status")
          .eq("owner_id", user.id)
          .maybeSingle();

        if (restaurant && !cancelled) {
          setAccount({
            kind: "restaurant",
            id: restaurant.id,
            name: restaurant.owner_name || restaurant.restaurant_name || "",
            businessName: restaurant.restaurant_name || "",
            email: restaurant.email || user.email || "",
            planType: restaurant.plan_type,
            status: restaurant.subscription_status,
          });
          return;
        }

        const { data: profile } = await supabase
          .from("personal_profiles")
          .select("id, full_name, username, email, plan_type, subscription_status")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profile && !cancelled) {
          setAccount({
            kind: "personal",
            id: profile.id,
            name: profile.full_name || "",
            businessName: profile.username || "",
            email: profile.email || user.email || "",
            planType: profile.plan_type,
            status: profile.subscription_status,
          });
        }
      } catch (e) {
        console.error("[Support] account load failed:", e);
      } finally {
        if (!cancelled) setLoadingAccount(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const allowance = useMemo(() => cardAllowanceForPlan(account?.planType), [account?.planType]);

  const submitRequest = async (
    requestType: "TECH_ISSUE" | "BILLING" | "OTHER",
    description: string,
    details?: Record<string, unknown>,
    override?: { name: string; email: string }
  ) => {
    const name = override?.name || account?.name || "";
    const email = override?.email || account?.email || user?.email || "";
    const { error } = await supabase.from("support_requests").insert([
      {
        request_type: requestType,
        name: name || "Website visitor",
        business_name: account?.businessName || "",
        email,
        description,
        request_details: (details ?? {}) as Record<string, unknown>,
        user_id: user?.id || undefined,
      },
    ]);
    if (error) throw error;

    await supabase.functions.invoke("support-notification", {
      body: {
        requestType,
        name: name || "Website visitor",
        businessName: account?.businessName || "",
        email,
        description,
        requestDetails: details ?? {},
      },
    });
  };

  const sendAccessLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessEmail.trim()) return;
    setAccessSending(true);
    try {
      await supabase.functions.invoke("request-dashboard-access", {
        body: { email: accessEmail.trim().toLowerCase() },
      });
      setAccessSent(true);
    } catch (err) {
      console.error("[Support] access link failed:", err);
      setAccessSent(true); // neutral either way
    } finally {
      setAccessSending(false);
    }
  };

  const sendGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = user ? account?.name || "" : gName.trim();
    const email = user ? account?.email || user.email || "" : gEmail.trim();
    if (!gMessage.trim() || (!user && (!name || !email))) {
      toast.error("Please fill in every field so we can get back to you.");
      return;
    }
    setGSending(true);
    try {
      await submitRequest("OTHER", gMessage.trim(), { source: "general_question" }, { name, email });
      setGSent(true);
      setGMessage("");
    } catch (err) {
      console.error("[Support] general submit failed:", err);
      toast.error("Something went wrong. Email us at tap@tapaway.co and we'll sort it out.");
    } finally {
      setGSending(false);
    }
  };

  const sendIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueText.trim() && issueChips.length === 0) {
      toast.error("Tell us what's happening so we can fix it.");
      return;
    }
    setIssueSending(true);
    try {
      await submitRequest(
        "TECH_ISSUE",
        issueText.trim() || issueChips.join(", "),
        { issues: issueChips }
      );
      setIssueSent(true);
      setIssueText("");
      setIssueChips([]);
    } catch (err) {
      console.error("[Support] issue submit failed:", err);
      toast.error("Something went wrong. Email us at tap@tapaway.co and we'll sort it out.");
    } finally {
      setIssueSending(false);
    }
  };

  const sendBilling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billingText.trim()) {
      toast.error("Add a short note and we'll take a look.");
      return;
    }
    setBillingSending(true);
    try {
      await submitRequest("BILLING", billingText.trim(), { source: "billing_question" });
      setBillingSent(true);
      setBillingText("");
    } catch (err) {
      console.error("[Support] billing submit failed:", err);
      toast.error("Something went wrong. Email us at tap@tapaway.co and we'll sort it out.");
    } finally {
      setBillingSending(false);
    }
  };

  const Sent = ({ text }: { text: string }) => (
    <div className="flex items-start gap-2 rounded-lg bg-primary/10 p-3 text-sm">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <span>{text}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-8 sm:py-12">
      <Helmet>
        <title>Support & Help | TapAway</title>
        <meta
          name="description"
          content="Get help with your TapAway hub, cards, and billing, or send us a question."
        />
        <link rel="canonical" href="https://tapaway.co/support" />
      </Helmet>

      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <LifeBuoy className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold sm:text-3xl">Support &amp; Help</h1>
          <p className="text-sm text-muted-foreground">We usually reply the same day.</p>
        </div>

        {authLoading || (user && loadingAccount) ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : user && account ? (
          <>
            {/* Plan header */}
            <Card className="p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="text-sm">
                  {cardPlanLabel(account.planType)}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {allowance} cards per month
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="text-sm font-medium">{subscriptionLabel(account.status)}</span>
              </div>
              {account.businessName && (
                <p className="mt-2 text-sm text-muted-foreground">{account.businessName}</p>
              )}
            </Card>

            {/* Cards */}
            <Card className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">Get more cards</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                {canRequestCards(account.status)
                  ? `Your plan includes ${allowance} cards a month. Tell us how many you need and confirm where to send them.`
                  : "Card requests need an active plan."}
              </p>
              <RequestMoreCards
                variant={account.kind === "personal" ? "personal" : "restaurant"}
                restaurantId={account.kind === "restaurant" ? account.id : undefined}
                personalProfileId={account.kind === "personal" ? account.id : undefined}
                trigger={<Button className="w-full sm:w-auto">Request cards</Button>}
              />
            </Card>

            {/* Something's not working */}
            <Card className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">Something's not working</h2>
              </div>
              {issueSent ? (
                <Sent text="Got it — we're on it and will follow up by email." />
              ) : (
                <form className="space-y-4" onSubmit={sendIssue}>
                  <div className="flex flex-wrap gap-2">
                    {ISSUE_CHIPS.map((chip) => {
                      const active = issueChips.includes(chip);
                      return (
                        <button
                          key={chip}
                          type="button"
                          onClick={() =>
                            setIssueChips((prev) =>
                              active ? prev.filter((c) => c !== chip) : [...prev, chip]
                            )
                          }
                          className={`rounded-full border px-3 py-1.5 text-sm transition-colors active:scale-95 ${
                            active
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background text-foreground"
                          }`}
                        >
                          {chip}
                        </button>
                      );
                    })}
                  </div>
                  <Textarea
                    placeholder="What's happening?"
                    rows={4}
                    value={issueText}
                    onChange={(e) => setIssueText(e.target.value)}
                  />
                  <Button type="submit" disabled={issueSending} className="w-full sm:w-auto">
                    {issueSending ? "Sending…" : "Send"}
                  </Button>
                </form>
              )}
            </Card>

            {/* Billing */}
            <Card className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">Billing question</h2>
              </div>
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => { window.location.href = "/dashboard?tab=plan"; }}
              >
                Open my plan &amp; billing
              </Button>
              {billingSent ? (
                <Sent text="Thanks — we'll get back to you by email." />
              ) : (
                <form className="space-y-3" onSubmit={sendBilling}>
                  <Textarea
                    placeholder="Still want to write in? Add a note (optional)"
                    rows={3}
                    value={billingText}
                    onChange={(e) => setBillingText(e.target.value)}
                  />
                  <Button
                    type="submit"
                    variant="secondary"
                    disabled={billingSending}
                    className="w-full sm:w-auto"
                  >
                    {billingSending ? "Sending…" : "Send note"}
                  </Button>
                </form>
              )}
            </Card>

            {/* General question */}
            <Card className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">General question or feedback</h2>
              </div>
              {gSent ? (
                <Sent text="Thanks for writing in — we'll reply by email." />
              ) : (
                <form className="space-y-3" onSubmit={sendGeneral}>
                  <Textarea
                    placeholder="What's on your mind?"
                    rows={4}
                    value={gMessage}
                    onChange={(e) => setGMessage(e.target.value)}
                  />
                  <Button type="submit" disabled={gSending} className="w-full sm:w-auto">
                    {gSending ? "Sending…" : "Send"}
                  </Button>
                </form>
              )}
            </Card>
          </>
        ) : (
          <>
            {/* Existing customer panel */}
            <Card className="p-5 space-y-4 border-primary/20 bg-primary/5">
              <div className="flex items-center gap-2">
                <LogIn className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">Already a TapAway customer?</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Your dashboard is where you manage your hub, cards, and billing.
              </p>
              <Button
                className="w-full sm:w-auto"
                onClick={() => {
                  window.location.href = `/auth?redirect=${encodeURIComponent("/support")}`;
                }}
              >
                Sign in
              </Button>

              <div className="border-t border-border pt-4">
                <p className="text-sm font-medium">
                  Don't know how to reach your dashboard?
                </p>
                <p className="mb-3 text-sm text-muted-foreground">
                  We'll email you a secure link.
                </p>
                {accessSent ? (
                  <Sent text="Check your inbox — we sent you a secure link." />
                ) : (
                  <form className="flex flex-col gap-2 sm:flex-row" onSubmit={sendAccessLink}>
                    <Input
                      type="email"
                      inputMode="email"
                      placeholder="The email you signed up with"
                      value={accessEmail}
                      onChange={(e) => setAccessEmail(e.target.value)}
                      required
                    />
                    <Button type="submit" variant="secondary" disabled={accessSending}>
                      {accessSending ? "Sending…" : "Send me access"}
                    </Button>
                  </form>
                )}
              </div>
            </Card>

            {/* Public general question form */}
            <Card className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">General question or feedback</h2>
              </div>
              {gSent ? (
                <Sent text="Thanks for writing in — we'll reply by email." />
              ) : (
                <form className="space-y-3" onSubmit={sendGeneral}>
                  <div className="space-y-2">
                    <Label htmlFor="support-name">Your name</Label>
                    <Input
                      id="support-name"
                      value={gName}
                      onChange={(e) => setGName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="support-email">Email</Label>
                    <Input
                      id="support-email"
                      type="email"
                      inputMode="email"
                      value={gEmail}
                      onChange={(e) => setGEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="support-message">Message</Label>
                    <Textarea
                      id="support-message"
                      rows={4}
                      value={gMessage}
                      onChange={(e) => setGMessage(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" disabled={gSending} className="w-full sm:w-auto">
                    {gSending ? "Sending…" : "Send"}
                  </Button>
                </form>
              )}
            </Card>
          </>
        )}

        <p className="pb-6 text-center text-sm text-muted-foreground">
          Prefer email?{" "}
          <a href="mailto:tap@tapaway.co" className="inline-flex items-center gap-1 text-primary underline">
            <Mail className="h-3.5 w-3.5" /> tap@tapaway.co
          </a>
        </p>
      </div>
    </div>
  );
};

export default Support;
