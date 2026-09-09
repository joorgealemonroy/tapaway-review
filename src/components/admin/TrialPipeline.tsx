import { MessageSquareText, PhoneOff, Timer } from "lucide-react";
import { FollowupDue, TrialAccount } from "@/hooks/useAdminOverview";
import {
  ActionRow,
  EmptyState,
  KindBadge,
  LoadingSkeleton,
  Panel,
  SectionHeader,
} from "./CommandPanels";

const DAY_LABEL: Record<3 | 10 | 13, string> = {
  3: "Day 3 — check-in text",
  10: "Day 10 — 4-days-left text",
  13: "Day 13 — final call text",
};

const TrialPipeline = ({
  trials,
  followupsDue,
  loading,
  onOpenAccounts,
}: {
  trials: TrialAccount[];
  followupsDue: FollowupDue[];
  loading: boolean;
  onOpenAccounts: () => void;
}) => {
  const expiring = trials.filter((t) => t.daysLeft !== null && t.daysLeft <= 7);

  return (
    <Panel>
      <SectionHeader
        title="Trial pipeline"
        sub="Who to close before the trial runs out."
        chip={`${trials.length} on trial`}
      />

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <div className="space-y-5">
          {/* Stat chips */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "On trial", value: trials.length },
              { label: "Expiring ≤7d", value: expiring.length, hot: expiring.length > 0 },
              { label: "Texts due today", value: followupsDue.length, hot: followupsDue.length > 0 },
            ].map((s) => (
              <div
                key={s.label}
                className={`rounded-lg border px-3 py-2.5 ${
                  s.hot ? "border-amber-500/30 bg-amber-500/[0.06]" : "border-white/5 bg-white/[0.02]"
                }`}
              >
                <div className={`text-2xl font-semibold tabular-nums ${s.hot ? "text-amber-200" : "text-white"}`}>
                  {s.value}
                </div>
                <div className="text-[11px] text-white/40 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Follow-ups due today */}
          <div>
            <div className="text-xs uppercase tracking-widest text-white/40 mb-1 flex items-center gap-1.5">
              <MessageSquareText className="h-3.5 w-3.5" /> Follow-ups due today
            </div>
            {followupsDue.length === 0 ? (
              <p className="text-sm text-white/40 py-2">Nothing to send — the daily job has today covered.</p>
            ) : (
              <div className="divide-y divide-white/5">
                {followupsDue.map((f) => (
                  <ActionRow key={f.id} onTap={onOpenAccounts}>
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="text-sm text-white/85 truncate">{f.name}</span>
                      {!f.hasPhone && (
                        <span className="shrink-0 flex items-center gap-1 rounded bg-white/[0.05] px-1.5 py-0.5 text-[10px] text-white/50">
                          <PhoneOff className="h-3 w-3" /> no phone — reach out manually
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-amber-200/90 shrink-0">{DAY_LABEL[f.day]}</span>
                  </ActionRow>
                ))}
              </div>
            )}
          </div>

          {/* Expiring soon */}
          <div>
            <div className="text-xs uppercase tracking-widest text-white/40 mb-1 flex items-center gap-1.5">
              <Timer className="h-3.5 w-3.5" /> Trials expiring in 7 days
            </div>
            {expiring.length === 0 ? (
              <EmptyState text="No trials expiring this week." />
            ) : (
              <div className="divide-y divide-white/5">
                {expiring.map((t) => (
                  <ActionRow key={t.id} onTap={onOpenAccounts}>
                    <span className="flex items-center gap-2 min-w-0">
                      <KindBadge kind={t.kind} />
                      <span className="text-sm text-white/85 truncate">{t.name}</span>
                    </span>
                    <span
                      className={`text-xs shrink-0 tabular-nums ${
                        (t.daysLeft ?? 99) <= 2 ? "text-amber-200" : "text-white/50"
                      }`}
                    >
                      {t.daysLeft === 0 ? "ends today" : `${t.daysLeft}d left`}
                    </span>
                  </ActionRow>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Panel>
  );
};

export default TrialPipeline;
