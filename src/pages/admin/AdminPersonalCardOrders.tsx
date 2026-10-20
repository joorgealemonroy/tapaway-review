import { useCallback, useEffect, useState } from "react";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { supabase } from "@/integrations/supabase/client";
import { callFunction } from "@/lib/paymentFirst";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
type Order = {
  id: string;
  status: string;
  production_status: string;
  hub_requested: boolean;
  customer_name: string;
  email: string;
  shipping_address: Record<string, string>;
  destinations: string[];
  tracking?: string;
  paid_at: string;
  stripe_livemode: boolean;
  artwork_revision: string;
};
export default function AdminPersonalCardOrders() {
  const { isAdmin, loading } = useAdminGuard();
  const [orders, setOrders] = useState<Order[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [checks, setChecks] = useState<Record<string, boolean>>({}),
    [tracking, setTracking] = useState<Record<string, string>>({});
  const request = useCallback(async (body: Record<string, unknown>) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error("Please sign in again.");
    const result = await callFunction<{
      orders?: Order[];
      url?: string;
      error?: string;
    }>("personal-card-admin", body, session.access_token);
    if (!result.ok)
      throw new Error(result.data.error || "Couldn't load the print queue.");
    return result.data;
  }, []);
  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      setOrders((await request({ action: "list" })).orders || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load orders.");
    } finally {
      setBusy(false);
    }
  }, [request]);
  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);
  const download = async (orderId: string, file: "pdf" | "source") => {
    try {
      const data = await request({ action: "download", orderId, file });
      if (data.url) {
        const a = document.createElement("a");
        a.href = data.url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.click();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Download unavailable.");
    }
  };
  const advance = async (order: Order, status: string) => {
    setBusy(true);
    try {
      await request({
        action: "status",
        orderId: order.id,
        status,
        printChecks: checks[order.id],
        tracking: tracking[order.id],
      });
      toast.success("Production status saved.");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save status.");
    } finally {
      setBusy(false);
    }
  };
  if (loading || !isAdmin)
    return <div className="p-10">Checking admin access…</div>;
  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white px-4 pb-12">
      <div className="max-w-6xl mx-auto">
        <AdminPageHeader
          title="Personal card print queue"
          subtitle="Paid $39 orders · 2 cards · four print pages"
          actions={
            <Button onClick={load} disabled={busy}>
              Refresh
            </Button>
          }
        />
        <section className="rounded-xl border border-white/15 p-5 text-sm leading-7 mb-6">
          <strong>Production setup</strong>
          <p>
            CR80 landscape · 85.60 × 53.98 mm · print at 100%, no “fit to page.”
            Pages: card 1 front, card 1 back, card 2 front, card 2 back. Target:
            300 dpi. YMCKO uses a full color panel set for each printed side.
          </p>
          <p>
            Confirm the installed printer model and R5F208A100 ribbon
            compatibility. Check driver black-panel extraction, overlay, color
            profile, and duplex orientation on a sample card before a batch. The
            PDF does not configure the driver or encode NFC.
          </p>
          <p>
            Before approval: inspect all four pages, scan each QR, check small
            text and margins, and compare the destinations below. After
            printing, program each NFC chip with its destination and test both
            tap and QR on the physical cards.
          </p>
        </section>
        {error && (
          <p role="alert" className="text-red-200 p-4">
            {error}
          </p>
        )}
        {!busy && !error && !orders.length && (
          <p className="text-white/70 p-8">
            Paid personal card orders will appear here after payment
            confirmation.
          </p>
        )}
        <div className="space-y-5">
          {orders.map((order) => (
            <article
              key={order.id}
              className="border border-white/15 rounded-xl p-5"
            >
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">
                    {order.customer_name || "Personal card order"}
                  </h2>
                  <p className="text-sm text-white/70">{order.email}</p>
                  <p className="text-xs text-white/50 mt-1">
                    {order.id} · {new Date(order.paid_at).toLocaleDateString()}{" "}
                    ·{" "}
                    {order.stripe_livemode
                      ? "LIVE PAYMENT"
                      : "TEST — do not fulfill"}
                  </p>
                </div>
                <span className="text-sm">
                  {order.status} / {order.production_status.replace(/_/g, " ")}
                </span>
              </div>
              <div className="grid sm:grid-cols-2 gap-5 my-5 text-sm">
                <div>
                  <h3 className="font-semibold mb-2">Ship to</h3>
                  <address className="not-italic whitespace-pre-line text-white/80">
                    {[
                      order.shipping_address?.name,
                      order.shipping_address?.line1,
                      order.shipping_address?.line2,
                      [
                        order.shipping_address?.city,
                        order.shipping_address?.state,
                        order.shipping_address?.postal_code,
                      ]
                        .filter(Boolean)
                        .join(" "),
                      order.shipping_address?.country,
                    ]
                      .filter(Boolean)
                      .join("\n")}
                  </address>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">NFC & QR destinations</h3>
                  {order.destinations.map((url, i) => (
                    <p key={i} className="break-all mb-2">
                      Card {i + 1}:{" "}
                      <a
                        className="underline"
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {url}
                      </a>
                    </p>
                  ))}
                  <p className="text-white/60">
                    {order.hub_requested
                      ? "Optional $5/month hub"
                      : "One-time cards, external links"}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 mb-4">
                <Button
                  variant="outline"
                  onClick={() => download(order.id, "pdf")}
                >
                  Download 4-page print PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={() => download(order.id, "source")}
                >
                  Download design source
                </Button>
              </div>
              {order.status === "paid" && (
                <div className="space-y-3">
                  {order.production_status === "needs_review" && (
                    <>
                      <label className="flex gap-3 text-sm">
                        <input
                          type="checkbox"
                          checked={!!checks[order.id]}
                          onChange={(e) =>
                            setChecks((c) => ({
                              ...c,
                              [order.id]: e.target.checked,
                            }))
                          }
                        />
                        All four pages, print quality, and both QR destinations
                        checked. Printer settings and sample orientation
                        confirmed.
                      </label>
                      <Button
                        disabled={busy || !checks[order.id]}
                        onClick={() => advance(order, "approved")}
                      >
                        Approve artwork
                      </Button>
                    </>
                  )}
                  {order.production_status === "approved" && (
                    <Button
                      disabled={busy}
                      onClick={() => advance(order, "printed")}
                    >
                      Mark printed & NFC tested
                    </Button>
                  )}
                  {order.production_status === "printed" && (
                    <div className="flex gap-3">
                      <Input
                        aria-label={`Tracking for ${order.id}`}
                        placeholder="Carrier + tracking/reference"
                        value={tracking[order.id] || ""}
                        onChange={(e) =>
                          setTracking((t) => ({
                            ...t,
                            [order.id]: e.target.value,
                          }))
                        }
                      />
                      <Button
                        disabled={busy || !tracking[order.id]?.trim()}
                        onClick={() => advance(order, "shipped")}
                      >
                        Mark shipped
                      </Button>
                    </div>
                  )}
                  {order.production_status === "on_hold" && (
                    <Button
                      disabled={busy}
                      onClick={() => advance(order, "needs_review")}
                    >
                      Return to review
                    </Button>
                  )}
                  {["needs_review", "approved", "printed"].includes(
                    order.production_status,
                  ) && (
                    <Button
                      variant="ghost"
                      disabled={busy}
                      onClick={() => advance(order, "on_hold")}
                    >
                      Put on hold
                    </Button>
                  )}
                  {order.tracking && (
                    <p className="text-sm">Tracking: {order.tracking}</p>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
