import { useState } from "react";
import { Download, ExternalLink, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Props = {
  path: string | null | undefined;
  hubName: string;
  filename: string;
};

/** Original rep artwork, read through the signed-in admin's Storage permissions. */
export function CardPrintFile({ path, hubName, filename }: Props) {
  return (
    <section aria-label={`${hubName} card print file`} className="mt-4 min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <FileText className="h-4 w-4" /> Card print PDF
      </h3>
      {path ? (
        <AttachedPrintFile key={path} path={path} hubName={hubName} filename={filename} />
      ) : (
        <p className="mt-2 text-sm text-amber-800">No print PDF attached to this hub.</p>
      )}
    </section>
  );
}

function AttachedPrintFile({ path, hubName, filename }: Props & { path: string }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState<"view" | "download" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const viewPdf = async () => {
    setError(null);
    if (previewUrl) {
      setPreviewUrl(null);
      return;
    }
    setBusy("view");
    try {
      const { data, error: storageError } = await supabase.storage
        .from("card-print-files")
        .createSignedUrl(path, 900);
      if (storageError || !data?.signedUrl) throw storageError ?? new Error("No preview URL");
      setPreviewUrl(data.signedUrl);
    } catch {
      setError("Couldn't open the print PDF. Try again or download the file.");
    } finally {
      setBusy(null);
    }
  };

  const downloadPdf = async () => {
    setBusy("download");
    setError(null);
    try {
      const { data, error: storageError } = await supabase.storage
        .from("card-print-files")
        .download(path);
      if (storageError || !data) throw storageError ?? new Error("Empty download");
      // Keep the uploaded bytes and page dimensions intact for card printing.
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${filename.replace(/[^\w.-]+/g, "_") || "card"}-print.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      setError("Couldn't download the print PDF. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <p className="mt-1 break-all text-xs text-slate-600">{path.split("/").pop()}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" variant="outline" className="min-h-11" disabled={!!busy} onClick={() => void viewPdf()}>
          {busy === "view" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
          {busy === "view" ? "Opening PDF…" : previewUrl ? "Hide PDF" : "View PDF"}
        </Button>
        <Button type="button" variant="outline" className="min-h-11" disabled={!!busy} onClick={() => void downloadPdf()}>
          {busy === "download" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          {busy === "download" ? "Downloading…" : "Download PDF"}
        </Button>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
      {previewUrl && (
        <div className="mt-3 space-y-2">
          <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-emerald-800 underline">
            Open PDF in new tab <ExternalLink className="h-4 w-4" />
          </a>
          <p className="text-xs text-slate-600">If the preview doesn't display on your device, open it in a new tab or download the original PDF.</p>
          <iframe src={previewUrl} title={`${hubName} print PDF preview`} className="h-96 w-full rounded-md border border-slate-200 bg-white" />
        </div>
      )}
    </>
  );
}
