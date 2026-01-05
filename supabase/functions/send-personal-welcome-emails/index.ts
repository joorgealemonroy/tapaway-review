import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PersonalWelcomeEmailRequest {
  fullName: string;
  username: string;
  email: string;
  profilePhotoUrl?: string;
  headerImageUrl?: string;
  accentColor?: string;
  profileId: string;
  isTest?: boolean;
}

// Internal notification email recipient (for testing, can be changed)
const INTERNAL_EMAIL_RECIPIENT = "jorgealemonroy@gmail.com";
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") || "TapAway <no-reply@tapaway.co>";
const FRONTEND_URL = Deno.env.get("FRONTEND_URL") || "https://tapaway.co";

const generateInternalNotificationEmail = (data: PersonalWelcomeEmailRequest): string => {
  const timestamp = new Date().toLocaleString('en-US', { 
    timeZone: 'America/New_York',
    dateStyle: 'full',
    timeStyle: 'short'
  });

  const profileUrl = `${FRONTEND_URL}/${data.username}`;
  const adminUrl = `${FRONTEND_URL}/admin?tab=personal-accounts`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New TapAway Personal Card Order</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <!-- Header -->
              <tr>
                <td style="background-color: #18181b; padding: 24px 32px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
                    🎉 New TapAway Personal Card Order
                  </h1>
                </td>
              </tr>
              
              <!-- Profile Photo Section -->
              ${data.profilePhotoUrl ? `
              <tr>
                <td style="padding: 32px 32px 16px; text-align: center;">
                  <img src="${data.profilePhotoUrl}" alt="Profile Photo" style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 4px solid ${data.accentColor || '#6366f1'};" />
                </td>
              </tr>
              ` : ''}
              
              <!-- User Details -->
              <tr>
                <td style="padding: 16px 32px;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e4e4e7; border-radius: 8px; overflow: hidden;">
                    <tr>
                      <td style="padding: 16px; background-color: #fafafa; border-bottom: 1px solid #e4e4e7;">
                        <strong style="color: #71717a; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Full Name</strong>
                        <p style="margin: 4px 0 0; color: #18181b; font-size: 16px; font-weight: 600;">${data.fullName}</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 16px; background-color: #ffffff; border-bottom: 1px solid #e4e4e7;">
                        <strong style="color: #71717a; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Username</strong>
                        <p style="margin: 4px 0 0; color: #18181b; font-size: 16px; font-weight: 600;">@${data.username}</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 16px; background-color: #fafafa; border-bottom: 1px solid #e4e4e7;">
                        <strong style="color: #71717a; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Email</strong>
                        <p style="margin: 4px 0 0; color: #18181b; font-size: 16px;">${data.email}</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 16px; background-color: #ffffff; border-bottom: 1px solid #e4e4e7;">
                        <strong style="color: #71717a; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Accent Color</strong>
                        <p style="margin: 4px 0 0;">
                          <span style="display: inline-block; width: 24px; height: 24px; background-color: ${data.accentColor || '#6366f1'}; border-radius: 4px; vertical-align: middle; border: 1px solid #e4e4e7;"></span>
                          <span style="color: #18181b; font-size: 14px; margin-left: 8px; vertical-align: middle;">${data.accentColor || 'Default (#6366f1)'}</span>
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 16px; background-color: #fafafa;">
                        <strong style="color: #71717a; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Signup Time</strong>
                        <p style="margin: 4px 0 0; color: #18181b; font-size: 14px;">${timestamp}</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Header Image (if present) -->
              ${data.headerImageUrl ? `
              <tr>
                <td style="padding: 16px 32px;">
                  <strong style="color: #71717a; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 8px;">Header Image</strong>
                  <img src="${data.headerImageUrl}" alt="Header Image" style="width: 100%; max-height: 150px; object-fit: cover; border-radius: 8px; border: 1px solid #e4e4e7;" />
                </td>
              </tr>
              ` : ''}
              
              <!-- Actions -->
              <tr>
                <td style="padding: 24px 32px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding-right: 8px;" width="50%">
                        <a href="${profileUrl}" target="_blank" style="display: block; padding: 14px 20px; background-color: #18181b; color: #ffffff; text-decoration: none; border-radius: 8px; text-align: center; font-weight: 600; font-size: 14px;">
                          View Profile
                        </a>
                      </td>
                      <td style="padding-left: 8px;" width="50%">
                        <a href="${adminUrl}" target="_blank" style="display: block; padding: 14px 20px; background-color: #f4f4f5; color: #18181b; text-decoration: none; border-radius: 8px; text-align: center; font-weight: 600; font-size: 14px; border: 1px solid #e4e4e7;">
                          Admin Panel
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 24px 32px; background-color: #fafafa; border-top: 1px solid #e4e4e7; text-align: center;">
                  <p style="margin: 0; color: #71717a; font-size: 13px;">
                    This is an automated notification from TapAway.<br/>
                    Profile ID: ${data.profileId}
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
};

