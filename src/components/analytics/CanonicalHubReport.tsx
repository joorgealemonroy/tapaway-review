import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, Download, Printer, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { fetchAnalyticsReport, reportCsv, allReportActivity, reportTime, eventLabel, type HubKind, type Activity, type Cursor } from '@/lib/canonicalAnalytics';

export function CanonicalHubReport({ hubId, kind, initialDays = 30, initialUntil }: { hubId: string; kind: HubKind; initialDays?: number; initialUntil?: string }) {
  const [days, setDays] = useState(initialDays);
  const [refresh, setRefresh] = useState(0);
  const [event, setEvent] = useState('');
  const [cursors, setCursors] = useState<(Cursor | undefined)[]>([undefined]);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [search, setSearch] = useState('');
  const report = useQuery({ queryKey: ['canonical-hub', kind, hubId, days, refresh],
    queryFn: () => fetchAnalyticsReport({ hubId, kind, days, until: refresh === 0 && days === initialDays ? initialUntil : undefined }), staleTime: 60_000, retry: 1 });
  const d = report.data;
  const feed = useQuery({ queryKey: ['canonical-feed',kind,hubId,d?.meta.until,event,cursors], enabled: !!d,
    queryFn: () => fetchAnalyticsReport({ hubId,kind,days,since:d?.meta.since,until:d?.meta.until,event:event || undefined,cursor:cursors[cursors.length-1] }), retry: 1 });
  const page = event || cursors.length>1 ? feed.data : d;
  const visibleActivity = (page?.activity ?? []).filter(a => !search || `${eventLabel(a.event)} ${a.label ?? ''} ${a.source}`.toLowerCase().includes(search.toLowerCase()));
  const reset = () => { setCursors([undefined]); setExportError(''); };
  const exportReport = async (mode: 'csv' | 'print') => {
    if (!d) return;
    setExporting(true); setExportError('');
    // Open synchronously to avoid popup blocking; render only this private hub's safe fields.
    const printWindow = mode==='print' ? window.open('','_blank') : null;
    try {
      const activity = await allReportActivity(d,{hubId,kind,days});
      if (mode==='csv') {
        const url = URL.createObjectURL(new Blob([reportCsv(d,activity)],{type:'text/csv;charset=utf-8'}));
        const anchor = document.createElement('a'); anchor.href=url; anchor.download=`tapaway-${kind}-report.csv`; anchor.click(); URL.revokeObjectURL(url);
      } else {
        if (!printWindow) throw new Error('Allow the print window and try again');
        printWindow.opener = null;
        const doc = printWindow.document;
        doc.title = 'TapAway private hub report';
        const add = (tag:string,text:string) => { const el=doc.createElement(tag); el.textContent=text; doc.body.append(el); };
        add('h1',d.hub?.name ?? 'Hub report'); add('p',`${reportTime(d.meta.since)} — ${reportTime(d.meta.until)} (exclusive end)`);
        add('p',`As of ${reportTime(d.meta.asOf)} · ${d.meta.timezone}`);
        add('p',`${d.totals.hub_views} views · ${d.totals.clicks} link actions · ${d.totals.saves} contact save actions · ${d.totals.sessions} visit sessions`);
        add('p',d.meta.coverage); add('h2','Daily activity');
        d.daily.forEach(day=>add('p',`${day.day}: ${day.events.hub_view ?? 0} views · ${Object.entries(day.events).map(([e,n])=>`${eventLabel(e)}: ${n}`).join(' · ')}`));
        add('h2','Recent activity'); activity.forEach(a=>add('p',`${reportTime(a.at)} · ${eventLabel(a.event)}${a.label ? ` · ${a.label}` : ''} · ${a.source}`));
        printWindow.focus(); printWindow.print();
      }
    } catch(e) { printWindow?.close(); setExportError(e instanceof Error ? e.message : 'Export unavailable'); }
    finally { setExporting(false); }
  };
  return <section className="min-w-0 space-y-6 text-foreground" aria-label="Private hub report">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0"><p className="text-xs uppercase text-muted-foreground">Private client report</p><h2 className="break-words text-2xl font-bold">{d?.hub?.name ?? 'Hub activity'}</h2></div>
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Report date range" className="h-11 rounded-md border border-input bg-background px-2 text-sm" value={days} onChange={e=>{setDays(Number(e.target.value));reset();}}>{[7,30,90].map(n=><option key={n} value={n}>{n} days</option>)}</select>
        <Button variant="outline" size="icon" className="h-11 w-11" aria-label="Refresh report" onClick={()=>{setRefresh(n=>n+1);reset();}}><RefreshCw size={17}/></Button>
        <Button variant="outline" size="icon" className="h-11 w-11" aria-label="Export CSV" disabled={!d||exporting} onClick={()=>void exportReport('csv')}><Download size={17}/></Button>
        <Button variant="outline" size="icon" className="h-11 w-11" aria-label="Print or save PDF" disabled={!d||exporting} onClick={()=>void exportReport('print')}><Printer size={17}/></Button>
      </div>
    </header>
    {report.isPending && <p role="status">Loading recorded activity…</p>}
    {report.isError && <div role="alert"><p>Report unavailable.{d ? ' Showing the last successful snapshot.' : ' No counts substituted.'}</p><Button variant="outline" onClick={()=>void report.refetch()}>Retry report</Button></div>}
    {exportError && <p role="alert" className="text-destructive">{exportError}</p>}
    {d && <>
      <p className="text-xs text-muted-foreground">{reportTime(d.meta.since)} — {reportTime(d.meta.until)} · end exclusive<br/>Updated {reportTime(d.meta.asOf)} · Los Angeles time{report.isFetching ? ' · refreshing' : ''}</p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{[['Hub views',d.totals.hub_views],['Link actions',d.totals.clicks],['Contact saves',d.totals.saves],['Visit sessions',d.totals.sessions]].map(([label,n])=><div key={label} className="min-w-0 border-l-2 border-primary pl-3"><strong className="block text-3xl tabular-nums">{Number(n).toLocaleString()}</strong><span className="text-sm text-muted-foreground">{label}</span></div>)}</div>
      {!d.activityCount && <p className="border-y border-border py-6">No recorded activity in this period. Missing history is not evidence of no visits.</p>}
      <div><h3 className="mb-3 font-semibold">Daily views · Los Angeles dates</h3><div className="h-56 w-full min-w-0"><ResponsiveContainer width="100%" height="100%"><LineChart data={d.daily.map(row=>({day:row.day,views:row.events.hub_view ?? 0}))}><CartesianGrid className="stroke-border" strokeDasharray="3 3"/><XAxis dataKey="day" minTickGap={35} tick={{fontSize:11}}/><YAxis allowDecimals={false} width={35}/><Tooltip/><Line dataKey="views" stroke="hsl(var(--primary))" dot={false} strokeWidth={2}/></LineChart></ResponsiveContainer></div></div>
      <div className="grid gap-6 sm:grid-cols-2"><div><h3 className="mb-2 font-semibold">Link actions</h3>{d.links.map((l,i)=><p key={i} className="flex justify-between gap-3 border-b border-border py-2 text-sm"><span className="min-w-0 break-words">{l.label} · {eventLabel(l.event_name)}</span><strong>{l.clicks}</strong></p>)}</div><div><h3 className="mb-2 font-semibold">View sources & devices</h3>{[...d.sources.map(s=>({label:s.source,n:s.views})),...d.devices.map(s=>({label:s.name,n:s.views}))].map((s,i)=><p key={i} className="flex justify-between gap-3 border-b border-border py-2 text-sm"><span className="break-words">{s.label}</span><strong>{s.n}</strong></p>)}<p className="mt-2 text-xs text-muted-foreground">Counts use views only; unknown sources and devices stay included.</p></div></div>
      <div><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">Recent activity</h3><select aria-label="Activity type" value={event} onChange={e=>{setEvent(e.target.value);reset();}} className="h-11 max-w-full rounded-md border border-input bg-background px-2 text-sm"><option value="">All actions</option>{['hub_view','link_click','review_click','social_click','menu_view','directions_click','call_click','contact_save','lead_submit'].map(e=><option key={e} value={e}>{eventLabel(e)}</option>)}</select></div>
        <Input className="my-3" aria-label="Search this activity page" placeholder="Search this activity page" value={search} onChange={e=>setSearch(e.target.value)}/>
        {feed.isFetching && <p role="status">Loading activity…</p>}{feed.isError && <p role="alert">Activity unavailable. <Button variant="outline" onClick={()=>void feed.refetch()}>Retry activity</Button></p>}
        <ActivityRows rows={visibleActivity}/>
        <div className="mt-3 flex items-center justify-between gap-2"><Button variant="outline" disabled={cursors.length===1} onClick={()=>setCursors(c=>c.slice(0,-1))}><ChevronLeft size={16}/>Previous</Button><span className="text-xs">Page {cursors.length} · {page?.activityCount ?? d.activityCount} events</span><Button variant="outline" disabled={!page?.nextCursor||feed.isFetching} onClick={()=>{if(page?.nextCursor)setCursors(c=>[...c,page.nextCursor ?? undefined]);}}>Next<ChevronRight size={16}/></Button></div>
      </div>
      <footer className="border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground"><strong>Period & methodology</strong><p>{d.meta.coverage}</p><p>First recorded filtered event for this hub: {d.meta.firstRecordedAt ? reportTime(d.meta.firstRecordedAt) : 'Not available'}.</p></footer>
    </>}
  </section>;
}
export function ActivityRows({ rows, onReport }: { rows: Activity[]; onReport?: (hub: Activity['hub'])=>void }) {
  return <ul className="divide-y divide-border">{rows.map(a=><li key={a.key} className="flex flex-wrap items-start justify-between gap-2 py-3"><div className="min-w-0 flex-1"><time className="text-xs text-muted-foreground" dateTime={a.at}>{reportTime(a.at)}</time>{onReport && <p className="break-words font-semibold">{a.hub.name}</p>}<p className="break-words text-sm">{eventLabel(a.event)}{a.label ? ` · ${a.label}` : ''}</p><p className="break-words text-xs text-muted-foreground">{a.source}</p></div>{onReport && <Button variant="outline" onClick={()=>onReport(a.hub)}>Client report</Button>}</li>)}</ul>;
}