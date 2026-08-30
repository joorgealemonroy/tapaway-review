import { useEffect, useMemo, useState, useCallback, Fragment } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExternalLink, RefreshCw, AlertCircle, CheckCircle2, Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { HubRow, ProbeState, hubKey, liveHubs, probeHub, runHealthSweep } from "@/lib/hubHealthProbe";

const PROD_ORIGIN = "https://tapaway.co";

interface LinkCheck {
  id?: string;
  hub_id: string;
  slug: string | null;
  label: string | null;
  url: string;
  status: string;
  classification: string | null;
  admin_review_state: string | null;
  final_url: string | null;
  http_status: number | null;
  detail: string | null;
  checked_at: string;
}

/** Detected classes that mean "someone should look at this". */
const ATTENTION = ["confirmed_broken", "malformed", "server_error", "tls_error", "timeout"];
const classOf = (c: LinkCheck) => c.classification ?? (c.status === "ok" ? "healthy" : "blocked_unverifiable");
/** An admin false-positive decision always wins over the detected class. */
const needsAttention = (c: LinkCheck) =>
  c.admin_review_state !== "false_positive" && ATTENTION.includes(classOf(c));


export default function AdminHubHealth() {
  const [rows, setRows] = useState<HubRow[]>([]);
  const [probes, setProbes] = useState<Record<string, ProbeState>>({});
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [linkChecks, setLinkChecks] = useState<LinkCheck[]>([]);
  const [linksRunning, setLinksRunning] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);


  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_hub_health");
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const list = (data ?? []) as HubRow[];
    setRows(list);
    setLoading(false);
    void runAll(list);
  }, []);

  const runAll = async (list: HubRow[]) => {
    setRunning(true);
    const expected = liveHubs(list);
    setProbes((prev) => {
      const next = { ...prev };
      for (const r of expected) next[hubKey(r)] = { status: "pending" };
      return next;
    });
    await runHealthSweep(expected, (row, state) => {
      setProbes((prev) => ({ ...prev, [hubKey(row)]: state }));
    });
    setRunning(false);
  };


  const retest = async (r: HubRow) => {
    setProbes((prev) => ({ ...prev, [`${r.kind}:${r.slug}`]: { status: "pending" } }));
    const p = await probeHub(r);
    setProbes((prev) => ({ ...prev, [`${r.kind}:${r.slug}`]: p }));
  };

  const loadLinkChecks = useCallback(async () => {
    const { data, error } = await supabase
      .from("hub_link_checks")
      .select(
        "id, hub_id, slug, label, url, status, classification, admin_review_state, final_url, http_status, detail, checked_at",
      );
    if (error) return;
    setLinkChecks((data ?? []) as LinkCheck[]);
  }, []);

  const runLinkCheck = async () => {
    setLinksRunning(true);
    const { data, error } = await supabase.functions.invoke("check-hub-links", { body: {} });
    if (error) toast.error(error.message);
    else if (data?.is_complete) toast.success(`Checked ${data.checked} of ${data.total} links`);
    else toast.warning("Link check finished incomplete — totals may be stale");
    await loadLinkChecks();
    setLinksRunning(false);
  };

  /** Persistent admin override — never overwritten by later automated checks. */
  const setReview = async (c: LinkCheck, state: "false_positive" | "none") => {
    if (!c.id) return;
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("hub_link_checks")
      .update({
        admin_review_state: state,
        admin_reviewed_by: auth.user?.id ?? null,
        admin_reviewed_at: new Date().toISOString(),
      })
      .eq("id", c.id);
    if (error) toast.error(error.message);
    else {
      toast.success(state === "false_positive" ? "Marked as false positive" : "Review cleared");
      await loadLinkChecks();
    }
  };

  useEffect(() => {
    load();
    void loadLinkChecks();
  }, [load, loadLinkChecks]);

  /** Link results grouped by hub slug (the key the health table uses). */
  const linksBySlug = useMemo(() => {
    const map = new Map<string, LinkCheck[]>();
    for (const c of linkChecks) {
      const key = (c.slug ?? "").toLowerCase();
      if (!key) continue;
      const arr = map.get(key) ?? [];
      arr.push(c);
      map.set(key, arr);
    }
    return map;
  }, [linkChecks]);

  const linkTotals = useMemo(() => {
    const attention = linkChecks.filter(needsAttention);
    const n = (c: string) =>
      linkChecks.filter((r) => r.admin_review_state !== "false_positive" && classOf(r) === c).length;
    return {
      total: linkChecks.length,
      attention: attention.length,
      confirmed: n("confirmed_broken"),
      healthy: n("healthy"),
      redirected: n("redirected"),
      serverError: n("server_error"),
      tlsError: n("tls_error"),
      timeout: n("timeout"),
      malformed: n("malformed"),
      blocked: n("blocked_unverifiable"),
      falsePositive: linkChecks.filter((r) => r.admin_review_state === "false_positive").length,
      hubs: new Set(attention.map((b) => b.hub_id)).size,
    };
  }, [linkChecks]);


  const { totals, broken } = useMemo(() => {
    const t = { live: 0, ok: 0, empty: 0, error: 0, pending: 0 };
    const b: HubRow[] = [];
    for (const r of rows) {
      if (r.expected_status !== "live") continue;
      t.live++;
      const p = probes[`${r.kind}:${r.slug}`];
      if (!p) { t.pending++; continue; }
      t[p.status]++;
      if (p.status === "error" || p.status === "empty") b.push(r);
    }
    return { totals: t, broken: b };
  }, [rows, probes]);


  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Hub Health</h1>
            <p className="text-sm text-white/60 mt-1">
              Verifies that every hub the platform expects to be publicly live is actually reachable by a logged-out visitor.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => void runLinkCheck()} disabled={linksRunning} variant="secondary">
              {linksRunning ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4 mr-2" />
              )}
              Check all links
            </Button>
            <Button onClick={() => runAll(rows)} disabled={running || loading} variant="secondary">
              <RefreshCw className={`h-4 w-4 mr-2 ${running ? "animate-spin" : ""}`} />
              Retest all
            </Button>
          </div>
        </div>

        <Card className="bg-white/5 border-white/10 text-white">
          <CardHeader>
            <CardTitle className="text-white text-base">Outbound links</CardTitle>
            <CardDescription className="text-white/60">
              Every link on a live hub is opened server-side. A 401/403/429 means the host blocks
              automated checks — it is never counted as broken.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Links checked" value={linkTotals.total} />
            <Stat label="Confirmed broken" value={linkTotals.confirmed} tone={linkTotals.confirmed ? "err" : "ok"} />
            <Stat label="Needs attention" value={linkTotals.attention} tone={linkTotals.attention ? "warn" : "ok"} />
            <Stat label="Hubs affected" value={linkTotals.hubs} tone={linkTotals.hubs ? "warn" : undefined} />
            <Stat label="Healthy" value={linkTotals.healthy} tone="ok" />
            <Stat label="Redirected" value={linkTotals.redirected} />
            <Stat label="Server / TLS / timeout" value={linkTotals.serverError + linkTotals.tlsError + linkTotals.timeout} />
            <Stat label="Blocked / unverifiable" value={linkTotals.blocked} />
            <Stat label="Malformed" value={linkTotals.malformed} />
            <Stat label="Marked false positive" value={linkTotals.falsePositive} />
          </CardContent>

        </Card>


        <Card className="bg-white/5 border-white/10 text-white">
          <CardHeader>
            <CardTitle className="text-white text-base">Summary</CardTitle>
            <CardDescription className="text-white/60">
              Anonymous probes hit the same public endpoints the site does.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Stat label="Live hubs" value={totals.live} />
            <Stat label="Reachable" value={totals.ok} tone="ok" />
            <Stat label="Empty" value={totals.empty} tone={totals.empty ? "warn" : undefined} />
            <Stat label="Errors" value={totals.error} tone={totals.error ? "err" : undefined} />
            <Stat label="Pending" value={totals.pending} />
          </CardContent>
        </Card>

        {broken.length > 0 && (
          <Card className="bg-red-500/10 border-red-500/30 text-white">
            <CardHeader>
              <CardTitle className="text-red-200 flex items-center gap-2 text-base">
                <AlertCircle className="h-5 w-5" />
                {broken.length} hub{broken.length === 1 ? "" : "s"} not reachable
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {broken.map((r) => {
                const p = probes[`${r.kind}:${r.slug}`];
                return (
                  <div key={`${r.kind}:${r.slug}`} className="flex justify-between gap-4">
                    <span className="font-mono">/{r.slug}</span>
                    <span className="text-red-200/80 truncate">{p?.detail ?? p?.status}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        <Card className="bg-white/5 border-white/10 text-white">
          <CardHeader>
            <CardTitle className="text-white text-base">All hubs</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 text-center text-white/60">Loading…</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-white/70">Slug</TableHead>
                      <TableHead className="text-white/70">Kind</TableHead>
                      <TableHead className="text-white/70">Owner</TableHead>
                      <TableHead className="text-white/70">Expected</TableHead>
                      <TableHead className="text-white/70">Anon probe</TableHead>
                      <TableHead className="text-white/70">Links</TableHead>
                      <TableHead className="text-white/70 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => {
                      const key = `${r.kind}:${r.slug}`;
                      const p = probes[key];
                      const checks = linksBySlug.get((r.slug ?? "").toLowerCase()) ?? [];
                      const badLinks = checks.filter(needsAttention);
                      const blockedLinks = checks.filter(
                        (c) => c.admin_review_state !== "false_positive" && classOf(c) === "blocked_unverifiable",
                      );
                      const detailLinks = [...badLinks, ...blockedLinks];

                      return (
                        <Fragment key={key}>
                        <TableRow className="border-white/5 hover:bg-white/[0.03]">

                          <TableCell className="font-mono text-sm">/{r.slug}</TableCell>
                          <TableCell className="text-sm capitalize">{r.kind}</TableCell>
                          <TableCell className="text-sm text-white/70">{r.owner_label ?? "—"}</TableCell>
                          <TableCell>
                            <Badge variant={r.expected_status === "live" ? "default" : "secondary"} className="text-xs">
                              {r.expected_status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {r.expected_status !== "live" ? (
                              <span className="text-xs text-white/40">—</span>
                            ) : !p || p.status === "pending" ? (
                              <span className="text-xs text-white/60">testing…</span>
                            ) : p.status === "ok" ? (
                              <span className="text-xs text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" /> reachable
                              </span>
                            ) : (
                              <span className="text-xs text-red-400 flex items-center gap-1" title={p.detail}>
                                <AlertCircle className="h-3 w-3" /> {p.status}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {checks.length === 0 ? (
                              <span className="text-xs text-white/40">not checked</span>
                            ) : (
                              <button
                                onClick={() => setExpanded(expanded === key ? null : key)}
                                className={`text-xs flex items-center gap-1 hover:underline ${
                                  badLinks.length ? "text-amber-400" : "text-emerald-400"
                                }`}
                              >
                                {badLinks.length ? (
                                  <>
                                    <AlertCircle className="h-3 w-3" /> {badLinks.length} need attention
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="h-3 w-3" /> {checks.length} checked
                                  </>
                                )}
                                {blockedLinks.length > 0 && (
                                  <span className="text-white/40">· {blockedLinks.length} blocked</span>
                                )}
                              </button>
                            )}
                          </TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-white/70 hover:text-white"
                              onClick={() => retest(r)}
                            >
                              Retest
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-white/70 hover:text-white"
                              onClick={() => window.open(`${PROD_ORIGIN}/${r.slug}`, "_blank")}
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                        {expanded === key && detailLinks.length > 0 && (
                          <TableRow className="border-white/5 hover:bg-transparent">
                            <TableCell colSpan={7} className="bg-white/[0.02]">
                              <div className="space-y-2 py-1">
                                {detailLinks.map((b) => (
                                  <div key={b.url} className="text-xs flex flex-wrap items-center gap-2">
                                    <span className="text-white/60 w-28 shrink-0">{b.label ?? "Link"}</span>
                                    <Badge variant="secondary" className="text-[10px]">
                                      {classOf(b).replace(/_/g, " ")}
                                    </Badge>
                                    <span className="font-mono text-white/50 truncate max-w-md">{b.url}</span>
                                    {b.final_url && b.final_url !== b.url && (
                                      <span className="text-white/40 truncate max-w-xs">→ {b.final_url}</span>
                                    )}
                                    <span className="text-amber-300">
                                      {b.detail ?? (b.http_status ? `HTTP ${b.http_status}` : "")}
                                    </span>
                                    {b.admin_review_state === "false_positive" ? (
                                      <button
                                        onClick={() => void setReview(b, "none")}
                                        className="text-white/50 hover:underline"
                                      >
                                        false positive · undo
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => void setReview(b, "false_positive")}
                                        className="text-white/50 hover:underline"
                                      >
                                        Mark false positive
                                      </button>
                                    )}
                                    <a
                                      href={b.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-white/50 hover:underline"
                                    >
                                      Open
                                    </a>
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                        </Fragment>
                      );



                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "ok" | "warn" | "err" }) {
  const color =
    tone === "ok" ? "text-emerald-400" :
    tone === "warn" ? "text-amber-400" :
    tone === "err" ? "text-red-400" : "text-white";
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <div className="text-xs uppercase tracking-wide text-white/50">{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${color}`}>{value}</div>
    </div>
  );
}
