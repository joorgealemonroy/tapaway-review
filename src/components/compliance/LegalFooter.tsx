import { Link } from "react-router-dom";

interface LegalFooterProps {
  /** "light" for dark backgrounds, "muted" for standard app surfaces. */
  tone?: "light" | "muted";
  className?: string;
}

/**
 * Shared legal footer. Every public page, auth screen and dashboard must expose
 * working Terms / Privacy / Support links.
 */
export const LegalFooter = ({ tone = "muted", className = "" }: LegalFooterProps) => {
  const base =
    tone === "light"
      ? "text-white/40 hover:text-white/70"
      : "text-muted-foreground hover:text-foreground";

  return (
    <footer
      className={`w-full py-6 text-center text-xs ${tone === "light" ? "text-white/30" : "text-muted-foreground"} ${className}`}
    >
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        <Link to="/terms" className={`${base} underline decoration-dotted underline-offset-2 transition-colors`}>
          Terms of Service
        </Link>
        <Link to="/privacy" className={`${base} underline decoration-dotted underline-offset-2 transition-colors`}>
          Privacy Policy
        </Link>
        <Link to="/support" className={`${base} underline decoration-dotted underline-offset-2 transition-colors`}>
          Support
        </Link>
      </div>
      <p className="mt-2">© {new Date().getFullYear()} TapAway. All rights reserved.</p>
    </footer>
  );
};

export default LegalFooter;
