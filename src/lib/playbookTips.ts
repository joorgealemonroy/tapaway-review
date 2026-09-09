/**
 * "Get more taps" playbook — bite-size, plain-language tips surfaced
 * contextually on the client dashboards (next to low-tap nudges), never as a
 * docs dump. Each tip is 1–2 sentences in the client voice: modern, confident,
 * casual. No corporate fluff, no shaming.
 *
 * Tabs are dashboard tab values; null when the tip is a real-world action
 * with no fitting tab. The engagement UI only renders a "take me there"
 * button when the tab exists for the current dashboard kind.
 */

export interface PlaybookTip {
  id: string;
  title: string;
  /** 1–2 sentences, plain language. */
  body: string;
  businessTab: string | null;
  businessTabLabel: string | null;
  personalTab: string | null;
  personalTabLabel: string | null;
}

export const PLAYBOOK_TIPS: PlaybookTip[] = [
  {
    id: "counter",
    title: "Put a card at the register",
    body: "The easiest tap you'll ever get is at checkout — customers are already standing there with their phone out. Leave a card by the card reader or hand one over with the receipt.",
    businessTab: null,
    businessTabLabel: null,
    personalTab: null,
    personalTabLabel: null,
  },
  {
    id: "staff-mention",
    title: "Ask your staff to mention it",
    body: "\u201cTap here for 10% off your next visit\u201d takes five seconds at checkout and works better than any sign. Tie it to a promotion so there's a reason to tap.",
    businessTab: "engagement",
    businessTabLabel: "Create a promotion",
    personalTab: null,
    personalTabLabel: null,
  },
  {
    id: "receipts",
    title: "Put your QR on receipts",
    body: "Add your hub's QR code to printed receipts or the table's Wi-Fi card. People scan while they're waiting — that's dead time turned into taps.",
    businessTab: "settings",
    businessTabLabel: "Open Settings",
    personalTab: null,
    personalTabLabel: null,
  },
  {
    id: "instagram",
    title: "Link it in your Instagram bio",
    body: "Your hub link is one bio line away from turning followers into reviewers. Swap the link in, keep everything else — takes two minutes.",
    businessTab: "settings",
    businessTabLabel: "Open Settings",
    personalTab: "links",
    personalTabLabel: "Edit your links",
  },
  {
    id: "sms-followup",
    title: "Text customers after their visit",
    body: "A quick \u201cThanks for coming in — tap here to leave a review\u201d text the same day is the highest-converting nudge there is. Most people just need the reminder.",
    businessTab: "sms",
    businessTabLabel: "Open SMS",
    personalTab: "sms",
    personalTabLabel: "Open SMS",
  },
  {
    id: "google-profile",
    title: "Add it to your Google Business profile",
    body: "Your hub link belongs on your Google Business profile too — it's free, and it catches people right when they're looking you up.",
    businessTab: "settings",
    businessTabLabel: "Open Settings",
    personalTab: null,
    personalTabLabel: null,
  },
  {
    id: "poll",
    title: "Ask one question this week",
    body: "A poll like \u201cWhat should our next special be?\u201d gives regulars a reason to tap again — and tells you exactly what they want.",
    businessTab: "engagement",
    businessTabLabel: "Create a poll",
    personalTab: null,
    personalTabLabel: null,
  },
];

/**
 * Tips that have a tap-through tab for the given dashboard kind — these are
 * the only ones eligible to pair with a usage nudge (the nudge promises a
 * button that takes the owner somewhere).
 */
export function actionableTips(kind: "business" | "personal"): PlaybookTip[] {
  return PLAYBOOK_TIPS.filter((t) =>
    kind === "business" ? t.businessTab !== null : t.personalTab !== null,
  );
}

/** Day-of-year (1–366) used to rotate tips daily — stable within a day. */
export function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86_400_000);
}
