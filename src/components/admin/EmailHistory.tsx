// EmailHistory. The /admin/emails send-history tab.
//
// Reads public.email_sends (built by the backend sibling):
//   email_sends(id, to_email, template_key, subject, status, resend_id,
//               error, sent_at, opened_at)
// Searchable by recipient, filterable by template + status, newest first.
// Row tap → detail dialog (resend_id, error, timestamps). Email BODIES are
// never shown here (PII rule). Only metadata.
// Honest empty state: "No emails sent yet." If the table isn't there yet
// (backend sibling still building), says so plainly instead of crashing.
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, MailOpen, Search, Inbox } from "lucide-react";
import { TEMPLATE_CATALOG, type TemplateKey } from "@/lib/admin/templateCatalog";

interface EmailSendRow {
  id: string;
  to_email: string;
  template_key: string;
  delivery_status?: string | null;
  subject: string | null;
  status: string;
  resend_id: string | null;
  error: string | null;
  sent_at: string | null;
  opened_at: string | null;
}

const PAGE_SIZE = 50;
const PURCHASE_EMAILS = [
  { key: "checkout_purchase", label: "Business welcome" },
  { key: "checkout_verify", label: "Confirm account ownership" },
  { key: "checkout_login", label: "Secure sign-in" },
  { key: "personal_order", label: "Personal order thank-you" },
  { key: "account_verification", label: "Verification code" },
  { key: "dashboard_access", label: "Dashboard recovery" },
  { key: "admin_dashboard_access", label: "Admin sign-in invitation" },
  { key: "legacy_personal_welcome", label: "Hub welcome" },
  { key: "legacy_signup_notice", label: "Internal signup notice" },
  { key: "delivery_test", label: "Delivery check" },
];

function templateLabel(key: string): string {
  return PURCHASE_EMAILS.find(t => t.key === key)?.label ?? TEMPLATE_CATALOG.find((t) => t.key === (key as TemplateKey))?.label ?? key;
}

function statusBadge(status: string) {
  const s = status.toLowerCase();
  if (s === "sent" || s === "delivered")
    return <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200">{s === "delivered" ? "Delivered" : "Accepted"}</Badge>;
  if (s === "failed" || s === "bounced" || s === "complained")
    return <Badge className="bg-red-50 text-red-800 border-red-200">{s === "bounced" ? "Bounced" : s === "complained" ? "Complaint" : "Failed"}</Badge>;
  return <Badge variant="outline" className="text-slate-600">{status}</Badge>;
}

