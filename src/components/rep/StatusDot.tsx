export const PIPELINE_STATUSES = [
  { value: 'draft',             label: 'Draft Profile',             dot: 'bg-slate-400',   ring: 'ring-slate-400/30' },
  { value: 'ready_for_review',  label: 'In Progress · Awaiting Approval', dot: 'bg-blue-400', ring: 'ring-blue-400/30' },
  { value: 'changes_requested', label: 'Changes Requested',         dot: 'bg-amber-400',   ring: 'ring-amber-400/30' },
  { value: 'card_ready',        label: 'NFC Card Printed',          dot: 'bg-amber-400',   ring: 'ring-amber-400/30' },
  { value: 'delivered',         label: 'Delivered · 5-Day Trial',   dot: 'bg-blue-400',    ring: 'ring-blue-400/30' },
  { value: 'converted',         label: 'Paying Customer',           dot: 'bg-emerald-400', ring: 'ring-emerald-400/30' },
  { value: 'inactive',          label: 'No Interest',               dot: 'bg-zinc-500',    ring: 'ring-zinc-500/30' },
] as const;

export type PipelineStatus = (typeof PIPELINE_STATUSES)[number]['value'];

export const StatusDot = ({ status }: { status: string }) => {
  const cfg = PIPELINE_STATUSES.find(s => s.value === status) || PIPELINE_STATUSES[0];
  return <span className={`h-2 w-2 rounded-full ${cfg.dot} ring-2 ${cfg.ring}`} />;
};
