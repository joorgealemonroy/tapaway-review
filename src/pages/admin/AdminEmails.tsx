// AdminEmails — Jorge's EMAIL COMMAND CENTER (/admin/emails).
//
// Three tabs, one phone screen:
//   Templates — every email template the system sends, rendered as actual
//               HTML previews (what the client gets, not a description),
//               with subject line, preheader, and the event that triggers it.
//   Sent      — send history from the email_sends log (searchable, filterable,
//               honest empty state).
//   Compose   — feature-update broadcast composer: headline + body + optional
//               CTA → live preview → confirm with recipient count → send.
//
// Admin-only (useAdminGuard). "Back to Admin" per admin convention.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import EmailTemplateCard from "@/components/admin/EmailTemplateCard";
import EmailHistory from "@/components/admin/EmailHistory";
import FeatureUpdateComposer from "@/components/admin/FeatureUpdateComposer";
import { TEMPLATE_CATALOG } from "@/lib/admin/templateCatalog";
import { cn } from "@/lib/utils";

type Tab = "templates" | "sent" | "compose";

const TABS: { id: Tab; label: string }[] = [
  { id: "templates", label: "Templates" },
  { id: "sent", label: "Sent" },
  { id: "compose", label: "Compose" },
];

export default function AdminEmails() {
  const { loading: guardLoading } = useAdminGuard();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("templates");

  if (guardLoading) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-white/50" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      <div className="max-w-3xl mx-auto px-4 py-6 pb-16">
        <Button
          variant="ghost"
          onClick={() => navigate("/admin")}
          className="mb-4 -ml-2 text-white/60 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Admin
        </Button>

        <h1 className="text-xl font-bold">Emails</h1>
        <p className="text-sm text-white/50 mt-1 mb-5">
          Every email the system sends — what they look like, who got them,
          and a way to send an update.
        </p>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Email sections"
          className="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/10 mb-5"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex-1 min-h-[44px] rounded-lg text-sm font-medium transition-colors",
                tab === t.id
                  ? "bg-white/10 text-white"
                  : "text-white/50 hover:text-white/80"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "templates" && (
          <div>
            <p className="text-xs text-white/40 mb-3">
              Rendered from the canonical email templates — the exact HTML,
              subject, and preheader clients receive. Tap any card for the
              full-size version.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {TEMPLATE_CATALOG.map((t) => (
                <EmailTemplateCard key={t.key} template={t} />
              ))}
            </div>
          </div>
        )}

        {tab === "sent" && <EmailHistory />}

        {tab === "compose" && <FeatureUpdateComposer />}
      </div>
    </div>
  );
}
