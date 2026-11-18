import { CardPrintFile } from "./CardPrintFile";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from '@/integrations/supabase/client';
import { ProfilePreviewPanel } from '@/components/personal/ProfilePreviewPanel';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

/** Uses the signed-in admin's existing RLS access, never a public draft URL. */
export function OrderHubPreview({ id, busy, canGift, onClose, onApprove }: {
  id: string;
  busy: boolean;
  canGift: boolean;
  onClose: () => void;
  onApprove?: (forContent: boolean) => void;
}) {
  const [forContent, setForContent] = useState(false);
  const result = useQuery({
    queryKey: ['admin-order-preview', id],
    queryFn: async () => {
      const [profile, links, blocks] = await Promise.all([
        supabase.from('personal_profiles').select('*').eq('id', id).single(),
        supabase.from('personal_links').select('*').eq('profile_id', id).eq('is_active', true).order('sort_order'),
        supabase.from('personal_blocks').select('*').eq('profile_id', id).eq('is_active', true).order('sort_order'),
      ]);
      for (const response of [profile, links, blocks]) if (response.error) throw response.error;
      return { profile: profile.data, links: (links.data || []).filter(l => !l.is_archived), blocks: (blocks.data || []).filter(b => !b.is_archived) };
    }, retry: 1,
  });
  return (
    <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}>
      <DialogContent className="max-h-[92dvh] max-w-lg grid-rows-[auto_minmax(0,1fr)_auto] bg-background text-foreground">
        <DialogHeader>
          <DialogTitle>Hub preview</DialogTitle>
          <DialogDescription>Review the logo, name and links.</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 space-y-3 overflow-y-auto">
          {result.isPending && <p role="status">Loading hub preview…</p>}
          {result.isError && (
            <div className="space-y-2" role="alert">
              <p>We couldn't load this hub. Try again to review it before approving.</p>
              <Button onClick={() => result.refetch()}>Try again</Button>
            </div>
          )}
          {result.data && !result.isError && (
            <>
              <div data-hub-preview>
                <ProfilePreviewPanel profile={result.data.profile} links={result.data.links} blocks={result.data.blocks as any} />
              </div>
              <CardPrintFile path={result.data.profile.card_print_pdf_path} hubName={result.data.profile.full_name || result.data.profile.username || "Hub"} filename={result.data.profile.username || id} />
              <a className="inline-block py-2 text-primary underline" href={`/dashboard?admin_view_personal=${encodeURIComponent(id)}`}>Edit this hub</a>
            </>
          )}
        </div>
        {result.isSuccess && onApprove && (
          <div className="space-y-3 border-t pt-3">
            {canGift && (
              <label className="flex items-start gap-3 text-sm">
                <input type="checkbox" className="mt-1 size-4" checked={forContent} disabled={busy} onChange={event => setForContent(event.target.checked)} />
                <span>
                  <strong>For content (gift)</strong>
                  <span className="block text-muted-foreground">Make the hub live without payment on approval.</span>
                </span>
              </label>
            )}
            <Button className="w-full" disabled={busy} onClick={() => onApprove(canGift && forContent)}>
              {busy ? "Approving…" : canGift && forContent ? "Approve as gift" : "Approve demo"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
