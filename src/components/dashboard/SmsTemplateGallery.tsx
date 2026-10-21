import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Star,
  Zap,
  Sparkles,
  CalendarDays,
  Heart,
  Gift,
  Megaphone,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Must match the composer limit and the server-side check in send-mass-sms. */
export const SMS_MAX_LEN = 160;

/**
 * One pre-written message. `{businessName}` and `{hubLink}` are placeholders
 * filled from the owner's profile/restaurant when the gallery is shown.
 * The STOP opt-out line is appended by the server. Templates never include it.
 */
export interface SmsTemplate {
  id: string;
  name: string;
  hint: string;
  icon: LucideIcon;
  body: string;
}

export const SMS_TEMPLATES: SmsTemplate[] = [
  { id: "review-request", name: "Thank you + review", hint: "After a visit, invite honest feedback", icon: Star,
    body: "Thanks for visiting {businessName}! How was your experience? Share an honest review here: {hubLink}" },
  { id: "booking", name: "Barber or salon appointments", hint: "Help regulars find their next appointment", icon: CalendarDays,
    body: "Time for a fresh look? Find your next appointment with {businessName}: {hubLink}" },
  { id: "restaurant", name: "Dinner plans", hint: "Bring your menu to your regulars", icon: Heart,
    body: "Let {businessName} take care of dinner. Browse the menu and plan your next visit: {hubLink}" },
  { id: "coffee", name: "Coffee break", hint: "A friendly invitation from your cafe", icon: Heart,
    body: "Your next coffee break is calling. Stop by {businessName} for a little pick-me-up. Find us: {hubLink}" },
  { id: "auto", name: "Wraps or detailing", hint: "Invite customers to explore services", icon: Sparkles,
    body: "Ready to give your ride some attention? Explore services and get in touch with {businessName}: {hubLink}" },
  { id: "win-back", name: "Welcome back", hint: "Reconnect without inventing a discount", icon: Gift,
    body: "It's been a while! We'd love to see you again at {businessName}. Plan your next visit: {hubLink}" },
  { id: "halloween", name: "Halloween hello", hint: "A seasonal invitation, no made-up offer", icon: Sparkles,
    body: "Happy Halloween from {businessName}! Make us part of your plans. Find our details here: {hubLink}" },
  { id: "thanksgiving", name: "A little gratitude", hint: "Thank your community this Thanksgiving", icon: Heart,
    body: "This Thanksgiving, we're grateful for you. Thanks for supporting {businessName} and shopping local! {hubLink}" },
  { id: "christmas", name: "Christmas wishes", hint: "Keep it warm and personal", icon: Gift,
    body: "Merry Christmas from {businessName}! Wishing you a wonderful season. Thanks for being part of our community. {hubLink}" },
];

export interface SmsTemplateContext {
  businessName: string;
  hubLink: string;
}

export function fillSmsTemplate(body: string, ctx: SmsTemplateContext): string {
  const name = ctx.businessName || "us";
  const link = ctx.hubLink || "";
  return body.replace(/\{businessName\}/g, name).replace(/\{hubLink\}/g, link);
}

export function smsCharCount(text: string): number {
  return text.length;
}

interface SmsTemplateGalleryProps {
  /** Display name of the business/solo profile (fills {businessName}). */
  businessName: string;
  /** Public hub URL (fills {hubLink}). */
  hubLink: string;
  /**
   * Called with the filled message and the template's id when the owner taps
   * "Use this draft". The id lets the tab know a review-request template
   * was used (the server enforces once-per-customer dedup for those sends).
   */
  onUse: (filledMessage: string, templateId: string) => void;
}

/**
 * Shared template gallery for both SMS tabs (Solo + business).
 * Compact accordion: tapping a template expands its filled preview with a
 * live character count; "Use this draft" loads it into the composer
 * where the owner can edit before anything is ever sent.
 */
const SmsTemplateGallery = ({ businessName, hubLink, onUse }: SmsTemplateGalleryProps) => {
  const ctx = useMemo(() => ({ businessName, hubLink }), [businessName, hubLink]);

  return (
    <Card className="p-4 sm:p-6">
      <h3 className="font-semibold">Ready-to-use drafts</h3>
      <p className="text-xs text-muted-foreground mt-1 mb-2">
        Tap one to load it into the composer below, then make it yours. Nothing
        sends until you review and confirm it.
      </p>

      <Accordion type="single" collapsible className="w-full">
        {SMS_TEMPLATES.map((t) => {
          const filled = fillSmsTemplate(t.body, ctx);
          const count = smsCharCount(filled);
          const tooLong = count > SMS_MAX_LEN;
          const Icon = t.icon;
          return (
            <AccordionItem key={t.id} value={t.id}>
              <AccordionTrigger className="py-3 min-h-[48px] hover:no-underline text-left">
                <span className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="h-9 w-9 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-primary" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{t.name}</span>
                    <span className="block text-xs text-muted-foreground leading-relaxed">{t.hint}</span>
                  </span>
                </span>
                <span
                  className={cn(
                    "shrink-0 text-xs font-medium tabular-nums mr-2",
                    tooLong ? "text-destructive" : "text-muted-foreground",
                  )}
                  title={tooLong ? "Too long once your name and link are filled in. Trim it in the composer" : "Characters after filling in your name and link"}
                >
                  {count}/{SMS_MAX_LEN}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-1">
                  <p className="text-sm bg-emerald-50 text-slate-800 rounded-2xl p-4 whitespace-pre-wrap break-words">
                    {filled}
                  </p>
                  {tooLong && (
                    <p className="text-xs text-destructive">
                      This one's over 160 characters with your name and link. You
                      can still use it and trim it down in the composer.
                    </p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-[44px]"
                    onClick={() => { onUse(filled, t.id); requestAnimationFrame(() => { const composer = document.querySelector<HTMLTextAreaElement>("textarea"); composer?.scrollIntoView({ behavior: "smooth", block: "center" }); composer?.focus({ preventScroll: true }); }); }}
                  >
                    Use this draft
                  </Button>
                  {t.id === "review-request" && (
                    <p className="text-xs text-muted-foreground">
                      Once per customer, ever: anyone who&apos;s already gotten a
                      review request from you won&apos;t be texted again.
                    </p>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </Card>
  );
};

export default SmsTemplateGallery;
