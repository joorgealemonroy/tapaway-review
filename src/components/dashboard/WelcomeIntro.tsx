/**
 * WelcomeIntro — one-time first-run introduction for new client accounts.
 *
 * Scenario: after a van-mode sale the owner gets a password-setup link,
 * creates their password, and lands in their dashboard for the very first
 * time. This intro walks them through what TapAway does for their business,
 * their live hub, the big levers on offer, and points at the
 * "Get more taps" playbook as the "start here" action.
 *
 * Shows EXACTLY ONCE per account:
 *  - seen state in localStorage, keyed per account id
 *    (`tapaway_welcome_intro:<accountId>`) — the same lighter-weight
 *    mechanism the engagement milestones use (`tapaway_milestones:<id>`),
 *    so no migration and no profile-schema change is needed.
 *  - first-run gate: only accounts created within the last FIRST_RUN_DAYS
 *    ever qualify. Existing (older) clients never see it — they were
 *    already onboarded, and the intro isn't meant to ambush them.
 *  - suppressed in demo previews and admin read-only views.
 *
 * Dismissing (Next through the last step, Skip tour, or the X) marks it
 * seen — it never reappears on this device for that account.
 *
 * Shared by both dashboards:
 *  - business: src/pages/Dashboard.tsx (overview tab)
 *  - personal: src/components/personal/DashboardOverview.tsx
 *
 * Mobile-first (390px): single-column cards, min 44px tap targets,
 * scrollable dialog body, no horizontal overflow.
 */

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  ExternalLink,
  MessageSquare,
  Megaphone,
  Users,
  BarChart3,
  Lightbulb,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type WelcomeIntroKind = "business" | "personal";

export interface WelcomeIntroProps {
  /** restaurant.id or profile.id — seen state is keyed per account. */
  accountId: string;
  kind: WelcomeIntroKind;
  /** Business name or profile display name. */
  displayName: string;
  /** Hub path like "/joes-tacos" — null when not set yet. */
  hubPath: string | null;
  /** Account creation timestamp — first-run gate. */
  createdAt: string | null;
  /** True in demo previews / admin read-only views — never show there. */
  suppressed?: boolean;
  /** Tab navigation for "Take me there" buttons. */
  onNavigateTab?: (tab: string) => void;
}

/** Accounts older than this never see the intro (they're existing clients). */
const FIRST_RUN_DAYS = 7;

const seenKey = (accountId: string) => `tapaway_welcome_intro:${accountId}`;

function hasSeenIntro(accountId: string): boolean {
  try {
    return localStorage.getItem(seenKey(accountId)) === "1";
  } catch {
    return false;
  }
}

function markIntroSeen(accountId: string): void {
  try {
    localStorage.setItem(seenKey(accountId), "1");
  } catch {
    // localStorage unavailable — intro simply shows again next visit.
  }
}

function isFirstRun(createdAt: string | null): boolean {
  if (!createdAt) return true; // unknown age: err on the side of welcoming
  const ageDays = (Date.now() - new Date(createdAt).getTime()) / 86_400_000;
  return ageDays <= FIRST_RUN_DAYS;
}

interface Lever {
  icon: typeof MessageSquare;
  iconClass: string;
  title: string;
  body: string;
  /** Dashboard tab for "Take me there" — null when there's nowhere to go. */
  tab: string | null;
}

function leversFor(kind: WelcomeIntroKind): Lever[] {
  if (kind === "business") {
    return [
      {
        icon: MessageSquare,
        iconClass: "bg-sky-500/10 text-sky-600",
        title: "Text your customers",
        body: "Review requests, flash deals, reminders — straight to their phones. The built-in templates make it a two-minute job.",
        tab: "sms",
      },
      {
        icon: Megaphone,
        iconClass: "bg-amber-500/10 text-amber-600",
        title: "Promotions & polls",
        body: "Give people a reason to tap again — a flash deal, an event, a quick question for your regulars.",
        tab: "engagement",
      },
      {
        icon: BarChart3,
        iconClass: "bg-emerald-500/10 text-emerald-600",
        title: "Tap stats",
        body: "See exactly how many people are tapping, and when — right here on your Overview. Real numbers, never fluff.",
        tab: null,
      },
    ];
  }
  return [
    {
      icon: MessageSquare,
      iconClass: "bg-sky-500/10 text-sky-600",
      title: "Text your customers",
      body: "Announcements, reminders, follow-ups — straight to their phones. The built-in templates make it a two-minute job.",
      tab: "sms",
    },
    {
      icon: Users,
      iconClass: "bg-violet-500/10 text-violet-600",
      title: "Customer info",
      body: "Collect info from page visitors — quote requests, questions, contact details. Their answers land in one tidy list.",
      tab: "leads",
    },
    {
      icon: BarChart3,
      iconClass: "bg-emerald-500/10 text-emerald-600",
      title: "Visit stats",
      body: "See how many people visit your hub and what they tap — under Stats. Real numbers, never fluff.",
      tab: "analytics",
    },
  ];
}

