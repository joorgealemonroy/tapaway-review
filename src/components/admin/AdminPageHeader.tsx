import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  /** Where the back control points. Defaults to the admin home. */
  backTo?: string;
  backLabel?: string;
}

/**
 * Shared admin page header. The back control is an explicit link rather than a
 * history.back() call so it always works on a deep link or a fresh tab.
 */
export const AdminPageHeader = ({
  title,
  subtitle,
  icon,
  actions,
  backTo = "/admin",
  backLabel = "Back to Admin",
}: AdminPageHeaderProps) => (
  <div className="sticky top-0 z-30 -mx-4 mb-6 border-b border-white/5 bg-[#0a0a0b]/90 px-4 py-3 backdrop-blur">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          to={backTo}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-white/70 transition hover:bg-white/[0.07] hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{backLabel}</span>
          <span className="sm:hidden">Admin</span>
        </Link>
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 truncate text-lg font-semibold text-white sm:text-2xl">
            {icon}
            {title}
          </h1>
          {subtitle && <p className="truncate text-xs text-white/40 sm:text-sm">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  </div>
);

export default AdminPageHeader;
