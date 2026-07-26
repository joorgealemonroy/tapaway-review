import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { SMS_CONSENT_TEXT } from "@/lib/smsConsent";

interface Props {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** When true, renders as a compact disclosure paragraph beneath the checkbox instead of a boxed callout. */
  compact?: boolean;
}

/**
 * A2P 10DLC compliant SMS consent block.
 *
 * Renders an UNCHECKED-BY-DEFAULT checkbox with the exact consent copy required
 * by carrier reviewers, plus direct links to /privacy and /terms. Every
 * phone-collecting form on the site must gate submission on this checkbox.
 */
export const SmsConsentBlock = ({ id = "sms-consent", checked, onChange, compact }: Props) => {
  return (
    <div className={compact ? "space-y-2" : "rounded-lg border border-border bg-muted/30 p-3 space-y-2"}>
      <div className="flex items-start gap-3">
        <Checkbox
          id={id}
          checked={checked}
          onCheckedChange={(v) => onChange(v === true)}
          className="mt-1"
          aria-required="true"
        />
        <Label
          htmlFor={id}
          className="text-xs leading-snug text-muted-foreground font-normal cursor-pointer"
        >
          {SMS_CONSENT_TEXT}
        </Label>
      </div>
      <p className="text-[11px] text-muted-foreground pl-7">
        See our{" "}
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
