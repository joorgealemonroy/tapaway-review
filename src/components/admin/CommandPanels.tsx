import { ReactNode } from "react";

export const Panel = ({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div className={`rounded-xl border border-white/5 bg-white/[0.02] p-5 ${className}`}>
    {children}
  </div>
);

export const SectionHeader = ({
  title,
  sub,
  chip,
}: {
  title: string;
  sub: string;
  chip?: string;
}) => (
  <div className="mb-3 flex items-start justify-between gap-3">
    <div>
      <h3 className="text-white font-medium">{title}</h3>
      <p className="text-sm text-white/40">{sub}</p>
    </div>
    {chip && (
      <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-white/70 tabular-nums">
        {chip}
      </span>
    )}
  </div>
);

export const LoadingSkeleton = () => (
  <div className="space-y-2 animate-pulse">
    {[0, 1, 2].map((i) => (
      <div key={i} className="h-11 rounded-lg bg-white/[0.04]" />
    ))}
  </div>
);

export const EmptyState = ({ text }: { text: string }) => (
  <div className="py-6 text-center text-sm text-white/40">{text}</div>
);

/** Tappable row used across command-center lists. Big touch target. */
export const ActionRow = ({
  onTap,
  children,
}: {
  onTap?: () => void;
  children: ReactNode;
}) => (
  <button
    onClick={onTap}
    className="w-full flex items-center justify-between gap-3 px-3 py-3.5 rounded-lg hover:bg-white/[0.04] active:bg-white/[0.06] text-left transition-colors min-h-[56px]"
  >
    {children}
  </button>
);

export const KindBadge = ({ kind }: { kind: "solo" | "business" }) => (
  <span
    className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${
      kind === "solo" ? "bg-sky-400/10 text-sky-300/80" : "bg-violet-400/10 text-violet-300/80"
    }`}
  >
    {kind === "solo" ? "Solo" : "Biz"}
  </span>
);
