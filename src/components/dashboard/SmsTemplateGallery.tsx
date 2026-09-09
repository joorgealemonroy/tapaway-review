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
 * The STOP opt-out line is appended by the server — templates never include it.
 */
export interface SmsTemplate {
  id: string;
  name: string;
  hint: string;
  icon: LucideIcon;
  body: string;
}

export const SMS_TEMPLATES: SmsTemplate[] = [
  {
    id: "review-request",
    name: "Review request",
    hint: "Ask happy customers for a Google review",
    icon: Star,
    body: "Enjoyed {businessName}? A quick review would mean a lot to us: {hubLink}",
  },
  {
    id: "slow-day-deal",
    name: "Slow-day flash deal",
    hint: "Fill a quiet day with a same-day offer",
    icon: Zap,
    body: "Flash deal today only at {businessName}! Show this text to claim: {hubLink}",
  },
  {
    id: "new-item",
    name: "New item or service",
    hint: "Announce something new on the menu or service list",
    icon: Sparkles,
    body: "Something new at {businessName}! Come check it out: {hubLink}",
  },
  {
    id: "event-reminder",
    name: "Event reminder",
    hint: "Nudge your list about an upcoming event",
    icon: CalendarDays,
    body: "{businessName} event coming up! Details here: {hubLink}",
  },
  {
    id: "holiday-greeting",
    name: "Holiday greeting",
    hint: "Warm note for the holidays",
    icon: Heart,
    body: "Happy holidays from {businessName}! Thanks for all your support: {hubLink}",
  },
  {
    id: "win-back",
    name: "We miss you",
    hint: "Win back customers you haven't seen in a while",
    icon: Gift,
    body: "We miss you at {businessName}! Come see what's new: {hubLink}",
  },
  {
    id: "announcement",
    name: "Big announcement",
    hint: "Grand opening, new location, new hours, big news",
    icon: Megaphone,
    body: "Big news from {businessName}! Get the details here: {hubLink}",
  },
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
   * "Use this template". The id lets the tab know a review-request template
   * was used (the server enforces once-per-customer dedup for those sends).
   */
  onUse: (filledMessage: string, templateId: string) => void;
}

/**
 * Shared template gallery for both SMS tabs (Solo + business).
 * Compact accordion: tapping a template expands its filled preview with a
 * live character count; "Use this template" loads it into the composer
 * where the owner can edit before anything is ever sent.
 */
const SmsTemplateGallery = ({ businessName, hubLink, onUse }: SmsTemplateGalleryProps) => {
  const ctx = useMemo(() => ({ businessName, hubLink }), [businessName, hubLink]);

  return (
    <Card className="p-4 sm:p-6">
      <h3 className="font-semibold">Quick templates</h3>
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
                    <span className="block text-sm font-medium truncate">{t.name}</span>
                    <span className="block text-xs text-muted-foreground truncate">{t.hint}</span>
                  </span>
                </span>
                <span
                  className={cn(
                    "shrink-0 text-xs font-medium tabular-nums mr-2",
                    tooLong ? "text-destructive" : "text-muted-foreground",
                  )}
                  title={tooLong ? "Too long once your name and link are filled in — trim it in the composer" : "Characters after filling in your name and link"}
                >
                  {count}/{SMS_MAX_LEN}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-1">
                  <p className="text-sm bg-muted/60 rounded-lg p-3 whitespace-pre-wrap break-words">
                    {filled}
                  </p>
                  {tooLong && (
                    <p className="text-xs text-destructive">
                      This one's over 160 characters with your name and link — you
                      can still use it and trim it down in the composer.
                    </p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-[44px]"
                    onClick={() => onUse(filled, t.id)}
                  >
                    Use this template
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
