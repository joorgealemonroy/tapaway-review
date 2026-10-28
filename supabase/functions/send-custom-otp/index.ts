import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { admin } from '../_shared/paymentFirst.ts';
import { hashValue } from '../_shared/storefrontRateLimit.ts';
import { sendEmailAndLog, wrapEmail } from '../_shared/email.ts';
import { accessCors, accessJson, allowAccessEmail, normalizedEmail, readAccessBody, secureOtpCode } from '../_shared/accountAccess.ts';

serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: accessCors });
  if (req.method !== 'POST') return accessJson({ error: 'Method not allowed' }, 405);
  let body: Record<string, unknown>;
  try { body = await readAccessBody(req); } catch { return accessJson({ error: 'Invalid request' }, 400); }
  const email = normalizedEmail(body.email);
  if (!email) return accessJson({ error: 'Enter a valid email address.' }, 400);
  try {
    if (!await allowAccessEmail(req, email)) return accessJson({ error: 'Please wait before requesting another code. Check your inbox for your latest email.' }, 429);
    const code = secureOtpCode();
    const { data: id, error } = await admin().rpc('issue_account_otp', { _email: email, _code_hash: await hashValue(code) });
    if (error || !id) throw new Error('Code creation unavailable');
    const sent = await sendEmailAndLog({
      to: email, templateKey: 'account_verification', subject: 'Your TapAway verification code', replyTo: 'tap@tapaway.co',
      html: wrapEmail({
        preheader: 'Your secure code is ready. It expires in 10 minutes.',
        headline: 'Your verification code',
        introHtml: '<p>Enter this code to continue with your TapAway account.</p>',
        bodyHtml: `<p style="background:#f0fdf4;border-radius:12px;padding:20px;text-align:center;font-size:32px;font-weight:800;letter-spacing:5px;color:#245b43;">${code}</p><p>It expires in 10 minutes. Keep it private: TapAway will never ask you to share it in a message or call.</p>`,
        footerNote: "Didn't request this? You can safely ignore this email.",
      }),
      text: `Your TapAway verification code is ${code}. It expires in 10 minutes. Keep this code private. If you didn't request it, ignore this email.`,
    });
    if (!sent.ok) return accessJson({ error: 'We could not send your code. Please try again in a minute.' }, 503);
    return accessJson({ success: true });
  } catch {
    console.error('[send-custom-otp] Code delivery unavailable');
    return accessJson({ error: 'Email is temporarily unavailable. Please try again shortly.' }, 503);
  }
});
