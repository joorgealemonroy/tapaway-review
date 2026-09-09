// EmailHistory — the /admin/emails send-history tab.
//
// Reads public.email_sends (built by the backend sibling):
//   email_sends(id, to_email, template_key, subject, status, resend_id,
//               error, sent_at, opened_at)
// Searchable by recipient, filterable by template + status, newest first.
// Row tap → detail dialog (resend_id, error, timestamps). Email BODIES are
// never shown here (PII rule) — only metadata.
// Honest empty state: "No emails sent yet." If the table isn't there yet
// (backend sibling still building), says so plainly instead of crashing.
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  subject: string | null;
  status: string;
  resend_id: string | null;
  error: string | null;
  sent_at: string | null;
  opened_at: string | null;
}

const PAGE_SIZE = 50;

function templateLabel(key: string): string {
  return TEMPLATE_CATALOG.find((t) => t.key === (key as TemplateKey))?.label ?? key;
}

function statusBadge(status: string) {
  const s = status.toLowerCase();
  if (s === "sent" || s === "delivered")
    return <Badge className="bg-emerald-600/20 text-emerald-300 border-emerald-500/30">Sent</Badge>;
  if (s === "failed" || s === "bounced" || s === "complained")
    return <Badge className="bg-red-600/20 text-red-300 border-red-500/30">Failed</Badge>;
  return <Badge variant="outline" className="text-white/60">{status}</Badge>;
}

export default function EmailHistory() {
  const [rows, setRows] = useState<EmailSendRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [templateFilter, setTemplateFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<EmailSendRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setTableMissing(false);
    try {
      let q = supabase
        .from("email_sends")
        .select("id, to_email, template_key, subject, status, resend_id, error, sent_at, opened_at")
        .order("sent_at", { ascending: false })
        .limit(PAGE_SIZE);
      if (templateFilter !== "all") q = q.eq("template_key", templateFilter);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const term = search.trim();
      if (term) q = q.ilike("to_email", `%${term}%`);

      const { data, error: qErr } = await q;
      if (qErr) {
        // PGRST205 = relation doesn't exist → backend hasn't shipped the table yet.
        if (qErr.code === "PGRST205" || /email_sends/i.test(qErr.message ?? "")) {
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

  const body = useMemo(() => {
    if (loading)
      return (
        <div className="flex items-center justify-center py-16 text-white/50">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading send history…
        </div>
      );
    if (tableMissing)
      return (
        <div className="text-center py-16 px-6">
          <Inbox className="h-10 w-10 mx-auto text-white/20 mb-3" />
          <p className="text-sm font-medium text-white/80">Send history isn't wired up yet</p>
          <p className="text-xs text-white/50 mt-1 max-w-xs mx-auto">
            The email send log table is still being built on the backend. Once it
            lands, every email this system sends will show up here.
          </p>
        </div>
      );
    if (error)
      return (
        <div className="text-center py-16 px-6">
          <p className="text-sm font-medium text-red-300">Couldn't load send history</p>
          <p className="text-xs text-white/50 mt-1">{error}</p>
        </div>
      );
    if (rows.length === 0)
      return (
        <div className="text-center py-16 px-6">
          <Inbox className="h-10 w-10 mx-auto text-white/20 mb-3" />
          <p className="text-sm font-medium text-white/80">No emails sent yet</p>
          <p className="text-xs text-white/50 mt-1">
            {search || templateFilter !== "all" || statusFilter !== "all"
              ? "Nothing matches these filters."
              : "Once the system starts sending, every email will be listed here."}
          </p>
        </div>
      );
    return (
      <div className="divide-y divide-white/5">
        {rows.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setSelected(r)}
            className="w-full text-left px-4 py-3.5 hover:bg-white/[0.03] transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              {statusBadge(r.status)}
              <span className="text-[11px] text-white/40">
                {templateLabel(r.template_key)}
              </span>
              <span className="text-[11px] text-white/30 ml-auto shrink-0">
                {r.sent_at
                  ? new Date(r.sent_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : "—"}
              </span>
            </div>
            <p className="text-sm text-white/90 truncate">{r.to_email}</p>
            {r.subject && (
              <p className="text-xs text-white/50 truncate mt-0.5">{r.subject}</p>
            )}
            {r.opened_at && (
              <p className="text-[11px] text-emerald-400/80 mt-1 inline-flex items-center gap-1">
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
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
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
              {TEMPLATE_CATALOG.map((t) => (
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
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
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
                <dt className="text-[11px] uppercase tracking-wide text-white/40">To</dt>
                <dd className="text-white/90 break-all">{selected.to_email}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-white/40">Template</dt>
                <dd className="text-white/90">
                  {templateLabel(selected.template_key)}{" "}
                  <span className="text-white/40">({selected.template_key})</span>
                </dd>
              </div>
              {selected.subject && (
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-white/40">Subject</dt>
                  <dd className="text-white/90">{selected.subject}</dd>
                </div>
              )}
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-white/40">Status</dt>
                <dd>{statusBadge(selected.status)}</dd>
              </div>
              {selected.resend_id && (
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-white/40">Resend ID</dt>
                  <dd className="text-white/90 font-mono text-xs break-all">{selected.resend_id}</dd>
                </div>
              )}
              {selected.error && (
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-white/40">Error</dt>
                  <dd className="text-red-300 text-xs break-words">{selected.error}</dd>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-white/40">Sent</dt>
                  <dd className="text-white/90 text-xs">
                    {selected.sent_at ? new Date(selected.sent_at).toLocaleString() : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-white/40">Opened</dt>
                  <dd className="text-white/90 text-xs">
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
