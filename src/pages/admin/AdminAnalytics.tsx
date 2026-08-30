import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, RefreshCw, ShieldAlert, Info, Lock } from "lucide-react";
import { toast } from "sonner";

/**
 * Frozen legacy audit for /rebornwraps. These figures come from the one-off
 * read-only audit of the pre-cutover event stream, where no session or event
 * identifiers were recorded. They are an estimate and are never merged with
 * post-cutover verified numbers.
 */
const REBORNWRAPS_LEGACY = {
  slug: "rebornwraps",
  rangeLabel: "Legacy events up to the cutover",
  rawProfileVisits: 569,
  totalEvents: 801,
  crawlerUserAgents: 53,
  previewOrLocalhost: 22,
  sameDeviceWithinAMinute: 28,
  sameSecondDuplicates: 1,
  legitimateViewsLow: 470,
  legitimateViewsHigh: 490,
  estimatedSessions: 358,
};

type Overview = {
  raw_events: number;
  validated_events: number;
  validated_page_views: number;
  verified_sessions: number;
  known_returning_visitors: number;
  bot_events: number;
  internal_events: number;
  cta_events: number;
  conversion_events: number;
};

type HubRow = Overview & {
  hub_id: string;
  hub_kind: string | null;
  slug: string | null;
  name: string | null;
};

type Meta = { cutoverAt: string | null; sessionLabel: string; methodology: string };

const RANGES = [
  { id: "7", label: "Last 7 days" },
  { id: "30", label: "Last 30 days" },
  { id: "90", label: "Last 90 days" },
  { id: "all", label: "All time" },
] as const;

