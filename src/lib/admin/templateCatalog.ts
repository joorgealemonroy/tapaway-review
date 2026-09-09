// Template catalog — metadata-only index for /admin/emails.
//
// This file contains NO email markup. Rendered previews always come from the
// canonical email-template-preview edge function (which renders
// supabase/functions/_shared/email.ts with sample data), so what Jorge sees
// in the gallery is exactly what clients receive. This catalog only provides
// the human-readable label + trigger description for the UI.
//
// This replaces the old local markup mirror (lib/admin/emailTemplates.ts),
// which drifted from the backend registry (different subjects, dark vs
// light brand) and has been retired.

export type TemplateKey =
  | "welcome"
  | "welcome_paid"
  | "card_printed"
  | "card_delivered"
  | "trial_ending"
  | "payment_failed"
  | "password_setup"
  | "feature_update";

export interface TemplateCatalogEntry {
  key: TemplateKey;
  label: string;
  /** What event causes this email to be sent. UI text only. */
  trigger: string;
}

export const TEMPLATE_CATALOG: TemplateCatalogEntry[] = [
  {
    key: "welcome",
    label: "Welcome",
    trigger: "Fires automatically when a new subscription activates after signup.",
  },
  {
    key: "welcome_paid",
    label: "Welcome (Paid Today)",
    trigger:
      "Fires when a new subscription activates with NO trial (discount pay links, any immediate-charge checkout) — honest 'charged today' copy.",
  },
  {
    key: "card_printed",
    label: "Cards Printed",
    trigger: "Sent when Jorge marks the card order as printed in the fulfillment pipeline.",
  },
  {
    key: "card_delivered",
    label: "Cards Delivered",
    trigger: "Sent when cards ship or are handed over in person (delivery step).",
  },
  {
    key: "trial_ending",
    label: "Trial Ending",
    trigger: "Sent automatically 3 days before a trial converts to paid billing.",
  },
  {
    key: "payment_failed",
    label: "Payment Failed",
    trigger: "Sent when a Stripe invoice payment fails (dunning).",
  },
  {
    key: "password_setup",
    label: "Password Setup",
    trigger:
      "Sent after van-mode/in-person payment — client sets their own password via link (Jorge never handles passwords in person).",
  },
  {
    key: "feature_update",
    label: "Feature Update",
    trigger:
      "Manual broadcast — Jorge composes these in /admin/emails → Compose. Sent to active (paying, non-comped, non-trialing) subscribers only.",
  },
];

export function templateLabel(key: string): string {
  return TEMPLATE_CATALOG.find((t) => t.key === key)?.label ?? key;
}
