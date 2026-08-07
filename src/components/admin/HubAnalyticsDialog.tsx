import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { ExternalLink, Loader2 } from "lucide-react";

export type HubAnalyticsTarget = {
  id: string;
  kind: "legacy" | "lite";
  name: string;
  slug: string | null;
  photo_url: string | null;
  plan_type: string | null;
  subscription_status: string | null;
  created_at: string | null;
};

type Props = {
  target: HubAnalyticsTarget | null;
  onClose: () => void;
};

type RangeKey = "7d" | "30d" | "90d" | "all";

const RANGES: { key: RangeKey; label: string; days: number | null }[] = [
  { key: "7d", label: "7 days", days: 7 },
  { key: "30d", label: "30 days", days: 30 },
  { key: "90d", label: "90 days", days: 90 },
  { key: "all", label: "All time", days: null },
];

type EventRow = {
  event_type: string;
  created_at: string | null;
  meta: Record<string, string> | null;
};

/** Event names that count as a "tap" (hub opened) per hub kind. */
const TAP_EVENT = { lite: "profile_visit", legacy: "tap" } as const;

const BUSINESS_ACTION_LABELS: Record<string, string> = {
  tap: "Taps",
  google_click: "Google review clicks",
  yelp_click: "Yelp clicks",
  directions_click: "Directions",
  directions_clicked: "Directions",
  instagram_click: "Instagram",
  phone_click: "Phone calls",
  menu_view: "Menu views",
  menu_viewed: "Menu views",
};

const relativeTime = (iso: string | null) => {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
};

const isMobileUA = (ua: string) => /Mobile|Android|iPhone|iPad|iPod/i.test(ua);

/** Empty referrer means the visitor arrived directly — almost always an NFC tap. */
const referrerLabel = (ref?: string) => {
  if (!ref) return "Direct / NFC tap";
  try {
    return new URL(ref).hostname.replace(/^www\./, "");
  } catch {
    return ref.slice(0, 40);
  }
};

