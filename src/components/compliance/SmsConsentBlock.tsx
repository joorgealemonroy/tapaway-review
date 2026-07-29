import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  SMS_MARKETING_CONSENT_TEXT,
  SMS_TRANSACTIONAL_CONSENT_TEXT,
} from "@/lib/smsConsent";

interface Props {
  /** Optional id prefix for the two checkbox inputs. */
  id?: string;
  marketingChecked: boolean;
  onMarketingChange: (checked: boolean) => void;
  transactionalChecked: boolean;
  onTransactionalChange: (checked: boolean) => void;
  /** Mark the marketing box as `aria-required`. Defaults to true. */
  requireMarketing?: boolean;
  /** Mark the transactional box as `aria-required`. Defaults to false. */
  requireTransactional?: boolean;
  /** When true, renders as a compact disclosure block instead of a boxed callout. */
  compact?: boolean;
}

/**
 * A2P 10DLC compliant dual SMS consent block.
 *
 * Renders TWO INDEPENDENT unchecked-by-default checkboxes — one for MARKETING
 * texts (promos/discounts/loyalty), one for TRANSACTIONAL texts (review
 * reminders/service notifications). Carriers require these two campaigns to
 * have separate opt-ins with their own disclosures; ticking one MUST NOT tick
 * the other.
 */
export const SmsConsentBlock = ({
  id = "sms-consent",
  marketingChecked,
  onMarketingChange,
  transactionalChecked,
  onTransactionalChange,
  requireMarketing = true,
  requireTransactional = false,
  compact,
}: Props) => {
  const wrapperClass = compact
    ? "space-y-3"
    : "rounded-lg border border-border bg-muted/30 p-3 space-y-3";

  return (
    <div className={wrapperClass}>
      <div className="flex items-start gap-3">
        <Checkbox
          id={`${id}-marketing`}
          checked={marketingChecked}
          onCheckedChange={(v) => onMarketingChange(v === true)}
          className="mt-1"
          aria-required={requireMarketing ? "true" : undefined}
        />
        <Label
          htmlFor={`${id}-marketing`}
          className="text-xs leading-snug text-muted-foreground font-normal cursor-pointer"
        >
          <span className="font-semibold text-foreground block mb-1">
            Marketing Texts (promotions, discounts, loyalty rewards)
          </span>
          {SMS_MARKETING_CONSENT_TEXT}
        </Label>
      </div>

      <div className="flex items-start gap-3">
        <Checkbox
          id={`${id}-transactional`}
          checked={transactionalChecked}
          onCheckedChange={(v) => onTransactionalChange(v === true)}
          className="mt-1"
          aria-required={requireTransactional ? "true" : undefined}
        />
        <Label
          htmlFor={`${id}-transactional`}
          className="text-xs leading-snug text-muted-foreground font-normal cursor-pointer"
        >
          <span className="font-semibold text-foreground block mb-1">
            Review Reminders & Service Notifications
          </span>
          {SMS_TRANSACTIONAL_CONSENT_TEXT}
        </Label>
      </div>

      <p className="text-[11px] text-muted-foreground pl-7">
        Each opt-in is independent — checking one does not enroll you in the other. See our{" "}
        <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline">
          Privacy Policy
        </a>{" "}
        and{" "}
        <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline">
          Terms of Service
        </a>
        .
      </p>
    </div>
  );
};
