import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { LeaderboardRow } from "@/hooks/useAdminOverview";
import {
  ActionRow,
  EmptyState,
  KindBadge,
  LoadingSkeleton,
  Panel,
  SectionHeader,
} from "./CommandPanels";

/**
 * ADMIN ONLY — never import this into client-facing code. It ranks Jorge's
 * own businesses by tap volume for his eyes only.
 */
const Trend = ({ pct }: { pct: number | null }) => {
  if (pct === null) {
    return <span className="text-xs text-white/35">new</span>;
  }
  if (Math.abs(pct) < 10) {
    return (
      <span className="flex items-center gap-1 text-xs text-white/40">
        <Minus className="h-3.5 w-3.5" /> {pct >= 0 ? "+" : ""}
        {pct}%
      </span>
    );
  }
  if (pct > 0) {
    return (
      <span className="flex items-center gap-1 text-xs text-emerald-300 tabular-nums">
        <TrendingUp className="h-3.5 w-3.5" /> +{pct}%
      </span>
    );
  }
  // Low numbers are framed as trends, not failure: neutral white, never red.
  return (
    <span className="flex items-center gap-1 text-xs text-white/40 tabular-nums">
      <TrendingDown className="h-3.5 w-3.5" /> {pct}%
    </span>
  );
};

const TapLeaderboard = ({
  leaderboard,
  loading,
  onOpenAccounts,
}: {
  leaderboard: LeaderboardRow[];
  loading: boolean;
  onOpenAccounts: () => void;
}) => (
  <Panel>
    <SectionHeader
      title="Tap leaderboard · 30 days"
      sub="Taps per business vs the prior 30 days."
      chip={leaderboard.length ? `top ${leaderboard.length}` : undefined}
    />
    {loading ? (
      <LoadingSkeleton />
    ) : leaderboard.length === 0 ? (
      <EmptyState text="No taps recorded in the last 30 days." />
    ) : (
      <div className="divide-y divide-white/5">
        {leaderboard.map((row, i) => (
          <ActionRow key={`${row.kind}-${row.id}`} onTap={onOpenAccounts}>
            <span className="flex items-center gap-2.5 min-w-0">
              <span className="w-6 shrink-0 text-xs text-white/35 tabular-nums">{i + 1}</span>
              <KindBadge kind={row.kind} />
              <span className="text-sm text-white/85 truncate">{row.name}</span>
            </span>
            <span className="flex items-center gap-3 shrink-0">
              <span className="text-sm font-semibold text-white tabular-nums">
                {row.taps.toLocaleString()}
              </span>
              <Trend pct={row.trendPct} />
            </span>
          </ActionRow>
        ))}
      </div>
    )}
  </Panel>
);

export default TapLeaderboard;
