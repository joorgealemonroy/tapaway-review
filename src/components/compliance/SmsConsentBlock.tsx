import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  SMS_MARKETING_CONSENT_TEXT,
  SMS_TRANSACTIONAL_CONSENT_TEXT,
  SMS_MARKETING_SHORT_LABEL,
  SMS_TRANSACTIONAL_SHORT_LABEL,
  SMS_SHORT_RATES_NOTE,
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

interface RowProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  required?: boolean;
  optional?: boolean;
  shortLabel: string;
  fullText: string;
}

const ConsentRow = ({
  id,
  checked,
  onChange,
  required,
  optional,
  shortLabel,
  fullText,
}: RowProps) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex items-start gap-3">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(v) => onChange(v === true)}
        className="mt-0.5"
        aria-required={required ? "true" : undefined}
      />
      <div className="min-w-0 flex-1">
        <Label
          htmlFor={id}
          className="text-sm font-medium leading-snug cursor-pointer flex flex-wrap items-center gap-x-2"
        >
          {shortLabel}
          {optional && (
            <span className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">
              Optional
            </span>
          )}
        </Label>
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
          {SMS_SHORT_RATES_NOTE}
        </p>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
        >
          Full terms
          <ChevronDown
            className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>
        {expanded && (
          <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
            {fullText}
          </p>
        )}
      </div>
    </div>
  );
};

/**
 * A2P 10DLC compliant dual SMS consent block.
 *
 * Renders TWO INDEPENDENT unchecked-by-default checkboxes — one for MARKETING
 * texts (promos/discounts/loyalty), one for TRANSACTIONAL texts (review
 * reminders/service notifications). Carriers require these two campaigns to
 * have separate opt-ins with their own disclosures; ticking one MUST NOT tick
 * the other. Each row shows a short summary with the key rate/STOP disclosure
 * inline, plus the full consent language one tap away.
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
      <ConsentRow
        id={`${id}-marketing`}
        checked={marketingChecked}
        onChange={onMarketingChange}
        required={requireMarketing}
        shortLabel={SMS_MARKETING_SHORT_LABEL}
        fullText={SMS_MARKETING_CONSENT_TEXT}
      />

      <ConsentRow
        id={`${id}-transactional`}
        checked={transactionalChecked}
        onChange={onTransactionalChange}
        required={requireTransactional}
        optional={!requireTransactional}
        shortLabel={SMS_TRANSACTIONAL_SHORT_LABEL}
        fullText={SMS_TRANSACTIONAL_CONSENT_TEXT}
      />

      <p className="text-[11px] text-muted-foreground pl-7">
        Each opt-in is independent — checking one does not enroll you in the other.{" "}
        <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline">
          Privacy
        </a>{" "}
        ·{" "}
        <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline">
          Terms
        </a>
      </p>
    </div>
  );
};
