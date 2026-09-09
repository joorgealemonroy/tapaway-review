// EmailTemplateCard — one card in the /admin/emails template gallery.
//
// Previews are fetched from the canonical email-template-preview edge
// function (renders supabase/functions/_shared/email.ts with sample data),
// so the subject, preheader, and HTML Jorge sees are EXACTLY what clients
// receive. No local markup mirror — there is nothing to drift.
//
// The iframe is measured at its native 600px width so the scaled card
// preview is sized to the real content, whatever the template looks like.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Expand, Loader2, AlertTriangle } from "lucide-react";
import EmailPreviewFrame from "./EmailPreviewFrame";
import type { TemplateCatalogEntry } from "@/lib/admin/templateCatalog";

interface CanonicalPreview {
  key: string;
  subject: string;
  preheader: string;
  html: string;
  text: string;
}

/** Fallback frame height while the real content is still measuring. */
const FALLBACK_HEIGHT = 880;
/** Upper bound so a runaway template can't stretch the card forever. */
const MAX_MEASURED_HEIGHT = 2400;

export default function EmailTemplateCard({
  template,
}: {
  template: TemplateCatalogEntry;
}) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<CanonicalPreview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [contentHeight, setContentHeight] = useState(FALLBACK_HEIGHT);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke(
          "email-template-preview",
          { body: { template_key: template.key } }
        );
        if (cancelled) return;
        if (error) throw new Error(error.message || "Preview backend error.");
        const p = data as CanonicalPreview | null;
        if (!p?.html) throw new Error("Preview backend returned no HTML.");
        setPreview(p);
      } catch (e) {
        if (!cancelled)
          setLoadError(
            e instanceof Error ? e.message : "Couldn't load the preview."
          );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [template.key]);

  const subject = preview?.subject ?? "Loading…";
  const preheader = preview?.preheader ?? "";

  return (
    <>
      {/* `relative` keeps the hidden 600px measuring iframe inside the card's
          clipping box — without it, it escapes to the page and forces a
          horizontal scrollbar on mobile. */}
      <Card className="relative overflow-hidden">
        <CardContent className="p-0">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="block w-full text-left"
            aria-label={`Preview ${template.label} email`}
          >
            {preview ? (
              <EmailPreviewFrame
                html={preview.html}
                title={`${template.label} email preview`}
                contentHeight={contentHeight}
              />
            ) : loadError ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 px-6 text-center">
                <AlertTriangle className="h-6 w-6 text-amber-400" />
                <p className="text-xs text-white/60">
                  Preview backend isn't live yet — deploy the
                  email-template-preview edge function to see the real email.
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-white/40" />
              </div>
            )}
          </button>

          {/* Hidden measuring render: same 600px HTML, real height — never visible. */}
          {preview && (
            <iframe
              title=""
              aria-hidden="true"
              tabIndex={-1}
              srcDoc={preview.html}
              sandbox="allow-same-origin"
              onLoad={(e) => {
                const doc = (e.target as HTMLIFrameElement).contentDocument;
                const h =
                  doc?.documentElement?.scrollHeight ||
                  doc?.body?.scrollHeight ||
                  0;
                if (h > 0)
                  setContentHeight(Math.min(h + 40, MAX_MEASURED_HEIGHT));
              }}
              style={{
                position: "absolute",
                visibility: "hidden",
                width: 600,
                height: 1200,
                border: 0,
                pointerEvents: "none",
              }}
            />
          )}

          <div className="p-4 border-t border-white/10">
            <div className="flex items-center gap-2 mb-1.5">
              <h3 className="text-sm font-semibold text-white">
                {template.label}
              </h3>
              <Badge variant="outline" className="text-[10px] text-white/50">
                {template.key}
              </Badge>
            </div>
            <p className="text-xs text-white/80 font-medium mb-1">
              Subject: {subject}
            </p>
            {preheader && (
              <p className="text-xs text-white/50 mb-2 line-clamp-2">
                {preheader}
              </p>
            )}
            <p className="text-[11px] text-white/40">
              <span className="text-white/60 font-medium">Triggers:</span>{" "}
              {template.trigger}
            </p>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              <Expand className="h-3.5 w-3.5" /> Full preview
            </button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[680px] w-[95vw] max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="text-sm">
              {template.label} — what the client gets
            </DialogTitle>
            <p className="text-xs text-muted-foreground pt-1">
              Subject: {subject}
            </p>
          </DialogHeader>
          {preview ? (
            <iframe
              title={`${template.label} email full preview`}
              srcDoc={preview.html}
              sandbox="allow-same-origin"
              className="w-full border-0 bg-[#f4f4f5]"
              style={{ height: contentHeight + 60 }}
            />
          ) : (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
