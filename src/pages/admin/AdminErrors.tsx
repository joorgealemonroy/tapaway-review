import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type ClientError = {
  id: string;
  error_message: string;
  stack_trace: string | null;
  component_stack: string | null;
  route: string | null;
  user_id: string | null;
  user_agent: string | null;
  created_at: string;
};

type ErrorGroup = {
  fingerprint: string;
  message: string;
  route: string;
  source: string;
  occurrences: ClientError[];
  firstSeen: string;
  lastSeen: string;
  builds: string[];
};

/**
 * Fingerprinting rules (deliberately build-independent, so the same bug across
 * two deployments stays ONE issue):
 *  - message is normalised: numbers, UUIDs, quoted values and URLs collapsed
 *  - route is the path only, dynamic segments collapsed
 *  - stack source is the first frame's file, with the asset content hash removed
 * The build/asset hash is extracted separately so occurrences can still be
 * compared before and after a deployment.
 */
const normalizeMessage = (msg: string) =>
  msg
    // Reporter-generated occurrence id, e.g. "[err_1788092134640_qqy00k] " —
    // unique per occurrence, so it must never reach the fingerprint.
    .replace(/^\s*\[err_[a-z0-9_]+\]\s*/i, "")
    .replace(/https?:\/\/\S+/g, "<url>")
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "<uuid>")
    .replace(/['"`][^'"`]{0,80}['"`]/g, "<str>")
    .replace(/\b\d+\b/g, "<n>")
    .trim()
    .slice(0, 200);


const normalizeRoute = (route: string | null) => {
  if (!route) return "(unknown route)";
  const path = route.split("?")[0];
  return path
    .replace(/\/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, "/<id>")
    .replace(/\/\d+/g, "/<n>");
};

/** Strips changing asset hashes: /assets/index-Bf3kQ1.js -> /assets/index.js */
const stripAssetHash = (file: string) =>
  file.replace(/-[A-Za-z0-9_]{6,12}(\.(?:js|mjs|css))/g, "$1");

const stackSource = (stack: string | null) => {
  if (!stack) return "(no stack)";
  const frame = stack
    .split("\n")
    .map((l) => l.trim())
    .find((l) => /https?:\/\/|\.tsx?|\.js/.test(l));
  if (!frame) return "(no stack)";
  const fileMatch = frame.match(/([^/\s()]+\.(?:tsx?|m?js))(?::\d+)?(?::\d+)?/);
  const file = fileMatch ? fileMatch[1] : frame.slice(0, 60);
  return stripAssetHash(file);
};

/** Build identifier lives outside the fingerprint. */
const buildOf = (stack: string | null) => {
  const m = stack?.match(/-([A-Za-z0-9_]{6,12})\.(?:js|mjs|css)/);
  return m ? m[1] : "unknown";
};

const isReact185 = (g: ErrorGroup) =>
  /minified react error #185|maximum update depth/i.test(g.message);

const AdminErrors = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: guardLoading } = useAdminGuard();
  const [rows, setRows] = useState<ClientError[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [windowHours, setWindowHours] = useState<24 | 168 | 0>(24);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const { data, error } = await supabase
      .from("client_errors")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) {
      setErr(error.message);
      toast.error(error.message);
    }
    setRows((data ?? []) as ClientError[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  const groups = useMemo<ErrorGroup[]>(() => {
    const cutoff = windowHours ? Date.now() - windowHours * 3600_000 : 0;
    const scoped = rows.filter((r) => !cutoff || new Date(r.created_at).getTime() >= cutoff);
    const map = new Map<string, ErrorGroup>();
    for (const r of scoped) {
      const message = normalizeMessage(r.error_message);
      const route = normalizeRoute(r.route);
      const source = stackSource(r.stack_trace);
      const fingerprint = `${message}|${route}|${source}`;
      const g = map.get(fingerprint) ?? {
        fingerprint,
        message,
        route,
        source,
        occurrences: [],
        firstSeen: r.created_at,
        lastSeen: r.created_at,
        builds: [],
      };
      g.occurrences.push(r);
      if (r.created_at < g.firstSeen) g.firstSeen = r.created_at;
      if (r.created_at > g.lastSeen) g.lastSeen = r.created_at;
      const b = buildOf(r.stack_trace);
      if (!g.builds.includes(b)) g.builds.push(b);
      map.set(fingerprint, g);
    }
    return [...map.values()].sort((a, b) => b.occurrences.length - a.occurrences.length);
  }, [rows, windowHours]);

  const totals = useMemo(() => {
    const occurrences = groups.reduce((n, g) => n + g.occurrences.length, 0);
    return {
      occurrences,
      unique: groups.length,
      react185: groups.filter(isReact185).reduce((n, g) => n + g.occurrences.length, 0),
    };
  }, [groups]);

  if (guardLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0e1a]">
        <Loader2 className="h-6 w-6 animate-spin text-white/60" />
      </div>
    );
  }
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="sm" className="text-white/70" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Admin
          </Button>
          <Button variant="outline" size="sm" className="border-white/10 bg-white/5" onClick={load}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>

        <h1 className="text-2xl font-bold mb-1">App Errors</h1>
        <p className="text-sm text-white/50 mb-4">
          Occurrences are grouped into unique issues by normalised message, route and stack source.
          The build is tracked separately, so the same bug across deployments stays one issue.
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          {([24, 168, 0] as const).map((h) => (
            <Button
              key={h}
              size="sm"
              variant={windowHours === h ? "default" : "outline"}
              className={windowHours === h ? "" : "border-white/10 bg-white/5 text-white/70"}
              onClick={() => setWindowHours(h)}
            >
              {h === 24 ? "Last 24h" : h === 168 ? "Last 7 days" : "All captured"}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <Stat label="Occurrences" value={totals.occurrences} />
          <Stat label="Unique issues" value={totals.unique} />
          <Stat label="React #185 occurrences" value={totals.react185} />
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-white/50" />
          </div>
        ) : err ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200">
            Could not load errors: {err}
          </div>
        ) : groups.length === 0 ? (
          <div className="rounded-xl border border-white/5 bg-white/[0.03] p-10 text-center text-sm text-white/50">
            No errors captured in this window.
          </div>
        ) : (
          <div className="space-y-2">
            {groups.map((g) => {
              const latest = g.occurrences[0];
              return (
                <div key={g.fingerprint} className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
                  <button
                    className="text-left w-full min-w-0"
                    onClick={() => setExpanded(expanded === g.fingerprint ? null : g.fingerprint)}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">
                        {g.occurrences.length}×
                      </Badge>
                      {isReact185(g) && (
                        <Badge className="text-[10px] bg-amber-500/20 text-amber-200 hover:bg-amber-500/20">
                          React #185
                        </Badge>
                      )}
                      <p className="text-sm font-medium break-words">{latest.error_message}</p>
                    </div>
                    <p className="text-xs text-white/40 mt-1 font-mono break-all">
                      {g.route} · {g.source} · builds: {g.builds.join(", ")}
                    </p>
                    <p className="text-xs text-white/40 mt-0.5">
                      first {new Date(g.firstSeen).toLocaleString()} · last{" "}
                      {new Date(g.lastSeen).toLocaleString()}
                    </p>
                  </button>
                  {expanded === g.fingerprint && (
                    <pre className="mt-3 text-[11px] font-mono text-white/60 bg-black/40 rounded-lg p-3 max-h-80 overflow-auto whitespace-pre-wrap break-words">
                      {[
                        `Fingerprint: ${g.fingerprint}`,
                        `Occurrences: ${g.occurrences.length}`,
                        `Route: ${latest.route ?? "—"}`,
                        `User agent: ${latest.user_agent ?? "—"}`,
                        "",
                        "Stack:",
                        latest.stack_trace ?? "(none)",
                        "",
                        "Component stack:",
                        latest.component_stack ?? "(none)",
                      ].join("\n")}
                    </pre>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <div className="text-xs uppercase tracking-wide text-white/50">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}

export default AdminErrors;
