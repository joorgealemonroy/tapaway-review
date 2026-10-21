import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { admin } from '../_shared/paymentFirst.ts';
import { hashValue } from '../_shared/storefrontRateLimit.ts';
import { accessCors, accessJson, allowAccessVerification, normalizedEmail, readAccessBody } from '../_shared/accountAccess.ts';

serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: accessCors });
  if (req.method !== 'POST') return accessJson({ error: 'Method not allowed' }, 405);
  let body: Record<string, unknown>;
  try { body = await readAccessBody(req); } catch { return accessJson({ error: 'Invalid request' }, 400); }
  const email = normalizedEmail(body.email);
  const code = typeof body.code === 'string' ? body.code.trim() : '';
  const password = body.password === undefined ? null : body.password;
  if (!email || !/^\d{6}$/.test(code)) return accessJson({ error: 'Enter your email and the 6-digit code.' }, 400);
  if (password !== null && (typeof password !== 'string' || password.length < 8 || password.length > 128)) {
    return accessJson({ error: 'Use a password between 8 and 128 characters.' }, 400);
  }
  try {
    if (!await allowAccessVerification(req, email)) return accessJson({ error: 'Too many attempts. Please try later or contact tap@tapaway.co.' }, 429);
    const db = admin(), codeHash = await hashValue(code);
    const verify = async (consume: boolean) => {
      const { data, error } = await db.rpc('verify_account_otp', { _email: email, _code_hash: codeHash, _consume: consume });
      if (error) throw new Error('Verification unavailable');
      return data === true;
    };
    const invalid = () => accessJson({ error: 'Invalid or expired code. Request a new code if needed.' }, 400);
    // Claim BEFORE any Auth mutation. Replays and concurrent submissions cannot
    // reset a password twice. A failed/ambiguous Auth call requires a new code.
    if (!await verify(password !== null)) return invalid();
    const { data: users, error: lookupError } = await db.rpc('get_auth_user_by_email', { lookup_email: email });
    if (lookupError) throw new Error('Account lookup unavailable');
    const existing = users?.[0];
    if (!existing && password === null) return accessJson({ success: true, isNewUser: true, needsPassword: true });
    if (password === null && !await verify(true)) return invalid();
    if (existing) {
      const { error } = await db.auth.admin.updateUserById(existing.id, {
        email_confirm: true, ...(password !== null ? { password: password as string } : {}),
      });
      if (error) throw new Error('Account update unavailable');
      return accessJson({ success: true, userId: existing.id, email, isNewUser: false,
        ...(password !== null ? { passwordUpdated: true } : { existingAccount: true }) });
    }
    const { data, error } = await db.auth.admin.createUser({ email, password: password as string, email_confirm: true });
    if (error || !data?.user) throw new Error('Account creation unavailable');
    // Auth signup alone does not grant a paid hub; billing guards remain in place.
    return accessJson({ success: true, userId: data.user.id, email, isNewUser: true, usedProvidedPassword: true });
  } catch {
    console.error('[verify-custom-otp] Account verification unavailable');
    return accessJson({ error: 'We could not finish verification. Request a new code and try again.' }, 503);
  }
});
