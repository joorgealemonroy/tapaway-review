import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { SupportChat } from "@/components/landing/SupportChat";
import { StorefrontFooter } from "@/components/landing/StorefrontSections";
import { LandingNav } from "@/components/landing/LandingNav";
import { STOREFRONT_FAQS } from "@/lib/storefrontFaqs";
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
  const location = useLocation();

  const [account, setAccount] = useState<Account | null>(null);
  const [loadingAccount, setLoadingAccount] = useState(false);

  // Signed-out: dashboard access
  const [accessEmail, setAccessEmail] = useState("");
  const [accessSending, setAccessSending] = useState(false);
  const [accessSent, setAccessSent] = useState(false);

  // General question (both states)
  const [gName, setGName] = useState("");
  const [gEmail, setGEmail] = useState("");
  const [gMessage, setGMessage] = useState(() => new URLSearchParams(window.location.search).get("topic") === "personal" ? "I have a personal card design in mind. Here is my idea: " : "");
  const [gSending, setGSending] = useState(false);
  const [gSent, setGSent] = useState(false);

  // Signed-in: issue report
  const [issueChips, setIssueChips] = useState<string[]>([]);
  const [issueText, setIssueText] = useState("");
  const [issueSending, setIssueSending] = useState(false);
  const [issueSent, setIssueSent] = useState(false);
  // M-10 honeypot: bots fill hidden fields; humans never see it. Checked by
  // support-notification, which silently drops bot submissions.
  const [website, setWebsite] = useState("");

  const honeypotField = (
    <input
      type="text"
      name="website"
      value={website}
      onChange={(e) => setWebsite(e.target.value)}
      autoComplete="off"
      tabIndex={-1}
      aria-hidden="true"
      className="absolute h-0 w-0 overflow-hidden opacity-0"
    />
  );

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

  useEffect(() => {
    if (location.hash === "#question" && !authLoading && !loadingAccount) {
      document.getElementById("question")?.scrollIntoView({ block: "start" });
    }
  }, [location.hash, authLoading, loadingAccount]);


  const submitRequest = async (
    requestType: "TECH_ISSUE" | "BILLING" | "OTHER",
    description: string,
    details?: Record<string, unknown>,
    override?: { name: string; email: string }
  ) => {
    if (website) return; // Ignore the honeypot before writing a support request.
    const name = override?.name || account?.name || "";
    const email = override?.email || account?.email || user?.email || "";
    const { data, error } = await supabase.functions.invoke("public-intake", { body: {
      action: "support", requestType, name: name || "Website visitor", businessName: account?.businessName || "",
      email, description, requestDetails: details ?? {}, website,
    } });
    if (error || !data?.success) throw new Error(data?.error || "Please try again.");

    await supabase.functions.invoke("support-notification", {
      body: {
        requestType,
        name: name || "Website visitor",
        businessName: account?.businessName || "",
        email,
        description,
        requestDetails: details ?? {},
        website, // honeypot: must stay empty
      },
    });
  };

  const sendAccessLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessEmail.trim()) return;
    setAccessSending(true);
    try {
      const { error } = await supabase.functions.invoke("request-dashboard-access", {
        body: { email: accessEmail.trim().toLowerCase() },
      });
      if (error) throw error;
      setAccessSent(true);
    } catch (err) {
      console.error("[Support] access link failed:", err);
      toast.error("We couldn't send the link. Try again or email tap@tapaway.co for help.");
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
    <div className="storefront sf-support min-h-screen">
      <LandingNav />
      <Helmet>
        <title>Support & Help | TapAway</title>
        <meta
          name="description"
          content="Get help with your TapAway hub, cards, and billing, or send us a question."
        />
        <link rel="canonical" href="https://tapaway.co/support" />
      </Helmet>

      <main id="main-content" className="mx-auto w-full max-w-2xl space-y-6 px-5 py-10">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <LifeBuoy className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold sm:text-3xl">Support &amp; Help</h1>
          <p className="text-sm text-muted-foreground">Questions before you buy? Help with an order? You're in the right place.</p>
          <div className="flex flex-wrap justify-center gap-3 pt-4"><SupportChat inline /><a href="#question" className="sf-button secondary">Message our team</a><a href="mailto:tap@tapaway.co" className="sf-button secondary">Email our team</a></div>
        </div>

        <section className="rounded-xl border p-5" aria-labelledby="quick-answers"><h2 id="quick-answers" className="font-semibold mb-2">Quick answers</h2>{STOREFRONT_FAQS.filter((_,i) => [0,3,4,6,7].includes(i)).map(faq => <details key={faq.question} className="border-b last:border-0 py-3"><summary className="cursor-pointer text-sm font-medium">{faq.question}</summary><p className="mt-3 text-sm leading-7 text-muted-foreground">{faq.answer}</p></details>)}<Link to="/faq" className="sf-text-link text-xs mt-4">See all answers</Link></section>
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
                  ? "Open your dashboard to see Card Club eligibility, any existing card benefits, and paid reprint options."
                  : "Card requests need an active plan."}
              </p>
              {account.kind === "personal" ? <Button asChild><Link to="/dashboard?tab=cards">View my card options</Link></Button> : <RequestMoreCards
                variant="restaurant"
                restaurantId={account.id}
                trigger={<Button className="w-full sm:w-auto">Request cards</Button>}
              />}
            </Card>

            {/* Something's not working */}
            <Card className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">Something's not working</h2>
              </div>
              {issueSent ? (
                <Sent text="Got it. We're on it and will follow up by email." />
              ) : (
                <form className="space-y-4" onSubmit={sendIssue}>
                  {honeypotField}
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
                <Sent text="Thanks. We'll get back to you by email." />
              ) : (
                <form className="space-y-3" onSubmit={sendBilling}>
                  {honeypotField}
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
                <h2 id="question" className="scroll-mt-24 font-semibold">Ask us a question</h2>
              </div>
              {gSent ? (
                <Sent text="Thanks for writing in. We'll reply by email." />
              ) : (
                <form className="space-y-3" onSubmit={sendGeneral}>
                  {honeypotField}
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
                  <Sent text="If your email matches an account, a secure link is on its way. Check your inbox and spam folder." />
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
                <h2 id="question" className="scroll-mt-24 font-semibold">Ask us a question</h2>
              </div>
              {gSent ? (
                <Sent text="Thanks for writing in. We'll reply by email." />
              ) : (
                <form className="space-y-3" onSubmit={sendGeneral}>
                  {honeypotField}
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
      </main>
      <StorefrontFooter />
    </div>
  );
};

export default Support;
