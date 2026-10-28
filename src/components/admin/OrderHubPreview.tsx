import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProfilePreviewPanel } from '@/components/personal/ProfilePreviewPanel';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

/** Uses the signed-in admin's existing RLS access, never a public draft URL. */
export function OrderHubPreview({ id, onClose, onReviewed }: { id: string; onClose: () => void; onReviewed: () => void }) {
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
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}><DialogContent className="max-w-lg max-h-[92dvh] overflow-y-auto bg-white text-slate-900">
    <DialogHeader><DialogTitle>Review hub before approval</DialogTitle><DialogDescription>Check the logo, name and links. This private preview does not publish or approve anything.</DialogDescription></DialogHeader>
    {result.isPending ? <p role="status">Loading hub preview…</p> : result.isError ? <div role="alert"><p>We couldn't load this hub. Approval stays locked until a preview loads.</p><Button onClick={() => result.refetch()}>Try again</Button></div> : result.data && <>
      <ProfilePreviewPanel profile={result.data.profile} links={result.data.links} blocks={result.data.blocks as any} />
      <a className="text-emerald-800 underline py-3" href={`/dashboard?admin_view_personal=${encodeURIComponent(id)}`}>Edit this hub</a>
      <Button onClick={() => { onReviewed(); onClose(); }}>I've reviewed this hub</Button>
    </>}
  </DialogContent></Dialog>;
}
