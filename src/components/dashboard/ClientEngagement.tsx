/**
 * ClientEngagement — shared engagement widgets for the client dashboards
 * (business + Solo). Drives real card/hub usage with gentle, never-shaming
 * encouragement:
 *
 * - MilestoneBadges: small celebratory moments (first tap, 10, 100, first
 *   review click). Each shows exactly once per account, tracked in
 *   localStorage. Never fabricated — only real counts.
 * - UsageNudge: "your cards haven't been tapped in X days", shown only when
 *   meaningful (see ENGAGEMENT-NUDGES.md for the exact rules), paired with
 *   one actionable playbook tip that deep-links to the right tab.
 * - PlaybookSection: 2 rotating bite-size tips + expandable full list.
 * - FeatureDiscovery: "Try this" cards for paid features genuinely unused.
 *
 * Mobile-first (390px), min 44px tap targets, no horizontal overflow.
 */

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Zap,
  Trophy,
  Star,
  Bell,
  Lightbulb,
  ChevronDown,
  ArrowRight,
  MessageSquare,
  Megaphone,
  BarChart3,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PLAYBOOK_TIPS,
  actionableTips,
  dayOfYear,
  type PlaybookTip,
} from "@/lib/playbookTips";

/* ------------------------------------------------------------------ *
 * Milestones
 * ------------------------------------------------------------------ */

export type ActivityNoun = "taps" | "visits";

interface MilestoneDef {
  id: string;
  qualifies: (totalActivity: number, reviewClicks: number) => boolean;
  icon: typeof Sparkles;
  iconClass: string;
  title: (noun: ActivityNoun) => string;
  message: (noun: ActivityNoun) => string;
}

const MILESTONES: MilestoneDef[] = [
  {
    id: "first-activity",
    qualifies: (total) => total >= 1,
    icon: Sparkles,
    iconClass: "bg-primary/10 text-primary",
    title: (noun) => (noun === "taps" ? "First tap! 🎉" : "First visit! 🎉"),
    message: () =>
      "Someone tapped through — it's working. Keep your cards where people can see them.",
  },
  {
    id: "activity-10",
    qualifies: (total) => total >= 10,
    icon: Zap,
    iconClass: "bg-amber-500/10 text-amber-600",
    title: (noun) => (noun === "taps" ? "10 taps" : "10 visits"),
    message: () => "Double digits! Momentum is building — nice work getting the word out.",
  },
  {
    id: "activity-100",
    qualifies: (total) => total >= 100,
    icon: Trophy,
    iconClass: "bg-emerald-500/10 text-emerald-600",
    title: (noun) => (noun === "taps" ? "100 taps" : "100 visits"),
    message: () => "Triple digits — your cards are doing real work for your business.",
  },
  {
    id: "first-review-click",
    qualifies: (_total, reviewClicks) => reviewClicks >= 1,
    icon: Star,
    iconClass: "bg-yellow-500/10 text-yellow-600",
    title: () => "First review click ⭐",
    message: () =>
      "Someone tapped through to leave you a review. That's the whole point — keep it coming.",
  },
];

const milestoneKey = (accountId: string) => `tapaway_milestones:${accountId}`;

