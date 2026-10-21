import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Bell, Send, Save, ArrowUpRight, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { workspaceRpc } from "@/lib/admin/workspace";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
type Draft = {
  id: string;
  title: string;
  body: string;
  kind: string;
  audience: string;
  cta_path: string | null;
  cta_label: string | null;
  updated_at: string;
  status: string;
  recipient_count?: number;
  sent_at?: string;
};
const blank = {
  title: "",
  body: "",
  kind: "update",
  audience: "all",
  cta_path: "",
  cta_label: "",
};
export default function AdminMessages() {
  const [form, setForm] = useState(blank),
    [id, setId] = useState<string | null>(null),
    [saved, setSaved] = useState<Draft | null>(null),
    [review, setReview] = useState(false),
    [busy, setBusy] = useState(false);
  const history = useQuery({
    queryKey: ["admin-announcements"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("admin_announcements")
        .select(
          "id,title,body,kind,audience,cta_path,cta_label,updated_at,status,sent_at",
        )
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data as Draft[];
    },
  });
  const change = (key: keyof typeof blank, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(null);
  };
  const valid =
    !!form.title.trim() &&
    !!form.body.trim() &&
    ((!form.cta_path && !form.cta_label) ||
      (!!form.cta_label &&
        /^\/[a-zA-Z0-9/?=&_#.%~-]*$/.test(form.cta_path) &&
        !form.cta_path.startsWith("//")));
  const save = async (preview: boolean) => {
    if (!valid || busy) return;
    setBusy(true);
    try {
      const draft = await workspaceRpc<Draft>("admin_save_announcement", {
        _id: id,
        _title: form.title,
        _body: form.body,
        _kind: form.kind,
        _audience: form.audience,
        _cta_path: form.cta_path || null,
        _cta_label: form.cta_label || null,
      });
      setId(draft.id);
      setSaved(draft);
      void history.refetch();
      if (preview) setReview(true);
      else toast.success("Draft saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save draft");
    } finally {
      setBusy(false);
    }
  };
  const send = async () => {
    if (!saved || busy) return;
    setBusy(true);
    try {
      const count = await workspaceRpc<number>("admin_send_announcement", {
        _id: saved.id,
        _updated_at: saved.updated_at,
      });
      toast.success(`Delivered to ${count} customer inboxes`);
      setReview(false);
      setSaved(null);
      setId(null);
      setForm(blank);
      void history.refetch();
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : "Could not send. Your saved draft is still here.",
      );
    } finally {
      setBusy(false);
    }
  };
  const preview = (
    <article className="aw-message-preview">
      <span className="aw-badge aw-badge-green">
        <Bell size={13} /> TapAway {form.kind === "offer" ? "offer" : "update"}
      </span>
      <h2>{form.title || "Your headline goes here"}</h2>
      <p>
        {form.body ||
          "A little news, a helpful update, or something worth sharing."}
      </p>
      {form.cta_label && (
        <span className="aw-small-button">
          {form.cta_label}
          <ArrowUpRight size={15} />
        </span>
      )}
    </article>
  );
  return (
    <>
      <div className="aw-page-heading aw-heading-row">
        <div>
          <p className="aw-eyebrow">KEEP THE CONNECTION GOING</p>
          <h1>Messages that feel personal.</h1>
          <p>
            Send an update or offer to customer dashboards. Preview it first.
          </p>
        </div>
        <Link className="aw-small-button" to="/admin/emails">
          Email tools <ArrowUpRight size={16} />
        </Link>
      </div>
      <div className="aw-compose-grid">
        <section className="aw-panel">
          <div className="aw-section-heading">
            <h2>{id ? "Your draft" : "Write a message"}</h2>
            <button
              className="aw-icon-button"
              aria-label="New message"
              onClick={() => {
                if (
                  (form.title || form.body) &&
                  !window.confirm(
                    "Start a new message? Save this draft first if you want to keep your edits.",
                  )
                )
                  return;
                setForm(blank);
                setId(null);
                setSaved(null);
              }}
            >
              <Plus size={18} />
            </button>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void save(true);
            }}
            className="aw-form"
          >
            <div className="aw-form-row">
              <label>
                Message type
                <select
                  value={form.kind}
                  onChange={(e) => change("kind", e.target.value)}
                >
                  <option value="update">Product update</option>
                  <option value="offer">Customer offer</option>
                </select>
              </label>
              <label>
                Who should see it?
                <select
                  value={form.audience}
                  onChange={(e) => change("audience", e.target.value)}
                >
                  <option value="all">All customer accounts</option>
                  <option value="business">Business hub owners</option>
                  <option value="personal">Personal / Solo hub owners</option>
                  <option value="subscribers">Linked active subscribers</option>
                </select>
              </label>
            </div>
            <label>
              Headline
              <input
                maxLength={120}
                required
                value={form.title}
                onChange={(e) => change("title", e.target.value)}
                placeholder="Something new for your TapAway hub"
              />
            </label>
            <label>
              Your message
              <textarea
                rows={6}
                maxLength={2000}
                required
                value={form.body}
                onChange={(e) => change("body", e.target.value)}
                placeholder="What’s new, why it matters, and what they can do next."
              />
            </label>
            <details>
              <summary>Add a button (optional)</summary>
              <label>
                Button text
                <input
                  maxLength={60}
                  value={form.cta_label}
                  onChange={(e) => change("cta_label", e.target.value)}
                  placeholder="Open my dashboard"
                />
              </label>
              <label>
                TapAway page
                <input
                  value={form.cta_path}
                  onChange={(e) => change("cta_path", e.target.value)}
                  placeholder="/dashboard"
                />
              </label>
              <small>
                Use a page on TapAway, such as /dashboard or /support.
              </small>
            </details>
            {form.kind === "offer" && (
              <p className="aw-caption">
                For referral offers, include who qualifies, the deadline, and
                how to claim. Sending an offer does not apply billing credits.
              </p>
            )}
            <div className="aw-form-actions">
              <button
                type="button"
                className="aw-small-button"
                disabled={!valid || busy}
                onClick={() => save(false)}
              >
                <Save size={16} /> Save draft
              </button>
              <button
                type="submit"
                className="aw-primary"
                disabled={!valid || busy}
              >
                {busy ? "Saving…" : "Preview & review"}
                <ArrowUpRight size={16} />
              </button>
            </div>
          </form>
        </section>
        <section>
          <p className="aw-eyebrow aw-preview-label">CUSTOMER PREVIEW</p>
          {preview}
          <p className="aw-caption">
            Appears in their dashboard inbox. No email or text is sent from this
            composer.
          </p>
          <div className="aw-panel aw-inspiration">
            <h3>Need a starting point?</h3>
            <button
              onClick={() => {
                setForm({
                  ...blank,
                  title: "A fresh look for your hub",
                  body: "Your TapAway hub can grow with you. Open your dashboard to update your links, photos and details whenever you like.",
                  cta_label: "Open my dashboard",
                  cta_path: "/dashboard",
                });
                setId(null);
                setSaved(null);
              }}
            >
              A helpful product update <ArrowUpRight size={16} />
            </button>
            <button
              onClick={() => {
                setForm({
                  ...blank,
                  kind: "offer",
                  title: "Share TapAway with a friend",
                  body: "We’re putting together something special for customers who refer friends. We’ll share the details here when it’s ready.",
                });
                setId(null);
                setSaved(null);
              }}
            >
              Start a referral offer draft <ArrowUpRight size={16} />
            </button>
          </div>
        </section>
      </div>
      <section className="aw-panel aw-history">
        <h2>Drafts & sent messages</h2>
        {history.isError ? (
          <p>
            History couldn’t refresh.{" "}
            <button onClick={() => history.refetch()}>Retry</button>
          </p>
        ) : history.isPending ? (
          <p>Loading messages…</p>
        ) : !history.data?.length ? (
          <p className="aw-muted">Your saved messages will appear here.</p>
        ) : (
          history.data?.map((d) => (
            <div key={d.id} className="aw-history-row">
              <div>
                <strong>{d.title}</strong>
                <small>
                  {d.status === "sent" ? "Sent" : "Draft"} · {d.audience}
                </small>
              </div>
              {d.status === "draft" ? (
                <button
                  className="aw-small-button"
                  onClick={() => {
                    setId(d.id);
                    setForm({
                      title: d.title,
                      body: d.body,
                      kind: d.kind,
                      audience: d.audience,
                      cta_path: d.cta_path || "",
                      cta_label: d.cta_label || "",
                    });
                    setSaved(null);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  Edit draft
                </button>
              ) : (
                <span className="aw-badge">Delivered</span>
              )}
            </div>
          ))
        )}
      </section>
      <Dialog open={review} onOpenChange={(v) => !busy && setReview(v)}>
        <DialogContent className="aw-send-dialog">
          <DialogHeader>
            <DialogTitle>Ready to share?</DialogTitle>
            <DialogDescription>
              This message will appear in {saved?.recipient_count ?? 0} customer
              inboxes. Each account gets one copy.
            </DialogDescription>
          </DialogHeader>
          {preview}
          <div className="aw-form-actions">
            <button
              className="aw-small-button"
              disabled={busy}
              onClick={() => setReview(false)}
            >
              Keep editing
            </button>
            <button
              className="aw-primary"
              disabled={busy || !saved?.recipient_count}
              onClick={send}
            >
              <Send size={16} />
              {busy
                ? "Sending…"
                : `Send to ${saved?.recipient_count ?? 0} accounts`}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
