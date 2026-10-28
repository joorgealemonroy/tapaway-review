import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  RefreshCw,
  Eye,
  MousePointerClick,
  Users,
  ShieldCheck,
} from "lucide-react";
import { workspaceRpc } from "@/lib/admin/workspace";
import { useAdminHubs } from "@/hooks/useAdminWorkspace";
type Insights = {
  site_views: number;
  hub_views: number;
  visit_sessions: number;
  link_clicks: number;
  excluded: number;
  raw_events: number;
  since: string;
  updated_at: string;
};
export default function AdminAnalytics() {
  const [days, setDays] = useState(30);
  const hubs = useAdminHubs();
  const report = useQuery({
    queryKey: ["admin-insights", days],
    queryFn: () =>
      workspaceRpc<Insights>("admin_workspace_insights", { _days: days }),
    staleTime: 60_000,
    retry: 2,
  });
  const d = report.data;
  return (
    <>
      <div className="aw-page-heading aw-heading-row">
        <div>
          <p className="aw-eyebrow">CLEAR NUMBERS. BETTER DECISIONS.</p>
          <h1>See what’s connecting.</h1>
          <p>
            Website traffic and hub engagement, with the noise filtered out.
          </p>
        </div>
        <div className="aw-form-actions">
          <select
            aria-label="Analytics date range"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            {[7, 30, 90].map((n) => (
              <option key={n} value={n}>
                Last {n} days
              </option>
            ))}
          </select>
          <button
            className="aw-icon-button"
            aria-label="Refresh insights"
            onClick={() => report.refetch()}
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>
      {report.isError && (
        <div className="aw-inline-error" role="status">
          Insights couldn’t refresh.{" "}
          {d ? "Showing the last successful result." : ""}
          <button onClick={() => report.refetch()}>Try again</button>
        </div>
      )}
      <div className="aw-insight-stats">
        {[
          {
            label: "Website views",
            value: d?.site_views,
            icon: Eye,
            copy: "Public storefront and information pages",
          },
          {
            label: "Hub views",
            value: d?.hub_views,
            icon: Eye,
            copy: "Views of customer hubs",
          },
          {
            label: "Visit sessions",
            value: d?.visit_sessions,
            icon: Users,
            copy: "Visit IDs, not unique people",
          },
          {
            label: "Hub link clicks",
            value: d?.link_clicks,
            icon: MousePointerClick,
            copy: "Actions on customer hubs",
          },
        ].map((x) => (
          <section className="aw-panel" key={x.label}>
            <x.icon size={22} />
            <h2>{x.label}</h2>
            <strong>{x.value?.toLocaleString() ?? "—"}</strong>
            <p>{x.copy}</p>
          </section>
        ))}
      </div>
      <section className="aw-panel aw-quality">
        <ShieldCheck size={24} />
        <div>
          <h2>Only validated human traffic</h2>
          <p>
            {d
              ? `${d.excluded.toLocaleString()} bot, staff, preview, development or unvalidated events excluded in this period.`
              : "Loading traffic quality…"}{" "}
            Raw events are not visitors.
          </p>
        </div>
      </section>
      <div className="aw-lower-grid">
        <section className="aw-panel">
          <div className="aw-section-heading">
            <h2>Most viewed hubs</h2>
            <span>Last 30 days</span>
          </div>
          {hubs.isError ? (
            <p>
              Hub rankings couldn’t load.{" "}
              <button onClick={() => hubs.refetch()}>Retry</button>
            </p>
          ) : (
            hubs.data
              ?.slice()
              .sort((a, b) => b.views - a.views)
              .filter((h) => h.views > 0)
              .slice(0, 7)
              .map((h) => (
                <Link
                  key={h.id}
                  className="aw-hub-row"
                  to="/admin?section=accounts"
                >
                  <span>
                    <strong>{h.name}</strong>
                    <small>{h.clicks} link clicks</small>
                  </span>
                  <strong>{h.views} views</strong>
                </Link>
              ))
          )}
          {hubs.data && !hubs.data.some((h) => h.views > 0) && (
            <p className="aw-muted">
              No validated hub views in the last 30 days.
            </p>
          )}
        </section>
        <section className="aw-panel">
          <h2>Know what the numbers mean</h2>
          <div className="aw-methodology">
            <h3>Sessions ≠ people</h3>
            <p>
              Visit IDs live in memory and reset on reload or after inactivity.
              Returning people cannot be measured reliably, so we don’t show a
              returning-visitor total.
            </p>
            <h3>Views ≠ NFC taps</h3>
            <p>
              Hubs can open from a tap, QR code or shared link. Views are
              labelled views unless the source is known.
            </p>
            <h3>Revenue comes from billing</h3>
            <p>
              Browser events never prove a payment. Revenue uses Stripe
              subscriptions and excludes free trials.
            </p>
            <Link to="/admin">
              Open revenue overview <ArrowUpRight size={15} />
            </Link>
          </div>
          <p className="aw-caption">
            Rolling periods ending now. Legacy analytics tables are excluded;
            historical gaps are not backfilled with guesses.
          </p>
        </section>
      </div>
    </>
  );
}
