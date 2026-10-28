import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, ArrowUpRight, Gift, RefreshCw } from "lucide-react";
import { useAdminHubs } from "@/hooks/useAdminWorkspace";
import {
  billingLabel,
  hubEditPath,
  workspaceRpc,
  type Hub,
} from "@/lib/admin/workspace";
import { toast } from "sonner";
import RequireHubPaymentDialog, { type HubPaymentTarget } from "./RequireHubPaymentDialog";
export default function AdminHubs() {
  const hubs = useAdminHubs();
  const [paymentTarget, setPaymentTarget] = useState<HubPaymentTarget>(null);
  const [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all"),
    [busy, setBusy] = useState("");
  const rows = useMemo(() => {
    const q = search.toLowerCase().replace(/[^a-z0-9]/g, "");
    return (hubs.data || []).filter(
      (h) =>
        (filter === "all" ||
          (filter === "gift" && h.payment_state === "complimentary") ||
          (filter === "live" && h.is_approved && h.payment_state !== "payment_required") ||
          (filter === "payment" && h.payment_state === "payment_required") ||
          (filter === "draft" && !h.is_approved)) &&
        (!q ||
          `${h.name}${h.slug}`
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "")
            .includes(q)),
    );
  }, [hubs.data, search, filter]);
  const gift = async (h: Hub) => {
    if (
      !window.confirm(
        `Mark ${h.name} as a gift account? This removes trial reminders. It does not change Stripe billing.`,
      )
    )
      return;
    setBusy(h.id);
    try {
      await workspaceRpc("admin_gift_unbilled_hub", {
        _id: h.id,
        _kind: h.kind,
      });
      await hubs.refetch();
      toast.success("Gift account saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy("");
    }
  };
  return (
    <>
      <div className="aw-page-heading aw-heading-row">
        <div>
          <p className="aw-eyebrow">EVERY CONNECTION, IN ONE PLACE</p>
          <h1>Hubs & accounts</h1>
          <p>
            Search, open and edit. All your hubs are here, including drafts.
          </p>
        </div>
        <button
          className="aw-icon-button"
          aria-label="Refresh hubs"
          onClick={() => hubs.refetch()}
        >
          <RefreshCw size={18} />
        </button>
      </div>
      <div className="aw-directory-tools">
        <div className="aw-searchbox">
          <Search size={18} />
          <input
            aria-label="Search hubs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search a name or tapaway.co link"
          />
        </div>
        <select
          aria-label="Filter hubs"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All hubs</option>
          <option value="live">Live hubs</option>
          <option value="draft">Drafts & review</option>
          <option value="gift">Gift accounts</option>
          <option value="payment">Payment required</option>
        </select>
      </div>
      {hubs.isError && (
        <div className="aw-inline-error" role="status">
          We couldn’t refresh your hubs.{" "}
          <button onClick={() => hubs.refetch()}>Try again</button>
        </div>
      )}
      <p className="aw-caption">
        {hubs.data
          ? `${rows.length} hubs · Views and clicks from validated human traffic in the last 30 days.`
          : "Loading your directory…"}
      </p>
      <div className="aw-directory">
        {rows.map((h) => (
          <article key={`${h.kind}:${h.id}`} className="aw-directory-row">
            <div className="aw-hub-identity">
              <span className="aw-avatar">
                {h.photo_url ? (
                  <img src={h.photo_url} alt="" loading="lazy" />
                ) : (
                  h.name.slice(0, 1)
                )}
              </span>
              <div>
                <Link to={hubEditPath(h)}>
                  <h2>{h.name}</h2>
                </Link>
                <span>tapaway.co/{h.slug || "draft"}</span>
              </div>
            </div>
            <div className="aw-hub-badges">
              <span
                className={
                  h.is_approved && h.payment_state !== "payment_required" ? "aw-badge aw-badge-green" : "aw-badge"
                }
              >
                {h.payment_state === "payment_required" ? "Paused" : h.is_approved ? "Live" : "Draft / review"}
              </span>
              <span className="aw-caption">{billingLabel(h)}</span>
            </div>
            <div className="aw-hub-counts">
              <span>
                <strong>{h.views.toLocaleString()}</strong> views
              </span>
              <span>
                <strong>{h.clicks.toLocaleString()}</strong> clicks
              </span>
            </div>
            <div className="aw-hub-actions flex-wrap">
              <Link className="aw-small-button" to={hubEditPath(h)}>
                Edit hub <ArrowUpRight size={15} />
              </Link>
              {h.slug && (
                <a
                  href={`/${encodeURIComponent(h.slug)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="aw-icon-button"
                  aria-label={`View ${h.name}`}
                >
                  <ArrowUpRight size={17} />
                </a>
              )}
              {!h.stripe_subscription_id &&
                h.payment_state !== "complimentary" && h.payment_state !== "payment_required" && (
                  <button
                    className="aw-icon-button"
                    disabled={busy === h.id}
                    onClick={() => gift(h)}
                    aria-label={`Mark ${h.name} as gift`}
                    title="Mark as a gift account"
                  >
                    <Gift size={17} />
                  </button>
                )}
              {h.kind === "personal" && h.is_approved && !h.stripe_subscription_id && h.payment_state !== "complimentary" && h.payment_state !== "payment_required" && (
                <button className="aw-small-button" onClick={() => setPaymentTarget({ id: h.id, name: h.name, slug: h.slug })}>
                  Require payment
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
      {hubs.data && rows.length === 0 && (
        <div className="aw-empty">
          No hubs match. Try a shorter name or choose All hubs.
        </div>
      )}
      <p className="aw-caption">
        “No subscription” means no Stripe subscription is linked. Use the gift
        icon only for accounts you’ve given free access.
      </p>
      <RequireHubPaymentDialog target={paymentTarget} onClose={() => setPaymentTarget(null)} onSaved={async () => { await hubs.refetch(); }} />
    </>
  );
}
