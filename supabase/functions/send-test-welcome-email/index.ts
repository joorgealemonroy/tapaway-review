import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// TapAway logo as base64 - embedded directly for 100% email compatibility
const TAPAWAY_LOGO_BASE64 = "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";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to } = await req.json();
    
    if (!to) {
      return new Response(JSON.stringify({ error: 'Missing "to" email address' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Test data
    const ownerName = 'Jorge';
    const restaurantName = 'Test Restaurant';
    const dashboardUrl = 'https://tapaway-review.lovable.app/dashboard';
    const planName = 'Yearly';
    const cardsQty = 15;
    const stripeReceiptUrl = null;
    const shippingEta = '3–5 business days';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to TapAway</title>
</head>
<body style="margin:0;padding:0;background-color:#f0fdfa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  
  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0fdfa;padding:40px 20px;">
    <tr>
      <td align="center">
        
        <!-- Main card -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(13,148,136,0.12);">
          
          <!-- Header with logo on white background -->
          <tr>
            <td style="background:#ffffff;padding:32px 32px 20px;text-align:center;border-bottom:3px solid #0d9488;">
              <img src="data:image/png;base64,${TAPAWAY_LOGO_BASE64}" alt="TapAway" style="height:50px;width:auto;max-width:280px;" />
            </td>
          </tr>
          
          <!-- Gradient welcome banner -->
          <tr>
            <td style="background:linear-gradient(135deg,#0d9488 0%,#14b8a6 50%,#2dd4bf 100%);padding:32px;text-align:center;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <span style="font-size:48px;">🎉</span>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top:16px;">
                    <h1 style="margin:0;font-size:28px;font-weight:700;color:#ffffff;line-height:1.3;">
                      Welcome aboard, ${ownerName}!
                    </h1>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top:8px;">
                    <p style="margin:0;font-size:16px;color:rgba(255,255,255,0.9);">
                      You're all set to collect 5-star reviews
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Body content -->
          <tr>
            <td style="padding:32px;">
              
              <!-- Restaurant name callout -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#f0fdfa 0%,#ccfbf1 100%);border-radius:16px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="40" valign="top">
                          <span style="font-size:24px;">🏪</span>
                        </td>
                        <td style="padding-left:12px;">
                          <p style="margin:0;font-size:13px;color:#0d9488;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Your Restaurant</p>
                          <p style="margin:4px 0 0 0;font-size:20px;font-weight:700;color:#134e4a;">${restaurantName}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Order summary -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:2px solid #e5e7eb;border-radius:16px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;border-bottom:1px solid #f3f4f6;">
                    <p style="margin:0;font-size:14px;font-weight:700;color:#111827;">📦 Your Order</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding:8px 0;">
                          <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="font-size:14px;color:#6b7280;">Plan</td>
                              <td align="right" style="font-size:14px;font-weight:600;color:#111827;">${planName}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;">
                          <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="font-size:14px;color:#6b7280;">NFC Review Cards</td>
                              <td align="right" style="font-size:14px;font-weight:600;color:#0d9488;">${cardsQty} cards</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;">
                          <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="font-size:14px;color:#6b7280;">Shipping</td>
                              <td align="right" style="font-size:14px;font-weight:600;color:#111827;">${shippingEta}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                ${stripeReceiptUrl ? `
                <tr>
                  <td style="padding:12px 24px 16px;border-top:1px solid #f3f4f6;">
                    <a href="${stripeReceiptUrl}" style="font-size:13px;color:#0d9488;text-decoration:underline;">View payment receipt →</a>
                  </td>
                </tr>
                ` : ''}
              </table>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}" style="display:inline-block;background:linear-gradient(135deg,#0d9488 0%,#14b8a6 100%);color:#ffffff;padding:16px 40px;border-radius:999px;font-size:16px;font-weight:700;text-decoration:none;box-shadow:0 4px 14px rgba(13,148,136,0.4);">
                      Open My Dashboard →
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- What happens next -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fafafa;border-radius:16px;margin-bottom:24px;">
                <tr>
                  <td style="padding:24px;">
                    <p style="margin:0 0 16px 0;font-size:16px;font-weight:700;color:#111827;">✨ What happens next</p>
                    
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding:8px 0;">
                          <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td width="32" valign="top" style="font-size:14px;font-weight:700;color:#0d9488;">1.</td>
                              <td style="font-size:14px;color:#4b5563;line-height:1.5;">We prepare and print your custom NFC TapAway cards</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;">
                          <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td width="32" valign="top" style="font-size:14px;font-weight:700;color:#0d9488;">2.</td>
                              <td style="font-size:14px;color:#4b5563;line-height:1.5;">We ship them to the address you provided at checkout</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;">
                          <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td width="32" valign="top" style="font-size:14px;font-weight:700;color:#0d9488;">3.</td>
                              <td style="font-size:14px;color:#4b5563;line-height:1.5;">Place them at your restaurant and watch the reviews roll in!</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Support -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #e5e7eb;padding-top:24px;">
                <tr>
                  <td align="center">
                    <p style="margin:0;font-size:14px;color:#6b7280;">
                      Questions? We're here to help!
                    </p>
                    <p style="margin:8px 0 0 0;">
                      <a href="mailto:tap@tapaway.co" style="font-size:14px;color:#0d9488;font-weight:600;text-decoration:none;">tap@tapaway.co</a>
                    </p>
                  </td>
                </tr>
              </table>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:24px 32px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                You're receiving this because you created a TapAway account for <strong>${restaurantName}</strong>
              </p>
              <p style="margin:12px 0 0 0;font-size:12px;color:#9ca3af;">
                <a href="https://tapaway.co" style="color:#0d9488;text-decoration:none;">tapaway.co</a> · Turn every visit into a Google review
              </p>
            </td>
          </tr>
          
        </table>
        
      </td>
    </tr>
  </table>
  
</body>
</html>
`;

    const text = `
🎉 Welcome to TapAway, ${ownerName}!

Your restaurant "${restaurantName}" is now set up and ready to collect 5-star reviews.

📦 YOUR ORDER
• Plan: ${planName}
• NFC Review Cards: ${cardsQty}
• Shipping: ${shippingEta}

${stripeReceiptUrl ? `View receipt: ${stripeReceiptUrl}\n` : ''}
✨ WHAT HAPPENS NEXT
1. We prepare and print your custom NFC TapAway cards
2. We ship them to the address you provided at checkout
3. Place them at your restaurant and watch the reviews roll in!

👉 Open your dashboard: ${dashboardUrl}

Questions? Email us at tap@tapaway.co

– The TapAway Team
`;

    const emailFrom = Deno.env.get('EMAIL_FROM') || 'TapAway <no-reply@tapaway.co>';

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to,
        from: emailFrom,
        subject: '🎉 Welcome to TapAway – Your cards are on the way!',
        html,
        text,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[send-test-welcome-email] Resend error:', errorText);
      return new Response(JSON.stringify({ error: errorText }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    console.log('[send-test-welcome-email] Email sent:', data);

    return new Response(JSON.stringify({ success: true, emailId: data.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[send-test-welcome-email] Error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
