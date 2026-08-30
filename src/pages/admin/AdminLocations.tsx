import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { LocationsMap } from "@/components/admin/LocationsMap";
import {
  AlertTriangle,
  
  Clock,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  ShieldQuestion,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  BusinessLocation,
  LOCATION_STATES,
  LOCATION_STATE_LABELS,
  LocationState,
  STATUS_LABELS,
  StatusKey,
  badgeFor,
  locationsApi,
  matchesStatus,
  useLocationIntel,
} from "@/hooks/useLocationIntel";

const CARD_ORDER: StatusKey[] = [
  "active_paid",
  "active_complimentary",
  "active_unknown",
  "trial",
  "failed_trial",
  "payment_attention",
  "inactive",
  "unmappable",
  "follow_ups_due",
];

const relative = (iso: string | null) => {
  if (!iso) return "never";
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
};

const Panel = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-xl border border-white/5 bg-white/[0.02] ${className}`}>{children}</div>
);

const ClassifyDialog = ({
  location,
  onClose,
  onSaved,
}: {
  location: BusinessLocation | null;
  onClose: () => void;
  onSaved: () => void;
}) => {
  const [paymentState, setPaymentState] = useState("paying");
  const [billingInterval, setBillingInterval] = useState("monthly");
  const [billingSource, setBillingSource] = useState("manual_invoice");
  const [paidThroughAt, setPaidThroughAt] = useState("");
  const [lastPaymentAt, setLastPaymentAt] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const needsPaidThrough =
    paymentState === "paying" && (billingInterval === "annual" || billingInterval === "one_time");

  const save = async () => {
    if (!location) return;
    if (!reason.trim()) {
      toast.error("A reason is required");
      return;
    }
    if (needsPaidThrough && !paidThroughAt) {
      toast.error("Annual and one-time classifications need a paid-through date");
      return;
    }
    setSaving(true);
    try {
      await locationsApi.classify({
        locationId: location.id,
        paymentState,
        billingInterval,
        billingSource,
        paidThroughAt: paidThroughAt || null,
        lastPaymentAt: lastPaymentAt || null,
        reason: reason.trim(),
      });
      toast.success("Classification saved");
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!location} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Classify billing</DialogTitle>
          <DialogDescription>
            {location?.display_name ?? "Location"} — this records the change with your name, the
            time and a reason. It does not change the live hub or any billing record.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Payment state</Label>
            <Select value={paymentState} onValueChange={setPaymentState}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["paying", "complimentary", "trialing", "past_due", "canceled", "none", "unknown_manual"].map((v) => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Billing interval</Label>
              <Select value={billingInterval} onValueChange={setBillingInterval}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["monthly", "annual", "one_time", "custom", "none", "unknown"].map((v) => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Billing source</Label>
              <Select value={billingSource} onValueChange={setBillingSource}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["stripe_subscription", "stripe_payment", "manual_invoice", "cash", "complimentary", "legacy_manual", "unknown"].map((v) => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Last payment</Label>
              <Input type="date" value={lastPaymentAt} onChange={(e) => setLastPaymentAt(e.target.value)} />
            </div>
            <div>
              <Label>Paid through {needsPaidThrough && <span className="text-orange-400">*</span>}</Label>
              <Input type="date" value={paidThroughAt} onChange={(e) => setPaidThroughAt(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Reason</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
              placeholder="e.g. Pays $180/yr by invoice, confirmed with owner 2026-08-30" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Save classification
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const VISIT_OUTCOMES = [
  "visited",
  "spoke_with_owner",
  "follow_up",
  "converted",
  "not_interested",
  "closed",
];

/** Field visit log. Operational only — it never touches access or billing. */
const VisitDialog = ({
  location,
  onClose,
  onSaved,
}: {
  location: BusinessLocation | null;
  onClose: () => void;
  onSaved: () => void;
}) => {
  const [outcome, setOutcome] = useState("visited");
  const [notes, setNotes] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!location) return;
    setSaving(true);
    try {
      await locationsApi.logVisit({
        locationId: location.id,
        outcome,
        notes: notes.trim() || null,
        nextFollowUpAt: followUp || null,
      });
      toast.success("Visit recorded");
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to record visit");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!location} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record visit</DialogTitle>
          <DialogDescription>{location?.display_name ?? "Location"}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Outcome</Label>
            <Select value={outcome} onValueChange={setOutcome}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {VISIT_OUTCOMES.map((v) => (
                  <SelectItem key={v} value={v}>{v.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Next follow-up</Label>
            <Input type="date" value={followUp} onChange={(e) => setFollowUp(e.target.value)} />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Save visit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


export default function AdminLocations() {
  const [params, setParams] = useSearchParams();
  const filter = (params.get("status") as StatusKey | null) ?? null;
  const stateFilter = (params.get("state") as LocationState | null) ?? null;
  const [search, setSearch] = useState("");
  const [classifying, setClassifying] = useState<BusinessLocation | null>(null);
  const [route, setRoute] = useState<string[]>([]);
  const [auditing, setAuditing] = useState(false);

  const {
    locations, counts, stateCounts, loading, error, syncing, reload, resync,
    lastSyncedAt, staleCoordinates, failedGoogleJobs, apiLog,
    hydrating, hydrate, lastHydrateRun, mapping,
  } = useLocationIntel(true);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return locations.filter((l) => {
      if (filter && !matchesStatus(l, filter)) return false;
      if (stateFilter && l.location_state !== stateFilter) return false;
      if (!q) return true;
      return [l.display_name, l.hub_slug, l.formatted_address, l.city]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q));
    });
  }, [locations, filter, stateFilter, search]);

  const runAudit = async () => {
    setAuditing(true);
    try {
      const res = await locationsApi.auditCoverage();
      const r = res.result;
      toast.success(
        `Coverage audit: ${r?.inserted ?? 0} added · ${r?.state_changed ?? 0} states updated · ${r?.duplicates ?? 0} duplicates flagged`,
      );
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Coverage audit failed");
    } finally {
      setAuditing(false);
    }
  };

  const resolveState = async (loc: BusinessLocation, next: LocationState) => {
    try {
      await locationsApi.setState(loc.id, next, "Resolved from the admin locations review queue");
      toast.success(`${loc.display_name ?? "Location"} marked as ${LOCATION_STATE_LABELS[next]}`);
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update the location state");
    }
  };

  // Marker actions are dispatched from inside the Google InfoWindow portal.
  useEffect(() => {
    const byId = (id: string) => locations.find((l) => l.id === id) ?? null;
    const onRoute = (e: Event) => {
      const id = (e as CustomEvent<{ id: string }>).detail?.id;
      if (!id) return;
      setRoute((r) => (r.includes(id) ? r : [...r, id]));
      toast.success(`${byId(id)?.display_name ?? "Location"} added to the route`);
    };
    const onVisit = (e: Event) => {
      const id = (e as CustomEvent<{ id: string }>).detail?.id;
      const loc = id ? byId(id) : null;
      if (loc) setVisiting(loc);
    };
    window.addEventListener("tapaway:add-to-route", onRoute);
    window.addEventListener("tapaway:record-visit", onVisit);
    return () => {
      window.removeEventListener("tapaway:add-to-route", onRoute);
      window.removeEventListener("tapaway:record-visit", onVisit);
    };
  }, [locations]);

  const [visiting, setVisiting] = useState<BusinessLocation | null>(null);

  const runHydrate = async () => {
    try {
      const res = await hydrate();
      toast.success(
        `Hydrated ${res.run.hydrated} Place IDs · ${res.run.invalid} invalid · ${res.run.failed} failed`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Hydration failed");
    }
  };

  const attention = useMemo(() => ([
    { label: "Unknown payment — needs classification", count: counts.active_unknown, key: "active_unknown" as StatusKey },
    { label: "Expired but still marked trialing", count: counts.failed_trial, key: "failed_trial" as StatusKey },
    { label: "Missing Place ID or address", count: counts.unmappable, key: "unmappable" as StatusKey },
    { label: "Legacy / duplicate hubs to review", count: locations.filter((l) => l.needs_review).length, key: null },
    { label: "Follow-ups due or overdue", count: counts.follow_ups_due, key: "follow_ups_due" as StatusKey },
  ]), [counts, locations]);

  const setFilter = (key: StatusKey | null) => {
    if (!key) setParams({});
    else setParams({ status: key });
  };

  const MAP_STATS: Array<[string, number]> = [
    ["Total locations", mapping.total],
    ["Mapped", mapping.mapped],
    ["Place IDs hydrated", lastHydrateRun?.hydrated ?? 0],
    ["Invalid Place IDs", mapping.invalidPlaceIds],
    ["Missing Place IDs", mapping.missingPlaceIds],
    ["Failed API requests", mapping.failedRequests],
    ["Still unmappable", mapping.stillUnmappable],
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white">
      <div className="max-w-7xl mx-auto px-4 py-4 space-y-6">
        <AdminPageHeader
          title="Locations"
          subtitle="Classification and field operations. Nothing here changes hub access or billing."
          icon={<MapPin className="h-5 w-5 text-emerald-400" />}
          actions={
            <>
              <Button variant="outline" size="sm" onClick={() => void runHydrate()} disabled={hydrating}>
                {hydrating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <MapPin className="h-4 w-4 mr-2" />}
                Hydrate Place IDs
              </Button>
              <Button variant="outline" size="sm" onClick={resync} disabled={syncing}>
                {syncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Re-sync from hubs
              </Button>
            </>
          }
        />

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {MAP_STATS.map(([label, value]) => (
            <div key={label} className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
              <div className="text-[10px] uppercase tracking-widest text-white/35">{label}</div>
              <div className="text-lg font-semibold tabular-nums">{value}</div>
            </div>
          ))}
        </div>

        <LocationsMap locations={rows} />

        {route.length > 0 && (
          <Panel className="p-3 text-xs text-white/60 flex items-center justify-between">
            <span>{route.length} location{route.length === 1 ? "" : "s"} queued for the next route</span>
            <button className="underline" onClick={() => setRoute([])}>Clear route</button>
          </Panel>
        )}

        <Panel className="p-4 flex flex-wrap gap-6 text-xs text-white/50">
          <span className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> Last sync: {relative(lastSyncedAt)}</span>
          <span className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> Coordinates missing or expired: {staleCoordinates}</span>
          <span className="flex items-center gap-2">
            <AlertTriangle className={`h-3.5 w-3.5 ${failedGoogleJobs ? "text-orange-400" : ""}`} />
            Failed Google refresh jobs: {failedGoogleJobs}
          </span>
          <span>Google calls logged: {apiLog.length}</span>
        </Panel>

        {error && (
          <Panel className="p-4 border-red-500/30 bg-red-500/[0.06] text-sm text-red-300">
            {error}{" "}
            <button className="underline" onClick={() => void reload()}>Retry</button>
          </Panel>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {CARD_ORDER.map((key) => (
            <button
              key={key}
              onClick={() => setFilter(filter === key ? null : key)}
              className={`text-left rounded-xl border p-4 transition ${
                filter === key
                  ? "border-emerald-500/40 bg-emerald-500/[0.08]"
                  : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04]"
              }`}
            >
              <div className="text-[11px] uppercase tracking-widest text-white/40">{STATUS_LABELS[key]}</div>
              <div className="text-2xl font-semibold mt-1 tabular-nums">
                {loading ? <span className="inline-block h-6 w-10 rounded bg-white/[0.06] animate-pulse" /> : counts[key]}
              </div>
            </button>
          ))}
        </div>

        <Panel className="p-4">
          <div className="text-xs uppercase tracking-widest text-white/40 mb-3 flex items-center gap-2">
            <ShieldQuestion className="h-3.5 w-3.5" /> Needs attention
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {attention.map((a) => (
              <button
                key={a.label}
                disabled={!a.key}
                onClick={() => a.key && setFilter(a.key)}
                className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-sm text-white/70 disabled:opacity-60 hover:bg-white/[0.04]"
              >
                <span>{a.label}</span>
                <span className="tabular-nums font-semibold text-white">{a.count}</span>
              </button>
            ))}
          </div>
        </Panel>

        <Panel className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <Input className="pl-9" placeholder="Search name, slug or address"
                value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            {filter && (
              <Badge variant="outline" className="cursor-pointer" onClick={() => setFilter(null)}>
                {STATUS_LABELS[filter]} ✕
              </Badge>
            )}
            <span className="text-xs text-white/40">{rows.length} shown</span>
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-12 rounded-lg bg-white/[0.03] animate-pulse" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center text-sm text-white/40">
              No locations match this view.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-widest text-white/35">
                    <th className="py-2 pr-3">Business</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Billing</th>
                    <th className="py-2 pr-3">Address</th>
                    <th className="py-2 pr-3">Map data</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((l) => {
                    const b = badgeFor(l);
                    return (
                      <tr key={l.id} className="border-t border-white/5">
                        <td className="py-2.5 pr-3">
                          <div className="font-medium">{l.display_name ?? "—"}</div>
                          <div className="text-xs text-white/35">/{l.hub_slug ?? "—"} · {l.hub_kind}</div>
                        </td>
                        <td className="py-2.5 pr-3">
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] ${b.tone}`}>
                            {b.label}
                          </span>
                          {l.needs_review && (
                            <span className="ml-1 inline-flex rounded-full border border-white/15 px-2 py-0.5 text-[11px] text-white/50">
                              review
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 pr-3 text-xs text-white/50">
                          {l.payment_state} · {l.billing_interval}
                          {l.classification_is_manual && <span className="text-emerald-400"> · manual</span>}
                        </td>
                        <td className="py-2.5 pr-3 text-xs text-white/50 max-w-[240px] truncate">
                          {l.formatted_address ?? "—"}
                        </td>
                        <td className="py-2.5 pr-3 text-xs text-white/50">
                          {l.google_place_id ? "Place ID" : "no place id"}
                          {l.lat ? " · coords" : " · no coords"}
                        </td>
                        <td className="py-2.5 text-right">
                          <Button size="sm" variant="ghost" onClick={() => setClassifying(l)}>Classify</Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <ClassifyDialog
        location={classifying}
        onClose={() => setClassifying(null)}
        onSaved={() => void reload()}
      />

      <VisitDialog
        location={visiting}
        onClose={() => setVisiting(null)}
        onSaved={() => void reload()}
      />
    </div>
  );
}
