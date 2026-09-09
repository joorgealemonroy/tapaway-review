import { MrrInfo } from "@/hooks/useAdminOverview";
import { Panel } from "./CommandPanels";

const MRR_GOAL = 10_000;

const fmtMoney = (n: number) =>
  "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });

const MrrGoalBar = ({
  mrr,
  loading,
}: {
  mrr: MrrInfo | null;
  loading: boolean;
}) => {
  const value = mrr?.mrr ?? 0;
  const pct = Math.min(100, (value / MRR_GOAL) * 100);

  return (
    <Panel className="border-primary/20 bg-primary/[0.04]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-white/40">
            Monthly recurring revenue
          </div>
          <div className="text-4xl font-bold text-white mt-2 tabular-nums">
            {loading ? (
              <span className="inline-block h-10 w-32 rounded bg-white/[0.06] animate-pulse" />
            ) : (
              fmtMoney(value)
            )}
          </div>
          <div className="text-xs text-white/40 mt-1">
            {loading ? (
              "…"
            ) : (
              <>
                {mrr?.paying ?? 0} paying account{(mrr?.paying ?? 0) === 1 ? "" : "s"} ·{" "}
                {mrr?.trialsActive ?? 0} on trial (not counted)
              </>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-semibold text-primary tabular-nums">
            {loading ? "—" : `${pct.toFixed(pct < 10 ? 1 : 0)}%`}
          </div>
          <div className="text-xs text-white/40">of {fmtMoney(MRR_GOAL)} goal</div>
        </div>
      </div>

      <div className="mt-4 h-3 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-700"
          style={{ width: `${Math.max(2, pct)}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-xs text-white/40 tabular-nums">
        <span>{loading ? "" : `${fmtMoney(value)} now`}</span>
        <span>{loading ? "" : `${fmtMoney(Math.max(0, MRR_GOAL - value))} to go`}</span>
      </div>
      <p className="mt-3 text-[11px] text-white/30 leading-relaxed">
        Derived from plan prices stored in the DB (no Stripe sync table exists).
        Counts active + past-due accounts, excludes comped and trials. Grandfathered
        $15 Solo plans read as $20 — slight overstatement until plans are reconciled.
      </p>
    </Panel>
  );
};

export default MrrGoalBar;
