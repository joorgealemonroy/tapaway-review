import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// TapAway logo hosted on imgur - reliable permanent URL for emails
const LOGO_URL = 'https://i.imgur.com/7wJOS7a.png';

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
  
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0fdfa;padding:40px 20px;">
    <tr>
      <td align="center">
        
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(13,148,136,0.12);">
          
          <!-- Header with logo -->
          <tr>
            <td style="background:#ffffff;padding:32px 32px 20px;text-align:center;border-bottom:3px solid #0d9488;">
              <img src="${LOGO_URL}" alt="TapAway" width="280" style="height:auto;max-width:280px;display:block;margin:0 auto;" />
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