export default function EmailHistory() {
  const [rows, setRows] = useState<EmailSendRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [templateFilter, setTemplateFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [checkingDelivery, setCheckingDelivery] = useState(false);
  const [selected, setSelected] = useState<EmailSendRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setTableMissing(false);
    try {
      let q = supabase
        .from("email_sends")
        .select("id, to_email, template_key, subject, status, resend_id, error, sent_at, opened_at, delivery_status")
        .order("sent_at", { ascending: false })
        .limit(PAGE_SIZE);
      if (templateFilter !== "all") q = q.eq("template_key", templateFilter);
      if (statusFilter === "sent") q = q.eq("status", "sent").or("delivery_status.is.null,delivery_status.eq.sent");
      else if (["failed", "bounced"].includes(statusFilter)) q = q.or(`status.eq.${statusFilter},delivery_status.eq.${statusFilter}`);
      else if (statusFilter !== "all") q = q.eq("delivery_status", statusFilter);
      const term = search.trim();
      if (term) q = q.ilike("to_email", `%${term}%`);

      const { data, error: qErr } = await q;
      if (qErr) {
        // PGRST205 = relation doesn't exist → backend hasn't shipped the table yet.
        if (qErr.code === "PGRST205" || qErr.code === "42P01") {
          setTableMissing(true);
        } else {
          setError(qErr.message);
        }
        setRows([]);
      } else {
        setRows((data ?? []) as EmailSendRow[]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load send history.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [search, templateFilter, statusFilter]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const checkDelivery = async () => {
    setCheckingDelivery(true);
    try {
      const { data, error } = await supabase.functions.invoke("email-delivery-check", { body: {} });
      if (error || !data?.success) throw new Error(data?.error || "Delivery check could not be sent. Please try later.");
      toast.success("Test accepted. Refresh in a moment to see its delivery status.");
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Delivery check failed."); }
    finally { setCheckingDelivery(false); }
  };

  const body = useMemo(() => {
    if (loading)
      return (
        <div className="flex items-center justify-center py-16 text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading send history…
        </div>
      );
    if (tableMissing)
      return (
        <div className="text-center py-16 px-6">
          <Inbox className="h-10 w-10 mx-auto text-slate-400 mb-3" />
          <p className="text-sm font-medium text-slate-800">Send history isn't wired up yet</p>
          <p className="text-xs text-slate-600 mt-1 max-w-xs mx-auto">
            The email send log table is still being built on the backend. Once it
            lands, every email this system sends will show up here.
          </p>
        </div>
      );
    if (error)
      return (
        <div className="text-center py-16 px-6">
          <p className="text-sm font-medium text-red-700">Couldn't load send history</p>
          <p className="text-xs text-slate-600 mt-1">{error}</p>
        </div>
      );
    if (rows.length === 0)
      return (
        <div className="text-center py-16 px-6">
          <Inbox className="h-10 w-10 mx-auto text-slate-400 mb-3" />
          <p className="text-sm font-medium text-slate-800">No emails sent yet</p>
          <p className="text-xs text-slate-600 mt-1">
            {search || templateFilter !== "all" || statusFilter !== "all"
              ? "Nothing matches these filters."
              : "Once the system starts sending, every email will be listed here."}
          </p>
        </div>
      );
    return (
      <div className="divide-y divide-slate-100">
        {rows.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setSelected(r)}
            className="w-full text-left px-4 py-3.5 hover:bg-slate-50 transition-colors"
          >
            <div className="flex flex-wrap items-center gap-2 mb-1">
              {statusBadge(r.delivery_status || r.status)}
              <span className="text-[11px] text-slate-600">
                {templateLabel(r.template_key)}
              </span>
              <span className="text-[11px] text-slate-500 ml-auto shrink-0">
                {r.sent_at
                  ? new Date(r.sent_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : "Not available"}
              </span>
            </div>
            <p className="text-sm text-slate-900 truncate">{r.to_email}</p>
            {r.subject && (
              <p className="text-xs text-slate-600 truncate mt-0.5">{r.subject}</p>
            )}
            {r.opened_at && (
              <p className="text-[11px] text-emerald-700 mt-1 inline-flex items-center gap-1">
                <MailOpen className="h-3 w-3" /> Opened
              </p>
            )}
          </button>
        ))}
      </div>
    );
  }, [loading, tableMissing, error, rows, search, templateFilter, statusFilter]);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 rounded-xl bg-emerald-50 border border-emerald-100 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="font-medium text-slate-900">Check your email delivery</p>
          <p className="text-xs text-slate-600 mt-1">Sends only to the email provider’s test address. No customer receives it.</p></div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="min-h-11 flex-1 sm:flex-none" onClick={() => load()} disabled={loading}>Refresh</Button>
          <Button className="min-h-11 flex-1 sm:flex-none" onClick={checkDelivery} disabled={checkingDelivery}>
            {checkingDelivery && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Send delivery check
          </Button>
        </div>
      </div>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by recipient email…"
            className="pl-9 min-h-[44px]"
          />
        </div>
        <div className="flex gap-2">
          <Select value={templateFilter} onValueChange={setTemplateFilter}>
            <SelectTrigger className="min-h-[44px] flex-1 sm:w-40">
              <SelectValue placeholder="Template" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All templates</SelectItem>
              {[...PURCHASE_EMAILS, ...TEMPLATE_CATALOG].map((t) => (
                <SelectItem key={t.key} value={t.key}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="min-h-[44px] flex-1 sm:w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="sent">Accepted by email provider</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="bounced">Bounced</SelectItem>
              <SelectItem value="complained">Complaint</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-xs text-slate-600 mb-3">Latest 50 matching emails. Accepted means sent to the email provider; delivered confirms the recipient’s mail server accepted it.</p>
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {body}
      </div>

      {/* Row detail */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Send details</DialogTitle>
          </DialogHeader>
          {selected && (
            <dl className="text-sm space-y-2.5">
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-slate-600">To</dt>
                <dd className="text-slate-900 break-all">{selected.to_email}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-slate-600">Template</dt>
                <dd className="text-slate-900">
                  {templateLabel(selected.template_key)}{" "}
                  <span className="text-slate-600">({selected.template_key})</span>
                </dd>
              </div>
              {selected.subject && (
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-slate-600">Subject</dt>
                  <dd className="text-slate-900">{selected.subject}</dd>
                </div>
              )}
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-slate-600">Status</dt>
                <dd>{statusBadge(selected.delivery_status || selected.status)}</dd>
              </div>
              {selected.resend_id && (
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-slate-600">Resend ID</dt>
                  <dd className="text-slate-900 font-mono text-xs break-all">{selected.resend_id}</dd>
                </div>
              )}
              {selected.error && (
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-slate-600">Error</dt>
                  <dd className="text-red-700 text-xs break-words">{selected.error}</dd>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-slate-600">Sent</dt>
                  <dd className="text-slate-900 text-xs">
                    {selected.sent_at ? new Date(selected.sent_at).toLocaleString() : "Not available"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-slate-600">Opened</dt>
                  <dd className="text-slate-900 text-xs">
                    {selected.opened_at ? new Date(selected.opened_at).toLocaleString() : "Not tracked"}
                  </dd>
                </div>
              </div>
            </dl>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