function getSeenMilestones(accountId: string): string[] {
  try {
    const raw = localStorage.getItem(milestoneKey(accountId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function markMilestonesSeen(accountId: string, ids: string[]) {
  try {
    const seen = new Set(getSeenMilestones(accountId));
    ids.forEach((id) => seen.add(id));
    localStorage.setItem(milestoneKey(accountId), JSON.stringify([...seen]));
  } catch {
    // localStorage unavailable (private mode etc.) — milestones simply show
    // again next visit rather than crashing.
  }
}

export interface MilestoneBadgesProps {
  /** Account id (restaurant id or profile id) — seen state is keyed per account. */
  accountId: string;
  /** All-time tap/visit count — milestones come from real counts only. */
  totalActivity: number;
  /** All-time review-link clicks. */
  reviewClicks: number;
  noun: ActivityNoun;
}

/**
 * Renders newly-earned, not-yet-seen milestones as small celebratory cards
 * (a badge, not a modal). Marks them seen on display so each shows once.
 * Renders nothing when there is nothing new.
 */
export function MilestoneBadges({ accountId, totalActivity, reviewClicks, noun }: MilestoneBadgesProps) {
  const [fresh, setFresh] = useState<MilestoneDef[]>([]);

  useEffect(() => {
    if (!accountId) return;
    const seen = getSeenMilestones(accountId);
    const earned = MILESTONES.filter(
      (m) => m.qualifies(totalActivity, reviewClicks) && !seen.includes(m.id),
    );
    setFresh(earned);
    if (earned.length > 0) {
      markMilestonesSeen(
        accountId,
        earned.map((m) => m.id),
      );
    }
  }, [accountId, totalActivity, reviewClicks]);

  if (fresh.length === 0) return null;

  return (
    <section aria-label="Milestones" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {fresh.map((m) => {
        const Icon = m.icon;
        return (
          <Card
            key={m.id}
            className="p-4 card-elevated border-primary/20 bg-primary/5 animate-scale-in"
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                  m.iconClass,
                )}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm sm:text-base">{m.title(noun)}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{m.message(noun)}</p>
              </div>
            </div>
          </Card>
        );
      })}
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Usage nudge
 * ------------------------------------------------------------------ */

export interface UsageNudgeProps {
  /** Whole days since the last tap/visit. */
  daysIdle: number;
  noun: ActivityNoun;
  kind: "business" | "personal";
  onNavigateTab: (tab: string) => void;
}

/**
 * Gentle "your cards haven't been tapped in X days" nudge, paired with ONE
 * concrete playbook tip that deep-links to the relevant tab. The caller owns
 * the suppression rules (see ENGAGEMENT-NUDGES.md) — this component just
 * renders.
 */
export function UsageNudge({ daysIdle, noun, kind, onNavigateTab }: UsageNudgeProps) {
  const options = actionableTips(kind);
  if (options.length === 0) return null;
  // Rotate the paired tip by how long it's been idle — deterministic, so the
  // suggestion doesn't flip-flop between renders.
  const tip: PlaybookTip = options[daysIdle % options.length];
  const tab = kind === "business" ? tip.businessTab : tip.personalTab;
  const tabLabel = kind === "business" ? tip.businessTabLabel : tip.personalTabLabel;
  if (!tab) return null;

  const idleLabel =
    daysIdle >= 14 ? "over 2 weeks" : `${daysIdle} day${daysIdle === 1 ? "" : "s"}`;

  return (
    <Card className="p-4 sm:p-5 card-elevated border-amber-500/30 bg-amber-500/5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
          <Bell className="w-5 h-5 text-amber-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-sm sm:text-base">
            {noun === "taps"
              ? `Your cards haven't been tapped in ${idleLabel}`
              : `No visits to your hub in ${idleLabel}`}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            No stress — here's one easy win to get things moving again:
          </p>
          <div className="mt-3 rounded-lg bg-background border border-border p-3">
            <p className="text-sm font-semibold flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
              {tip.title}
            </p>
            <p className="text-sm text-muted-foreground mt-1">{tip.body}</p>
            <Button
              onClick={() => onNavigateTab(tab)}
              variant="outline"
              className="mt-3 min-h-[44px]"
            >
              {tabLabel ?? "Take me there"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ *
 * Playbook
 * ------------------------------------------------------------------ */

export interface PlaybookSectionProps {
  kind: "business" | "personal";
  onNavigateTab: (tab: string) => void;
}

/**
 * "Get more taps" — 2 rotating tips on the overview, expandable to the full
 * list. Tips rotate daily (stable within a day) so repeat visits feel fresh.
 */
export function PlaybookSection({ kind, onNavigateTab }: PlaybookSectionProps) {
  const [expanded, setExpanded] = useState(false);

  const start = dayOfYear(new Date()) % PLAYBOOK_TIPS.length;
  const rotated = [PLAYBOOK_TIPS[start], PLAYBOOK_TIPS[(start + 1) % PLAYBOOK_TIPS.length]];
  const shown = expanded ? PLAYBOOK_TIPS : rotated;

  const tabFor = (tip: PlaybookTip) =>
    kind === "business" ? tip.businessTab : tip.personalTab;
  const labelFor = (tip: PlaybookTip) =>
    kind === "business" ? tip.businessTabLabel : tip.personalTabLabel;

  return (
    <section aria-label="Get more taps" id="get-more-taps" className="scroll-mt-4">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-lg sm:text-xl font-bold">Get more taps</h2>
        <span className="text-sm text-muted-foreground">Small things, big difference</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {shown.map((tip) => {
          const tab = tabFor(tip);
          const label = labelFor(tip);
          return (
            <Card key={tip.id} className="p-4 card-elevated">
              <p className="text-sm font-semibold flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
                {tip.title}
              </p>
              <p className="text-sm text-muted-foreground mt-1">{tip.body}</p>
              {tab && (
                <button
                  onClick={() => onNavigateTab(tab)}
                  className="mt-2 min-h-[44px] inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                >
                  {label ?? "Take me there"}
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </Card>
          );
        })}
      </div>
      <button
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="mt-3 w-full min-h-[44px] inline-flex items-center justify-center gap-1 text-sm font-semibold text-primary"
      >
        {expanded ? "Show fewer tips" : `See all ${PLAYBOOK_TIPS.length} tips`}
        <ChevronDown className={cn("w-4 h-4 transition-transform", expanded && "rotate-180")} />
      </button>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Feature discovery
 * ------------------------------------------------------------------ */

export type DiscoveryFeatureId = "sms" | "customerInfo" | "promotions" | "polls";

export interface DiscoveryFeature {
  id: DiscoveryFeatureId;
  /** True when the owner has actually used the feature (checked from data). */
  used: boolean;
  tab: string;
  tabLabel: string;
}

const DISCOVERY_COPY: Record<
  DiscoveryFeatureId,
  { title: string; body: string; icon: typeof MessageSquare }
> = {
  sms: {
    title: "Text your customers",
    body: "Send deals and updates straight to their phones. Texts get opened — emails don't.",
    icon: MessageSquare,
  },
  customerInfo: {
    title: "Collect customer info",
    body: "Let visitors request a quote or leave their details right from your hub — their answers land in your inbox.",
    icon: Users,
  },
  promotions: {
    title: "Run a promotion",
    body: "Give tappers a reason to come back — a deal or offer, live on your hub in a minute.",
    icon: Megaphone,
  },
  polls: {
    title: "Ask a poll",
    body: "Ask customers what they want — new special, new hours? They'll tell you, and they'll tap to do it.",
    icon: BarChart3,
  },
};

export interface FeatureDiscoveryProps {
  features: DiscoveryFeature[];
  onNavigateTab: (tab: string) => void;
}

/**
 * "Try this" cards — one per paid feature the owner genuinely isn't using
 * yet (`used` is checked against real data by the caller). One plain-language
 * line on what it does, one tap to open the right tab. Renders nothing when
 * everything is already in use.
 */
export function FeatureDiscovery({ features, onNavigateTab }: FeatureDiscoveryProps) {
  const unused = features.filter((f) => !f.used);
  if (unused.length === 0) return null;

  return (
    <section aria-label="Try this">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-lg sm:text-xl font-bold">Try this</h2>
        <span className="text-sm text-muted-foreground">You're already paying for these</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {unused.map((f) => {
          const copy = DISCOVERY_COPY[f.id];
          const Icon = copy.icon;
          return (
            <Card key={f.id} className="p-4 card-elevated flex flex-col">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <p className="font-semibold text-sm sm:text-base">{copy.title}</p>
              </div>
              <p className="text-sm text-muted-foreground flex-1">{copy.body}</p>
              <Button
                onClick={() => onNavigateTab(f.tab)}
                variant="outline"
                className="mt-3 min-h-[44px] w-full"
              >
                {f.tabLabel}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
