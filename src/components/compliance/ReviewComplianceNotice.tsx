import { ShieldCheck } from "lucide-react";

interface ReviewComplianceNoticeProps {
  /** "light" for the dark rep/admin surfaces, "muted" for standard dashboard cards. */
  tone?: "light" | "muted";
  className?: string;
}

/**
 * FTC / search-engine review-policy disclosure. Shown wherever a review link is
 * configured (hub editor, rep demo builder) so operators are told up front that
 * review gating and incentivised reviews are prohibited.
 */
export const ReviewComplianceNotice = ({ tone = "muted", className = "" }: ReviewComplianceNoticeProps) => {
  const isLight = tone === "light";
  return (
    <div
      className={`flex items-start gap-3 rounded-xl border p-3 ${
        isLight ? "border-white/10 bg-white/[0.03]" : "border-border bg-muted/40"
      } ${className}`}
    >
      <ShieldCheck
        className={`mt-0.5 h-4 w-4 shrink-0 ${isLight ? "text-emerald-300" : "text-emerald-600 dark:text-emerald-400"}`}
      />
      <div className={`text-xs leading-relaxed ${isLight ? "text-white/60" : "text-muted-foreground"}`}>
        <span className={isLight ? "font-semibold text-white/80" : "font-semibold text-foreground"}>
          Review policy:{" "}
        </span>
        TapAway facilitates direct customer feedback links in full compliance with search engine guidelines. Every
        customer must be offered the same link — do not filter or "gate" who is asked, do not offer discounts, gifts or
        any other incentive in exchange for a review, and never require that feedback be positive. Reviews must be the
        customer's own, unprompted opinion.
      </div>
    </div>
  );
};

export default ReviewComplianceNotice;
