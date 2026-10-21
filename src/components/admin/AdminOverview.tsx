import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  RefreshCw,
  Sparkles,
  Building2,
  Package,
  MessageSquare,
  Check,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAdminHubs } from "@/hooks/useAdminWorkspace";
import { adminFunction, hubEditPath } from "@/lib/admin/workspace";
type Billing = {
  mrr_cents: number;
  active_count: number;
  trialing_count: number;
  past_due_count: number;
  past_due_mrr_cents: number;
  excluded_count: number;
  updated_at: string;
  methodology: string;
  trials_ending: { name: string; ends_at: string }[];
};
const money = (c: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(c / 100);
export default function AdminOverview() {
  const { user } = useAuth();
  const hubs = useAdminHubs();
  const billing = useQuery({
    queryKey: ["admin-billing", user?.id],
    queryFn: () => adminFunction<Billing>("admin-billing-summary"),
    staleTime: 120_000,
    retry: 2,
  });
  const b = billing.data,
    progress = b ? Math.min(100, b.mrr_cents / 10000) : 0;
  const live = hubs.data?.filter((h) => h.is_approved).length;
  return (
    <div className="aw-overview">
      <div className="aw-page-heading aw-heading-row">
        <div>
          <p className="aw-eyebrow">A LITTLE PROGRESS, EVERY DAY</p>
          <h1>
            Good to see you, Jorge<span className="aw-wave"> ✦</span>
          </h1>
          <p>Your business at a glance. Room to focus on what’s next.</p>
        </div>
        <button
          className="aw-icon-button"
          aria-label="Refresh dashboard"
          onClick={() => {
            void billing.refetch();
            void hubs.refetch();
          }}
        >
          <RefreshCw
            size={17}
            className={
              billing.isFetching || hubs.isFetching ? "animate-spin" : ""
            }
          />
        </button>
      </div>
      <section className="aw-goal">
        <div className="aw-goal-copy">
          <span className="aw-goal-label">
            <Sparkles size={16} /> THE ROAD TO $10K / MONTH
          </span>
          <h2>Big goal. One connection at a time.</h2>
          <p>Build a business that keeps growing with you.</p>
          <div className="aw-revenue">
            <strong>
              {b ? money(b.mrr_cents) : billing.isError ? "—" : "Loading…"}
            </strong>
            <span>monthly recurring revenue</span>
          </div>
          <div
            className="aw-progress"
            role="progressbar"
            aria-label="Monthly revenue goal"
            aria-valuenow={b ? progress : undefined}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span style={{ width: `${progress}%` }} />
          </div>
          <div className="aw-goal-caption">
            <span>
              {b
                ? `${progress.toFixed(1)}% of your goal`
                : "Waiting for verified billing"}
            </span>
            <span>$10,000 / month</span>
          </div>
          {billing.isError && (
            <p role="status" className="aw-inline-error">
              {b ? "Showing the last successful update. " : ""}Billing couldn’t
              refresh.{" "}
              <button onClick={() => billing.refetch()}>Retry billing</button>
            </p>
          )}
          <details className="aw-metric-note">
            <summary>What counts toward this goal?</summary>
            <p>
              {b?.methodology ||
                "USD recurring subscriptions, normalized monthly. Free trials and gift accounts do not count. This is a subscription run rate, not cash collected."}
            </p>
            {b?.excluded_count ? (
              <p>
                {b.excluded_count} subscriptions need a separate billing review
                and are excluded from this estimate.
              </p>
            ) : null}
            {b && (
              <p>
                Updated{" "}
                {new Date(b.updated_at).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            )}
          </details>
        </div>
        <div className="aw-goal-art" aria-hidden="true">
          <div className="aw-orbit" />
          <span className="aw-sun">✺</span>
          <div className="aw-step aw-step-1" />
          <div className="aw-step aw-step-2" />
          <div className="aw-step aw-step-3" />
          <span className="aw-growth-arrow">↗</span>
          <span className="aw-art-note">Make good things happen.</span>
        </div>
      </section>
      <div className="aw-stats">
        <div>
          <span className="aw-stat-dot aw-green" />
          <span>Live hubs</span>
          <strong>{live ?? "—"}</strong>
          <small>Approved hubs across your accounts</small>
        </div>
        <div>
          <span className="aw-stat-dot aw-peach" />
          <span>Active subscriptions</span>
          <strong>{b?.active_count ?? "—"}</strong>
          <small>Live Stripe billing, excluding free trials</small>
        </div>
        <div>
          <span className="aw-stat-dot aw-lilac" />
          <span>Real trials</span>
          <strong>{b?.trialing_count ?? "—"}</strong>
          <small>Verified in Stripe. Gift accounts excluded.</small>
        </div>
      </div>
      <div className="aw-section-heading">
        <h2>What would you like to do?</h2>
        <span>One place for your daily work</span>
      </div>
      <div className="aw-quick-grid">
        {[
          {
            label: "Edit a hub",
            copy: "Find anyone. Make it theirs.",
            path: "/admin?section=accounts",
            icon: Building2,
          },
          {
            label: "Manage orders",
            copy: "From artwork to their doorstep.",
            path: "/admin?section=orders",
            icon: Package,
          },
          {
            label: "Share an update",
            copy: "Keep your customers in the loop.",
            path: "/admin?section=messages",
            icon: MessageSquare,
          },
        ].map((d) => (
          <Link key={d.path} to={d.path}>
            <d.icon size={23} />
            <h3>{d.label}</h3>
            <p>{d.copy}</p>
            <ArrowUpRight className="aw-quick-arrow" size={20} />
          </Link>
        ))}
      </div>
      <div className="aw-lower-grid">
        <section className="aw-panel">
          <div className="aw-section-heading">
            <h2>Recently added hubs</h2>
            <Link to="/admin?section=accounts">
              View all <ArrowRight size={15} />
            </Link>
          </div>
          {hubs.isError ? (
            <p className="aw-inline-error">
              Hubs couldn’t refresh.{" "}
              <button onClick={() => hubs.refetch()}>Try again</button>
            </p>
          ) : hubs.isPending ? (
            <p className="aw-muted">Loading your hubs…</p>
          ) : hubs.data?.length === 0 ? (
            <p className="aw-muted">New hubs will appear here.</p>
          ) : (
            hubs.data?.slice(0, 4).map((h) => (
              <Link
                key={`${h.kind}:${h.id}`}
                className="aw-hub-row"
                to={hubEditPath(h)}
              >
                <span className="aw-avatar">{h.name.slice(0, 1)}</span>
                <span>
                  <strong>{h.name}</strong>
                  <small>tapaway.co/{h.slug || "draft"}</small>
                </span>
                <ArrowUpRight size={17} />
              </Link>
            ))
          )}
        </section>
        <section className="aw-panel aw-calm-panel">
          <span className="aw-soft-icon">
            <Check size={23} />
          </span>
          <h2>Keep it simple.</h2>
          <p>
            Gift accounts stay welcome. Their old trial dates won’t fill your
            dashboard with reminders.
          </p>
          {!!b?.past_due_count && (
            <Link
              to="https://dashboard.stripe.com/subscriptions?status=past_due"
              target="_blank"
              rel="noreferrer"
            >
              Review {b.past_due_count} past-due subscriptions{" "}
              <ArrowUpRight size={16} />
            </Link>
          )}
          <Link to="/admin?section=support">
            Open customer support <ArrowRight size={16} />
          </Link>
        </section>
      </div>
    </div>
  );
}
