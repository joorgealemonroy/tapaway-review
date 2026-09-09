import { AtRiskRow } from "@/hooks/useAdminOverview";
import {
  ActionRow,
  EmptyState,
  KindBadge,
  LoadingSkeleton,
  Panel,
  SectionHeader,
} from "./CommandPanels";

const relative = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
};

const AtRiskList = ({
  atRisk,
  loading,
  onOpenAccounts,
}: {
  atRisk: AtRiskRow[];
  loading: boolean;
  onOpenAccounts: () => void;
}) => (
  <Panel>
    <SectionHeader
      title="At risk"
      sub="Past-due and recently canceled accounts — worth a save attempt."
      chip={atRisk.length ? `${atRisk.length}` : undefined}
    />
    {loading ? (
      <LoadingSkeleton />
    ) : atRisk.length === 0 ? (
      <EmptyState text="Nothing at risk — no past-due or canceled accounts in the last 14 days." />
    ) : (
      <div className="divide-y divide-white/5">
        {atRisk.map((r) => (
          <ActionRow key={`${r.kind}-${r.id}`} onTap={onOpenAccounts}>
            <span className="flex items-center gap-2 min-w-0">
              <KindBadge kind={r.kind} />
              <span className="text-sm text-white/85 truncate">{r.name}</span>
            </span>
            <span className="flex items-center gap-2 shrink-0">
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${
                  r.reason === "past_due"
                    ? "bg-amber-400/10 text-amber-200"
                    : "bg-white/[0.05] text-white/50"
                }`}
              >
                {r.reason === "past_due" ? "past due" : "canceled"}
              </span>
              <span className="text-xs text-white/35">{r.at ? relative(r.at) : ""}</span>
            </span>
          </ActionRow>
        ))}
      </div>
    )}
    <p className="mt-3 text-[11px] text-white/30 leading-relaxed">
      “Canceled” uses the last-update timestamp (no cancel date is stored), so it’s
      approximate. Failed payments aren’t synced to the DB yet — Stripe invoice events
      would need a webhook handler to list them here.
    </p>
  </Panel>
);

export default AtRiskList;