function sinceFor(range: string): string | null {
  if (range === "all") return null;
  const d = new Date();
  d.setDate(d.getDate() - Number(range));
  return d.toISOString();
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number | string;
  hint?: string;
  tone?: "ok" | "warn" | "err";
}) {
  const toneClass =
    tone === "ok" ? "text-emerald-400" : tone === "warn" ? "text-amber-400" : tone === "err" ? "text-red-400" : "text-white";
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="text-xs uppercase tracking-wide text-white/50">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${toneClass}`}>{value}</div>
      {hint && <div className="mt-1 text-[11px] leading-snug text-white/40">{hint}</div>}
    </div>
  );
}

export default function AdminAnalytics() {
  const [range, setRange] = useState<string>("30");
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [hubs, setHubs] = useState<HubRow[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setDenied(false);
    const since = sinceFor(range);
    const [ov, tbl] = await Promise.all([
      supabase.functions.invoke("analytics-report", { body: { action: "overview", since } }),
      supabase.functions.invoke("analytics-report", { body: { action: "hub_table", since } }),
    ]);
    if (ov.error || tbl.error) {
      setDenied(true);
      setLoading(false);
      toast.error("Analytics are only available to TapAway admins.");
      return;
    }
    setOverview(ov.data?.overview ?? null);
    setMeta(ov.data?.meta ?? null);
    setHubs(tbl.data?.hubs ?? []);
    setLoading(false);
  }, [range]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = q
      ? hubs.filter((h) => (h.slug ?? "").toLowerCase().includes(q) || (h.name ?? "").toLowerCase().includes(q))
      : hubs;
    return [...rows].sort((a, b) => b.validated_events - a.validated_events);
  }, [hubs, search]);

  const reborn = useMemo(() => hubs.find((h) => h.slug === "rebornwraps") ?? null, [hubs]);

  const sessionLabel = meta?.sessionLabel ?? "Sessions";

  if (denied) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] text-white p-6">
        <div className="max-w-2xl mx-auto mt-24 text-center space-y-3">
          <ShieldAlert className="h-8 w-8 mx-auto text-amber-400" />
          <h1 className="text-xl font-semibold">Analytics unavailable</h1>
          <p className="text-sm text-white/60">
            This section is restricted to TapAway administrators. Aggregates are served through a protected
            reporting service; raw visitor events are never exposed to the browser.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Analytics</h1>
            <p className="text-sm text-white/60 mt-1">
              Validated, de-duplicated traffic. Event counts are labelled "events" and are never presented as visitors.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {RANGES.map((r) => (
              <Button
                key={r.id}
                size="sm"
                variant={range === r.id ? "default" : "secondary"}
                onClick={() => setRange(r.id)}
              >
                {r.label}
              </Button>
            ))}
            <Button size="sm" variant="secondary" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {meta && (
          <div className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white/60">
            <Info className="h-4 w-4 shrink-0 mt-0.5 text-white/40" />
            <div>
              <span className="text-white/80 font-medium">{sessionLabel}.</span> {meta.methodology}
              {meta.cutoverAt && (
                <> Cutover: {new Date(meta.cutoverAt).toUTCString()}.</>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-white/60 py-20 justify-center">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading analytics…
          </div>
        ) : (
          <Tabs defaultValue="overview">
            <TabsList className="bg-white/5 flex-wrap h-auto">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="hubs">Hub Analytics</TabsTrigger>
              <TabsTrigger value="quality">Traffic Quality</TabsTrigger>
              <TabsTrigger value="acquisition">Acquisition</TabsTrigger>
              <TabsTrigger value="engagement">Engagement</TabsTrigger>
              <TabsTrigger value="conversions">Conversions</TabsTrigger>
              <TabsTrigger value="reborn">/rebornwraps</TabsTrigger>
              <TabsTrigger value="meta">Meta Tracking</TabsTrigger>
              <TabsTrigger value="privacy">Privacy &amp; Consent</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Stat label="Raw events" value={overview?.raw_events ?? 0} hint="Everything ingested, before filtering" />
                <Stat label="Validated events" value={overview?.validated_events ?? 0} tone="ok" hint="Human, de-duplicated" />
                <Stat label="Validated page views" value={overview?.validated_page_views ?? 0} />
                <Stat label={sessionLabel} value={overview?.verified_sessions ?? 0} hint="Distinct session IDs across the whole range" />
                <Stat
                  label="Known returning visitors"
                  value={overview?.known_returning_visitors ?? 0}
                  hint="Only countable when the visitor's consent state allows a persistent ID"
                />
                <Stat label="Suspected bot events" value={overview?.bot_events ?? 0} tone="warn" />
                <Stat label="Internal / preview events" value={overview?.internal_events ?? 0} tone="warn" />
                <Stat label="CTA interactions" value={overview?.cta_events ?? 0} />
              </div>
            </TabsContent>

            <TabsContent value="hubs" className="mt-4 space-y-4">
              <Input
                placeholder="Search hubs by slug or name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-xs bg-white/5 border-white/10"
              />
              <div className="overflow-x-auto rounded-lg border border-white/10">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10">
                      <TableHead className="text-white/60">Hub</TableHead>
                      <TableHead className="text-white/60">Raw events</TableHead>
                      <TableHead className="text-white/60">Validated events</TableHead>
                      <TableHead className="text-white/60">Page views</TableHead>
                      <TableHead className="text-white/60">{sessionLabel}</TableHead>
                      <TableHead className="text-white/60">Known returning visitors</TableHead>
                      <TableHead className="text-white/60">Bot events</TableHead>
                      <TableHead className="text-white/60">Internal events</TableHead>
                      <TableHead className="text-white/60">CTA events</TableHead>
                      <TableHead className="text-white/60">Conversion rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((h) => (
                      <TableRow key={h.hub_id} className="border-white/10">
                        <TableCell>
                          <div className="font-medium">{h.name ?? "—"}</div>
                          <div className="text-xs text-white/50">/{h.slug ?? h.hub_id.slice(0, 8)}</div>
                        </TableCell>
                        <TableCell>{h.raw_events}</TableCell>
                        <TableCell>{h.validated_events}</TableCell>
                        <TableCell>{h.validated_page_views}</TableCell>
                        <TableCell>{h.verified_sessions}</TableCell>
                        <TableCell>{h.known_returning_visitors}</TableCell>
                        <TableCell>{h.bot_events}</TableCell>
                        <TableCell>{h.internal_events}</TableCell>
                        <TableCell>{h.cta_events}</TableCell>
                        <TableCell>
                          {h.verified_sessions
                            ? `${Math.round((h.conversion_events / h.verified_sessions) * 100)}%`
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filtered.length === 0 && (
                      <TableRow className="border-white/10">
                        <TableCell colSpan={10} className="text-center text-white/50 py-10">
                          No validated hub traffic in this range yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="quality" className="mt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Stat label="Raw events" value={overview?.raw_events ?? 0} />
                <Stat label="Validated events" value={overview?.validated_events ?? 0} tone="ok" />
                <Stat label="Suspected bot events" value={overview?.bot_events ?? 0} tone="warn" />
                <Stat label="Internal / preview / dev events" value={overview?.internal_events ?? 0} tone="warn" />
                <Stat
                  label="Filtered out"
                  value={Math.max(0, (overview?.raw_events ?? 0) - (overview?.validated_events ?? 0))}
                  hint="Bots, previews, admin sessions and duplicate submissions"
                />
              </div>
              <p className="mt-4 text-xs text-white/50 max-w-3xl">
                Ingestion happens only through the hardened track service: event names are allow-listed, payloads
                size-limited, event IDs enforced as idempotency keys, and repeated session/event/path combinations
                inside 30 seconds are suppressed. Browsers cannot write to the analytics tables directly.
              </p>
            </TabsContent>

            <TabsContent value="acquisition" className="mt-4">
              <Card className="bg-white/5 border-white/10 text-white">
                <CardHeader>
                  <CardTitle className="text-base">Traffic sources</CardTitle>
                  <CardDescription className="text-white/60">
                    Per-hub sources (referrer host, UTM source and campaign channel) are available in the hub
                    drill-down. NFC and QR visits are identified from campaign parameters.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-white/60">
                  Select a hub in Hub Analytics and open its drill-down to review its sources.
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="engagement" className="mt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Stat label="CTA interactions" value={overview?.cta_events ?? 0} />
                <Stat label="Validated page views" value={overview?.validated_page_views ?? 0} />
                <Stat label={sessionLabel} value={overview?.verified_sessions ?? 0} />
                <Stat
                  label="Events per session"
                  value={
                    overview?.verified_sessions
                      ? (overview.validated_events / overview.verified_sessions).toFixed(1)
                      : "—"
                  }
                />
              </div>
            </TabsContent>

            <TabsContent value="conversions" className="mt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Stat label="Conversion events" value={overview?.conversion_events ?? 0} hint="Leads, checkout starts and purchases" />
                <Stat
                  label="Conversion rate"
                  value={
                    overview?.verified_sessions
                      ? `${Math.round((overview.conversion_events / overview.verified_sessions) * 100)}%`
                      : "—"
                  }
                  hint="Conversion events divided by sessions"
                />
              </div>
            </TabsContent>

            <TabsContent value="reborn" className="mt-4 space-y-4">
              <Card className="bg-amber-500/10 border-amber-500/30 text-white">
                <CardHeader>
                  <CardTitle className="text-base">Frozen legacy estimate — /rebornwraps</CardTitle>
                  <CardDescription className="text-white/70">
                    {REBORNWRAPS_LEGACY.rangeLabel}. The legacy system recorded no session or event identifiers and
                    applied no bot filtering, so these are estimates from a one-off audit. They are frozen, are not
                    recalculated, and are never added to post-cutover numbers.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Stat label="Raw profile visits" value={REBORNWRAPS_LEGACY.rawProfileVisits} />
                  <Stat label="All legacy events" value={REBORNWRAPS_LEGACY.totalEvents} />
                  <Stat
                    label="Estimated legitimate views"
                    value={`${REBORNWRAPS_LEGACY.legitimateViewsLow}–${REBORNWRAPS_LEGACY.legitimateViewsHigh}`}
                    tone="ok"
                  />
                  <Stat label="Estimated sessions" value={`~${REBORNWRAPS_LEGACY.estimatedSessions}`} />
                  <Stat label="Crawler user agents" value={REBORNWRAPS_LEGACY.crawlerUserAgents} tone="warn" />
                  <Stat label="Preview / localhost referrers" value={REBORNWRAPS_LEGACY.previewOrLocalhost} tone="warn" />
                  <Stat label="Same device within a minute" value={REBORNWRAPS_LEGACY.sameDeviceWithinAMinute} tone="warn" />
                  <Stat label="Same-second duplicates" value={REBORNWRAPS_LEGACY.sameSecondDuplicates} tone="warn" />
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10 text-white">
                <CardHeader>
                  <CardTitle className="text-base">Validated traffic since the cutover</CardTitle>
                  <CardDescription className="text-white/60">
                    Everything from {meta?.cutoverAt ? new Date(meta.cutoverAt).toUTCString() : "the cutover"} onward,
                    collected by the new pipeline with de-duplication and bot classification.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Stat label="Raw events" value={reborn?.raw_events ?? 0} />
                  <Stat label="Validated events" value={reborn?.validated_events ?? 0} tone="ok" />
                  <Stat label="Validated page views" value={reborn?.validated_page_views ?? 0} />
                  <Stat label="Verified sessions" value={reborn?.verified_sessions ?? 0} />
                  <Stat label="Known returning visitors" value={reborn?.known_returning_visitors ?? 0} />
                  <Stat label="Suspected bot events" value={reborn?.bot_events ?? 0} tone="warn" />
                  <Stat label="Internal / preview events" value={reborn?.internal_events ?? 0} tone="warn" />
                  <Stat label="CTA interactions" value={reborn?.cta_events ?? 0} />
                </CardContent>
              </Card>

              <p className="text-xs text-white/50 max-w-3xl">
                Why the two blocks differ: the legacy figure counted every insert, including crawlers, link previews,
                preview-environment loads, admin sessions and React remounts that fired the same visit twice. The new
                pipeline rejects those before validation, so validated numbers are lower and are the ones to trust.
              </p>
            </TabsContent>

            <TabsContent value="meta" className="mt-4">
              <Card className="bg-white/5 border-white/10 text-white">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Lock className="h-4 w-4 text-white/40" /> Meta tracking
                  </CardTitle>
                  <CardDescription className="text-white/60">
                    The master switch is off. No Pixel loads and no Conversions API events are sent. This section
                    activates in a later phase, after consent and privacy controls ship.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge variant="secondary">Disabled</Badge>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="privacy" className="mt-4">
              <Card className="bg-white/5 border-white/10 text-white">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Lock className="h-4 w-4 text-white/40" /> Privacy &amp; consent
                  </CardTitle>
                  <CardDescription className="text-white/60">
                    Consent categories, GPC handling and the privacy-choices centre ship in the next phase. Current
                    retention: raw events 400 days, IP-derived hashes 7 days, Meta logs 90 days, consent records 730
                    days — enforced nightly by an automated job.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge variant="secondary">Pending phase</Badge>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
