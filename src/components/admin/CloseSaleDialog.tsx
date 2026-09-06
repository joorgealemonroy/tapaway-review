import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Copy, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";

export type CloseSaleTarget = { id: string; name: string } | null;

/**
 * In-person close: mints a 24h signed presentation link for one solo hub.
 * The customer opens it (or scans the QR) and pays — no account, no password.
 */
export default function CloseSaleDialog({
  target,
  onClose,
}: {
  target: CloseSaleTarget;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!target) {
      setUrl(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("create-claim-checkout", {
          body: { action: "mint", profileId: target.id },
        });
        if (error) throw error;
        const token = (data as { token?: string })?.token;
        if (!token) throw new Error("Could not create the sales link");
        if (!cancelled) setUrl(`${window.location.origin}/claim?t=${encodeURIComponent(token)}`);
      } catch (err) {
        console.error("[close-sale] mint error", err);
        if (!cancelled) toast.error("Could not create the sales link");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [target]);

  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Close sale — {target?.name}</DialogTitle>
        </DialogHeader>

        {loading || !url ? (
          <div className="py-10 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-center p-4 bg-white rounded-lg">
              <QRCode value={url} size={180} />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              This link works for 24 hours. The customer can scan it and pay on their own phone.
            </p>
            <div className="grid gap-2">
              <Button asChild className="w-full">
                <a href={url} target="_blank" rel="noopener noreferrer">
                  Open presentation <ExternalLink className="h-4 w-4 ml-2" />
                </a>
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(url);
                    toast.success("Sales link copied");
                  } catch {
                    toast.error("Could not copy the link");
                  }
                }}
              >
                <Copy className="h-4 w-4 mr-2" /> Copy link
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
