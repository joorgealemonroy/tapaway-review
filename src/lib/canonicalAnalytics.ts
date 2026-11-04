import { supabase } from '@/integrations/supabase/client';

export type HubKind = 'solo' | 'business';
export type ReportSource = 'filtered' | 'historical';
export type ReportHub = { id: string; kind: HubKind; name: string; slug: string | null };
export type Activity = { key: string; at: string; hub: ReportHub; event: string; label: string | null; source: string };
export type Cursor = { at: string; id: string };
export interface AnalyticsReport {
  meta: { since: string; until: string; asOf: string; timezone: string; days: number; coverage: string; firstRecordedAt: string | null; source?: ReportSource };
  hub: ReportHub | null;
  totals: { site_views: number; hub_views: number; sessions: number | null; clicks: number; saves: number; events: number; excluded: number };
  daily: { day: string; events: Record<string, number> }[];
  events: { event_name: string; events: number; sessions: number }[];
  links: { event_name: string; label: string; clicks: number }[];
  devices: { name: string; views: number }[];
  sources: { source: string; views: number }[];
  hubs: (ReportHub & { events: number; views: number; clicks: number; saves: number; last_active_at: string })[];
  hubCount: number;
  activityCount: number;
  activity: Activity[];
  nextCursor: Cursor | null;
}
export type ReportRequest = { days?: number; kind?: HubKind; hubId?: string; search?: string; until?: string; since?: string; cursor?: Cursor; page?: number; event?: string; source?: ReportSource };
export async function fetchAnalyticsReport(request: ReportRequest = {}): Promise<AnalyticsReport> {
  const rpc = supabase.rpc.bind(supabase) as unknown as (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: Error | null }>;
  const { data, error } = await rpc(request.source === 'historical' ? 'historical_analytics_report' : 'canonical_analytics_report', {
    _days: request.days ?? 30, _kind: request.kind ?? null, _hub: request.hubId ?? null,
    _search: request.search ?? '', _until: request.until ?? null, _since: request.since ?? null,
    _cursor_at: request.cursor?.at ?? null, _cursor_id: request.cursor?.id ?? null,
    _page: request.page ?? 0, _event: request.event ?? null,
  });
  if (error) throw error;
  if (!data || typeof data !== 'object' || Array.isArray(data) || !('meta' in data) || !('totals' in data)) throw new Error('Report unavailable');
  return data as unknown as AnalyticsReport;
}
export const eventLabel = (event: string): string => ({
  hub_view: 'Hub viewed', link_click: 'Link clicked', review_click: 'Review link clicked',
  social_click: 'Social link clicked', menu_view: 'Menu opened', directions_click: 'Directions clicked',
  call_click: 'Call link clicked', text_click: 'Text link clicked', website_click: 'Website clicked',
  contact_save: 'Contact save action', lead_submit: 'Lead form submitted',
}[event] ?? event.replace(/_/g, ' '));
export const reportTime = (iso: string): string => new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
}).format(new Date(iso));

/** Quote every cell and neutralize spreadsheet formulas, including whitespace-prefixed formulas. */
export function csvCell(value: unknown): string {
  let text = String(value ?? '');
  const prefix = Array.from(text).find(c => c.charCodeAt(0) > 32 && !/\s/.test(c));
  if (prefix && '=+@-'.includes(prefix)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
export function reportCsv(report: AnalyticsReport, activity: Activity[]): string {
  if (!report.hub || activity.some(row => row.hub.id !== report.hub?.id || row.hub.kind !== report.hub?.kind)) throw new Error('Single hub export required');
  const rows: unknown[][] = [
    ['TapAway private hub report', report.hub.name], ['Since (inclusive)', report.meta.since], ['Until (exclusive) / as of', report.meta.until],
    ['Display timezone', report.meta.timezone], ['Source', report.meta.source ?? 'filtered'], ['Methodology', report.meta.coverage],
    ['Views', report.totals.hub_views], ['Link actions', report.totals.clicks], ['Contact save actions', report.totals.saves], ['Visit sessions (not people)', report.totals.sessions],
    [], ['Local day', 'Views', 'Link actions', 'Contact save actions'],
    ...report.daily.map(d => [d.day, d.events.hub_view ?? 0, Object.entries(d.events).filter(([k]) => ['link_click','review_click','social_click','menu_view','directions_click','call_click','text_click','website_click'].includes(k)).reduce((n,[,v]) => n+v,0), d.events.contact_save ?? 0]),
    [], ['Time (LA)', 'Event', 'Safe label', 'Source'],
    ...activity.map(a => [reportTime(a.at), eventLabel(a.event), a.label, a.source]),
  ];
  return '\ufeff' + rows.map(row => row.map(csvCell).join(',')).join('\r\n');
}
export async function allReportActivity(report: AnalyticsReport, request: ReportRequest): Promise<Activity[]> {
  const rows = [...report.activity];
  let cursor = report.nextCursor;
  while (cursor) {
    const next = await fetchAnalyticsReport({ ...request, since: report.meta.since, until: report.meta.until, cursor });
    if (next.nextCursor?.id === cursor.id) throw new Error('Activity pagination failed');
    rows.push(...next.activity);
    cursor = next.nextCursor;
  }
  if (rows.length !== report.activityCount) throw new Error('Snapshot changed; refresh the report before exporting');
  return rows;
}