const generateUserWelcomeEmail = (data: PersonalWelcomeEmailRequest): string => {
  const profileUrl = `${FRONTEND_URL}/${data.username}`;
  const dashboardUrl = `${FRONTEND_URL}/personal/dashboard`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to TapAway</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <!-- Header with Logo -->
              <tr>
                <td style="background-color: #18181b; padding: 32px; text-align: center;">
                  <img src="${FRONTEND_URL}/tapaway-logo.svg" alt="TapAway" style="height: 32px; margin-bottom: 16px;" />
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                    Welcome to TapAway 👋
                  </h1>
                </td>
              </tr>
              
              <!-- Main Content -->
              <tr>
                <td style="padding: 40px 32px;">
                  <p style="margin: 0 0 24px; color: #18181b; font-size: 18px; line-height: 1.6;">
                    Hey ${data.fullName.split(' ')[0]}!
                  </p>
                  
                  <p style="margin: 0 0 24px; color: #52525b; font-size: 16px; line-height: 1.7;">
                    Thanks for joining TapAway. Your personal profile is now live and your custom NFC card is being prepared.
                  </p>
                  
                  <p style="margin: 0 0 32px; color: #52525b; font-size: 16px; line-height: 1.7;">
                    In the meantime, make sure your profile is ready for when your card arrives.
                  </p>
                  
                  <!-- Profile Card Preview -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fafafa; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
                    <tr>
                      <td style="padding: 20px;">
                        <p style="margin: 0 0 8px; color: #71717a; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Your Profile</p>
                        <p style="margin: 0; color: #18181b; font-size: 18px; font-weight: 600;">
                          tapaway.co/${data.username}
                        </p>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- CTA Button -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center">
                        <a href="${dashboardUrl}" target="_blank" style="display: inline-block; padding: 16px 40px; background-color: #18181b; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                          Edit Your Profile
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- What's Next Section -->
              <tr>
                <td style="padding: 0 32px 40px;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid #e4e4e7; padding-top: 32px;">
                    <tr>
                      <td>
                        <h3 style="margin: 0 0 20px; color: #18181b; font-size: 16px; font-weight: 600;">What happens next?</h3>
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="padding: 8px 0;">
                              <span style="display: inline-block; width: 24px; height: 24px; background-color: #18181b; color: #ffffff; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 600; margin-right: 12px;">1</span>
                              <span style="color: #52525b; font-size: 14px;">We print your custom TapAway card</span>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0;">
                              <span style="display: inline-block; width: 24px; height: 24px; background-color: #18181b; color: #ffffff; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 600; margin-right: 12px;">2</span>
                              <span style="color: #52525b; font-size: 14px;">Your card ships within 3-5 business days</span>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0;">
                              <span style="display: inline-block; width: 24px; height: 24px; background-color: #18181b; color: #ffffff; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 600; margin-right: 12px;">3</span>
                              <span style="color: #52525b; font-size: 14px;">Tap your card to share your profile instantly</span>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 24px 32px; background-color: #fafafa; border-top: 1px solid #e4e4e7; text-align: center;">
                  <p style="margin: 0 0 8px; color: #71717a; font-size: 13px;">
                    Questions? Reply to this email or visit <a href="${FRONTEND_URL}/support" style="color: #18181b; text-decoration: underline;">tapaway.co/support</a>
                  </p>
                  <p style="margin: 0; color: #a1a1aa; font-size: 12px;">
                    © ${new Date().getFullYear()} TapAway. All rights reserved.
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
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: PersonalWelcomeEmailRequest = await req.json();
    
    console.log("[send-personal-welcome-emails] Sending emails for:", {
      username: data.username,
      email: data.email?.substring(0, 3) + "***",
      isTest: data.isTest,
    });

    const results = {
      internalEmail: { success: false, error: null as string | null },
      welcomeEmail: { success: false, error: null as string | null },
    };

    // 1. Send internal notification email
    try {
      const internalHtml = generateInternalNotificationEmail(data);
      const internalResult = await resend.emails.send({
        from: EMAIL_FROM,
        to: [INTERNAL_EMAIL_RECIPIENT],
        subject: `New TapAway Personal Card Order — @${data.username}`,
        html: internalHtml,
      });
      
      console.log("[send-personal-welcome-emails] Internal email sent:", internalResult);
      results.internalEmail.success = true;
    } catch (error) {
      console.error("[send-personal-welcome-emails] Internal email failed:", error);
      results.internalEmail.error = error instanceof Error ? error.message : "Unknown error";
    }

    // 2. Send welcome email to user
    try {
      const welcomeHtml = generateUserWelcomeEmail(data);
      const welcomeResult = await resend.emails.send({
        from: EMAIL_FROM,
        to: [data.email],
        subject: "Welcome to TapAway 👋 Your card is being prepared",
        html: welcomeHtml,
      });
      
      console.log("[send-personal-welcome-emails] Welcome email sent:", welcomeResult);
      results.welcomeEmail.success = true;
    } catch (error) {
      console.error("[send-personal-welcome-emails] Welcome email failed:", error);
      results.welcomeEmail.error = error instanceof Error ? error.message : "Unknown error";
    }

    return new Response(
      JSON.stringify({
        success: results.internalEmail.success && results.welcomeEmail.success,
        results,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    console.error("[send-personal-welcome-emails] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