export function WelcomeIntro({
  accountId,
  kind,
  displayName,
  hubPath,
  createdAt,
  suppressed = false,
  onNavigateTab,
}: WelcomeIntroProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (suppressed) return;
    if (hasSeenIntro(accountId)) return;
    if (!isFirstRun(createdAt)) return;
    setOpen(true);
  }, [accountId, createdAt, suppressed]);

  const dismiss = () => {
    markIntroSeen(accountId);
    setOpen(false);
  };

  const goToTab = (tab: string) => {
    dismiss();
    onNavigateTab?.(tab);
  };

  const goToPlaybook = () => {
    dismiss();
    // PlaybookSection renders on both overviews with this anchor id.
    window.setTimeout(() => {
      document
        .getElementById("get-more-taps")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const levers = leversFor(kind);
  const lastStep = 3;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) dismiss();
      }}
    >
      <DialogContent
        className="max-w-[calc(100vw-2rem)] sm:max-w-md p-5 sm:p-6"
        aria-label="Welcome to TapAway"
      >
        <DialogHeader className="text-left">
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <span className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-primary" />
            </span>
            {step === 0 ? (
              <>Welcome to TapAway, {displayName}! 🎉</>
            ) : step === 1 ? (
              "Your hub is live"
            ) : step === 2 ? (
              "Three things worth your time"
            ) : (
              "Your first win"
            )}
          </DialogTitle>
          <DialogDescription className="sr-only">
            A short introduction to TapAway and your dashboard. Step {step + 1} of {lastStep + 1}.
          </DialogDescription>
        </DialogHeader>

        {/* Step dots */}
        <div className="flex items-center gap-1.5" aria-hidden="true">
          {Array.from({ length: lastStep + 1 }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                i <= step ? "bg-primary" : "bg-muted",
              )}
            />
          ))}
        </div>

        <div className="max-h-[55vh] overflow-y-auto -mx-1 px-1">
          {step === 0 && (
            <p className="text-[15px] leading-relaxed text-foreground">
              TapAway turns a simple tap of your card into{" "}
              <strong>more reviews, more customers, and more sales</strong> —
              everything runs from one page your customers already have in
              their hands. This dashboard is your control center for all of
              it.
            </p>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <p className="text-[15px] leading-relaxed">
                This is what customers see when they tap your card — it's
                already working. Go ahead, take a look:
              </p>
              {hubPath ? (
                <Button asChild className="min-h-[48px] w-full text-base">
                  <a href={hubPath} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View your live hub
                  </a>
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Your hub link is still being set up — it'll show up here as
                  soon as it's ready.
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                Everything customers see here is controlled from this
                dashboard — links, menu, photos, all of it.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              {levers.map((lever) => (
                <div
                  key={lever.title}
                  className="flex items-start gap-3 p-3 rounded-xl border border-border/60 bg-muted/30"
                >
                  <span
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                      lever.iconClass,
                    )}
                  >
                    <lever.icon className="w-5 h-5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{lever.title}</p>
                    <p className="text-sm text-muted-foreground mt-0.5 leading-snug">
                      {lever.body}
                    </p>
                    {lever.tab && onNavigateTab && (
                      <button
                        onClick={() => goToTab(lever.tab!)}
                        className="mt-1.5 min-h-[44px] inline-flex items-center gap-1 text-sm font-semibold text-primary"
                      >
                        Take me there
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-[15px] leading-relaxed">
                Put a card at the register and ask your staff to mention it at
                checkout — that's the{" "}
                <strong>#1 way owners get their first taps</strong>.
              </p>
              <div className="flex items-start gap-3 p-3 rounded-xl border border-amber-500/30 bg-amber-500/5">
                <span className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                  <Lightbulb className="w-5 h-5" />
                </span>
                <p className="text-sm leading-snug">
                  <span className="font-semibold">The "Get more taps" playbook</span>
                  <span className="text-muted-foreground">
                    {" "}on your Overview has six more quick wins like it —
                    receipts, your Instagram bio, Google profile, and more.
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div className="flex flex-col gap-2 pt-1">
          {step < lastStep ? (
            <div className="flex gap-2">
              {step > 0 && (
                <Button
                  variant="outline"
                  className="min-h-[48px] flex-1"
                  onClick={() => setStep((s) => s - 1)}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}
              <Button
                className="min-h-[48px] flex-1"
                onClick={() => setStep((s) => s + 1)}
              >
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Button className="min-h-[48px] w-full text-base" onClick={dismiss}>
                Show me my dashboard
              </Button>
              <Button
                variant="outline"
                className="min-h-[48px] w-full"
                onClick={goToPlaybook}
              >
                <Lightbulb className="w-4 h-4 mr-2" />
                Get the playbook
              </Button>
            </div>
          )}
          {step < lastStep && (
            <button
              onClick={dismiss}
              className="min-h-[44px] text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Skip tour
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
