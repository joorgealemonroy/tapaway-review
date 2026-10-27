import { admin } from './paymentFirst.ts';
import { takeQuota } from './storefrontRateLimit.ts';

/** Cross-instance quotas, tied to verified account IDs, shared across paid AI tools. */
export async function customerAiAllowed(req: Request, userId: string, restaurantId?: string): Promise<boolean> {
  const db = admin();
  const { data: role, error: roleError } = await db.from('user_roles').select('role').eq('user_id', userId).eq('role', 'admin').maybeSingle();
  if (roleError) throw roleError;
  if (!role) {
    let query = db.from('restaurants').select('id').eq('owner_id', userId);
    if (restaurantId) query = query.eq('id', restaurantId);
    const { data: accounts, error } = await query.limit(20);
    if (error) throw error;
    let entitled = false;
    for (const account of accounts || []) {
      const { data: active, error: accessError } = await db.rpc('restaurant_is_active', { _restaurant_id: account.id });
      if (accessError) throw accessError;
      if (active === true) { entitled = true; break; }
    }
    if (!entitled) return false;
  }
  if (await takeQuota(req, 'customer-ai-account', 30, userId) < 0) return false;
  if (await takeQuota(req, 'customer-ai-budget', 2000, 'all-accounts') < 0) return false;
  return true;
}
export async function readAiBody(req: Request, max = 32000): Promise<any> {
  const reader = req.body?.getReader();
  if (!reader) return {};
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength;
    if (size > max) { await reader.cancel(); throw new Error('Request too large'); } chunks.push(value); }
  const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(bytes));
}