const HubAnalyticsDialog = ({ target, onClose }: Props) => {
  const [range, setRange] = useState<RangeKey>("30d");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<EventRow[]>([]);
  const [totals, setTotals] = useState({ taps: 0, clicks: 0, saves: 0 });
  const [lifetimeTaps, setLifetimeTaps] = useState(0);

  useEffect(() => {
    if (!target) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const days = RANGES.find((r) => r.key === range)?.days ?? null;
        const since = days ? new Date(Date.now() - days * 86400000).toISOString() : null;
        const tapEvent = TAP_EVENT[target.kind];

        if (target.kind === "lite") {
          let q = supabase
            .from("personal_analytics")
            .select("event_type, created_at, visitor_info")
            .eq("profile_id", target.id)
            .order("created_at", { ascending: false })
            .limit(5000);
          if (since) q = q.gte("created_at", since);

          // Exact counts come from head-count queries so the tiles stay right
          // even if the event list above is truncated by the row cap.
          const countQuery = (evt: string) => {
            let c = supabase
              .from("personal_analytics")
              .select("id", { count: "exact", head: true })
              .eq("profile_id", target.id)
              .eq("event_type", evt);
            if (since) c = c.gte("created_at", since);
            return c;
          };

          const [list, tapsC, clicksC, savesC, lifeC] = await Promise.all([
            q,
            countQuery("profile_visit"),
            countQuery("link_click"),
            countQuery("contact_save"),
            supabase
              .from("personal_analytics")
              .select("id", { count: "exact", head: true })
              .eq("profile_id", target.id)
              .eq("event_type", "profile_visit"),
          ]);
          if (cancelled) return;
          if (list.error) throw list.error;
          setRows(
            (list.data ?? []).map((r) => ({
              event_type: r.event_type,
              created_at: r.created_at,
              meta: (r.visitor_info as Record<string, string> | null) ?? null,
            }))
          );
          setTotals({
            taps: tapsC.count ?? 0,
            clicks: clicksC.count ?? 0,
            saves: savesC.count ?? 0,
          });
          setLifetimeTaps(lifeC.count ?? 0);
        } else {
          let q = supabase
            .from("analytics_events")
            .select("event_type, created_at, event_data")
            .eq("restaurant_id", target.id)
            .order("created_at", { ascending: false })
            .limit(5000);
          if (since) q = q.gte("created_at", since);

          const [list, lifeC] = await Promise.all([
            q,
            supabase
              .from("analytics_events")
              .select("id", { count: "exact", head: true })
              .eq("restaurant_id", target.id)
              .eq("event_type", "tap"),
          ]);
          if (cancelled) return;
          if (list.error) throw list.error;
          const data = (list.data ?? []).map((r) => ({
            event_type: r.event_type,
            created_at: r.created_at,
            meta: null,
          }));
          setRows(data);
          setTotals({
            taps: data.filter((d) => d.event_type === tapEvent).length,
            clicks: data.filter((d) => d.event_type !== tapEvent).length,
            saves: 0,
          });
          setLifetimeTaps(lifeC.count ?? 0);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setRows([]);
          setTotals({ taps: 0, clicks: 0, saves: 0 });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [target, range]);

  const derived = useMemo(() => {
    if (!target) {
      return {
        daily: [] as { date: string; taps: number }[],
        topLinks: [] as { label: string; url: string; clicks: number; share: number }[],
        devices: { mobile: 0, desktop: 0 },
        referrers: [] as { label: string; count: number }[],
        actions: [] as { label: string; count: number }[],
        lastActive: null as string | null,
        uniques: 0,
      };
    }
    const tapEvent = TAP_EVENT[target.kind];
    const days = RANGES.find((r) => r.key === range)?.days;

    // Daily series: fixed window for bounded ranges, observed span for all-time.
    const buckets: Record<string, number> = {};
    if (days) {
      for (let i = days - 1; i >= 0; i--) {
        buckets[new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)] = 0;
      }
    }
    rows
      .filter((r) => r.event_type === tapEvent && r.created_at)
      .forEach((r) => {
        const day = r.created_at!.slice(0, 10);
        if (days && !(day in buckets)) return;
        buckets[day] = (buckets[day] ?? 0) + 1;
      });
    const daily = Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, taps]) => ({
        date: new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        taps,
      }));

    const linkMap: Record<string, { label: string; url: string; clicks: number }> = {};
    const refMap: Record<string, number> = {};
    const signatures = new Set<string>();
    let mobile = 0;
    let desktop = 0;

    rows.forEach((r) => {
      const m = r.meta;
      if (r.event_type === "link_click" && m) {
        const key = m.link_id || m.link_url || m.link_label || "unknown";
        if (!linkMap[key]) {
          linkMap[key] = { label: m.link_label || "Untitled link", url: m.link_url || "", clicks: 0 };
        }
        linkMap[key].clicks++;
      }
      if (r.event_type === tapEvent && m) {
        const ref = referrerLabel(m.referrer);
        refMap[ref] = (refMap[ref] ?? 0) + 1;
        if (m.userAgent) {
          if (isMobileUA(m.userAgent)) mobile++;
          else desktop++;
        }
        signatures.add(`${m.userAgent ?? ""}|${m.referrer ?? ""}|${r.created_at?.slice(0, 13) ?? ""}`);
      }
    });

    const totalLinkClicks = Object.values(linkMap).reduce((s, l) => s + l.clicks, 0);
    const topLinks = Object.values(linkMap)
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10)
      .map((l) => ({
        ...l,
        share: totalLinkClicks ? Math.round((l.clicks / totalLinkClicks) * 100) : 0,
      }));

    const referrers = Object.entries(refMap)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const actionMap: Record<string, number> = {};
    rows.forEach((r) => {
      const label = BUSINESS_ACTION_LABELS[r.event_type] ?? r.event_type;
      actionMap[label] = (actionMap[label] ?? 0) + 1;
    });
    const actions = Object.entries(actionMap)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);

    return {
      daily,
      topLinks,
      devices: { mobile, desktop },
      referrers,
      actions,
      lastActive: rows[0]?.created_at ?? null,
      uniques: signatures.size,
    };
  }, [rows, range, target]);

  if (!target) return null;

  const isSolo = target.kind === "lite";
  const noData = !loading && rows.length === 0;
  const ageDays = target.created_at
    ? Math.floor((Date.now() - new Date(target.created_at).getTime()) / 86400000)
    : null;

  const tiles = [
    { label: "Taps", value: totals.taps },
    { label: "Link clicks", value: totals.clicks },
    ...(isSolo ? [{ label: "Contacts saved", value: totals.saves }] : []),
    ...(isSolo ? [{ label: "Unique visitors", value: derived.uniques }] : []),
  ];

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-[#0a0e1a] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-left">
            {target.photo_url ? (
              <img src={target.photo_url} alt="" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-sm">
                {target.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="truncate text-base">{target.name}</div>
              <div className="flex items-center gap-2 text-[11px] font-normal text-white/40">
                <span
                  className={`px-1.5 py-0.5 rounded-full ${
                    isSolo ? "bg-sky-500/10 text-sky-300" : "bg-violet-500/10 text-violet-300"
                  }`}
                >
                  {isSolo ? "Solo" : "Business"}
                </span>
                <span>{target.plan_type ?? "no plan"}</span>
                <span>·</span>
                <span>{target.subscription_status ?? "—"}</span>
                {target.slug && (
                  <a
                    href={`/${target.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-white/60 hover:text-white"
                  >
                    @{target.slug} <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="inline-flex rounded-lg border border-white/5 bg-white/[0.03] p-0.5 w-fit">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`px-3 h-8 rounded-md text-xs font-medium transition-colors ${
                range === r.key ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-white/50 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading analytics…
          </div>
        ) : noData ? (
          <div className="py-14 text-center space-y-1">
            <p className="text-sm text-white/70">No activity recorded in this range.</p>
            <p className="text-xs text-white/40">
              {lifetimeTaps === 0
                ? `This hub has never been tapped${
                    ageDays !== null ? ` — created ${ageDays} day${ageDays === 1 ? "" : "s"} ago` : ""
                  }.`
                : `${lifetimeTaps.toLocaleString()} taps all time — try a wider range.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {tiles.map((t) => (
                <div key={t.label} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                  <div className="text-[10px] uppercase tracking-wide text-white/40">{t.label}</div>
                  <div className="text-xl font-semibold tabular-nums">{t.value.toLocaleString()}</div>
                </div>
              ))}
            </div>
            <div className="text-[11px] text-white/40">
              Last activity: {relativeTime(derived.lastActive)} · {lifetimeTaps.toLocaleString()} taps
              all time
            </div>

            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
              <div className="text-[10px] uppercase tracking-wide text-white/40 mb-2">
                Taps per day
              </div>
              <ChartContainer
                config={{ taps: { label: "Taps", color: "hsl(var(--primary))" } }}
                className="h-[180px] w-full"
              >
                <LineChart data={derived.daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} minTickGap={24} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} width={28} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="taps" stroke="var(--color-taps)" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            </div>

            {isSolo ? (
              <>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                  <div className="text-[10px] uppercase tracking-wide text-white/40 mb-2">
                    Top links
                  </div>
                  {derived.topLinks.length === 0 ? (
                    <p className="text-xs text-white/40">No link clicks in this range.</p>
                  ) : (
                    <table className="w-full text-xs">
                      <tbody>
                        {derived.topLinks.map((l) => (
                          <tr key={`${l.label}-${l.url}`} className="border-t border-white/5 first:border-0">
                            <td className="py-1.5 pr-2">
                              <div className="text-white/90">{l.label}</div>
                              {l.url && (
                                <div className="text-[10px] text-white/35 truncate max-w-[320px]">
                                  {l.url}
                                </div>
                              )}
                            </td>
                            <td className="py-1.5 text-right tabular-nums text-white/80 w-16">
                              {l.clicks}
                            </td>
                            <td className="py-1.5 text-right tabular-nums text-white/40 w-12">
                              {l.share}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-2">
                  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                    <div className="text-[10px] uppercase tracking-wide text-white/40 mb-2">
                      Devices
                    </div>
                    <div className="text-xs space-y-1 text-white/70">
                      <div className="flex justify-between">
                        <span>Mobile</span>
                        <span className="tabular-nums">{derived.devices.mobile}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Desktop</span>
                        <span className="tabular-nums">{derived.devices.desktop}</span>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                    <div className="text-[10px] uppercase tracking-wide text-white/40 mb-2">
                      Traffic sources
                    </div>
                    {derived.referrers.length === 0 ? (
                      <p className="text-xs text-white/40">—</p>
                    ) : (
                      <div className="text-xs space-y-1 text-white/70">
                        {derived.referrers.map((r) => (
                          <div key={r.label} className="flex justify-between gap-2">
                            <span className="truncate">{r.label}</span>
                            <span className="tabular-nums">{r.count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <div className="text-[10px] uppercase tracking-wide text-white/40 mb-2">
                  Actions breakdown
                </div>
                <div className="text-xs space-y-1 text-white/70">
                  {derived.actions.map((a) => (
                    <div key={a.label} className="flex justify-between gap-2">
                      <span>{a.label}</span>
                      <span className="tabular-nums">{a.count}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-white/35 mt-2">
                  Legacy Business hubs don't record link labels, devices or referrers.
                </p>
              </div>
            )}

            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
              <div className="text-[10px] uppercase tracking-wide text-white/40 mb-2">
                Recent activity
              </div>
              <div className="space-y-1 text-xs">
                {rows.slice(0, 25).map((r, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 text-white/60">
                    <span className="truncate">
                      {BUSINESS_ACTION_LABELS[r.event_type] ?? r.event_type.replace(/_/g, " ")}
                      {r.meta?.link_label ? ` · ${r.meta.link_label}` : ""}
                    </span>
                    <span className="text-white/35 shrink-0">{relativeTime(r.created_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default HubAnalyticsDialog;
