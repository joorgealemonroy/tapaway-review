// A permanent admin diagnostic, not an arbitrary-recipient mail relay.
// Sends to Resend's documented sink only; never sends an account token.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { requireUser, isAdmin } from '../_shared/security.ts';
import { accessCors, accessJson } from '../_shared/accountAccess.ts';
import { takeQuota } from '../_shared/storefrontRateLimit.ts';
import { sendEmailAndLog, wrapEmail } from '../_shared/email.ts';

serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: accessCors });
  if (req.method !== 'POST') return accessJson({ error: 'Method not allowed' }, 405);
  try {
    const auth = await requireUser(req);
    if (!auth || !await isAdmin(auth.user.id)) return accessJson({ error: 'Admin access required' }, 403);
    if (await takeQuota(req, 'email-delivery-test', 3, 'all-admins') < 0) return accessJson({ error: 'Three checks are available per day. Check the email history for results.' }, 429);
    const result = await sendEmailAndLog({
      to: 'delivered@resend.dev', templateKey: 'delivery_test', subject: 'TapAway delivery check', replyTo: 'tap@tapaway.co',
      html: wrapEmail({ preheader: 'A safe test of your TapAway email delivery.', headline: 'Thanks for choosing TapAway',
        introHtml: '<p>This is a delivery check of the same branded sender used for customer emails.</p>',
        bodyHtml: '<p>No order was placed and no account was created. Check Email history for acceptance and delivery.</p>',
        ctaLabel: 'Open TapAway', ctaUrl: 'https://tapaway.co', footerNote: 'Sent only to the Resend test address.' }),
      text: 'TapAway delivery check. No order was placed and no account was created. Sent only to the Resend test address.',
    });
    return result.ok ? accessJson({ success: true, resendId: result.resendId }) : accessJson({ error: 'The provider did not accept the test email. Check Email history.' }, 503);
  } catch { return accessJson({ error: 'Delivery check is temporarily unavailable.' }, 503); }
});
