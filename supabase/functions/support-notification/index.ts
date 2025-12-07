import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SupportNotificationRequest {
  requestType: string;
  name: string;
  businessName: string;
  email: string;
  phone?: string;
  location?: string;
  description?: string;
  requestDetails?: Record<string, any>;
}

const REQUEST_TYPE_LABELS: Record<string, string> = {
  'NEW_CARDS': '🃏 New/Replacement Cards',
  'MORE_CARDS': '📍 More Cards or Locations',
  'TECH_ISSUE': '⚠️ Technical Issue',
  'BILLING': '💳 Billing Question',
  'OTHER': '❓ Other',
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: SupportNotificationRequest = await req.json();
    const supportEmail = Deno.env.get("EMAIL_INTERNAL") || "tap@tapaway.co";
    
    // Format request details for email
    let detailsHtml = '';
    if (data.requestDetails && Object.keys(data.requestDetails).length > 0) {
      const details = data.requestDetails;
      
      if (details.cardNeeds) {
        detailsHtml += `<p><strong>Card Needs:</strong> ${(details.cardNeeds as string[]).join(', ')}</p>`;
      }
      if (details.quantity) {
        detailsHtml += `<p><strong>Quantity:</strong> ${details.quantity}</p>`;
      }
      if (details.newLocationsCount) {
        detailsHtml += `<p><strong>New Locations:</strong> ${details.newLocationsCount}</p>`;
      }
      if (details.techIssues) {
        detailsHtml += `<p><strong>Issues:</strong> ${(details.techIssues as string[]).join(', ')}</p>`;
      }
    }

    // Send notification to internal team
    const internalEmailResponse = await resend.emails.send({
      from: Deno.env.get("EMAIL_FROM") || "TapAway <notifications@tapaway.co>",
      to: [supportEmail],
      subject: `[Support] ${REQUEST_TYPE_LABELS[data.requestType] || data.requestType} - ${data.businessName}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #111; margin-bottom: 24px;">New Support Request</h2>
          
          <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #666;">Request Type</p>
            <p style="margin: 0; font-size: 18px; font-weight: 600; color: #111;">${REQUEST_TYPE_LABELS[data.requestType] || data.requestType}</p>
          </div>
          
          <h3 style="color: #111; margin-bottom: 16px;">Contact Information</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666; width: 120px;">Name</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #111;">${data.name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;">Business</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #111;">${data.businessName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;">Email</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #111;"><a href="mailto:${data.email}" style="color: #0ba5a4;">${data.email}</a></td>
            </tr>
            ${data.phone ? `
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;">Phone</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #111;"><a href="tel:${data.phone}" style="color: #0ba5a4;">${data.phone}</a></td>
            </tr>
            ` : ''}
            ${data.location ? `
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;">Location</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #111;">${data.location}</td>
            </tr>
            ` : ''}
          </table>
          
          ${detailsHtml ? `
          <h3 style="color: #111; margin-bottom: 16px;">Request Details</h3>
          <div style="background: #fff; border: 1px solid #eee; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            ${detailsHtml}
          </div>
          ` : ''}
          
          ${data.description ? `
          <h3 style="color: #111; margin-bottom: 16px;">Description</h3>
          <div style="background: #fff; border: 1px solid #eee; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0; white-space: pre-wrap; color: #333;">${data.description}</p>
          </div>
          ` : ''}
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
          <p style="font-size: 12px; color: #999;">
            Reply to this email to respond directly to ${data.email}
          </p>
        </div>
      `,
      reply_to: data.email,
    });

    console.log("Internal notification sent:", internalEmailResponse);

    // Send confirmation to the customer
    const customerEmailResponse = await resend.emails.send({
      from: Deno.env.get("EMAIL_FROM") || "TapAway <notifications@tapaway.co>",
      to: [data.email],
      subject: `We received your TapAway support request`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          <img src="https://xfrvckdcrqvkqdwjzopt.supabase.co/storage/v1/object/public/restaurant-logos/tapaway-logo-email.png" alt="TapAway" style="height: 32px; margin-bottom: 24px;">
          
          <h2 style="color: #111; margin-bottom: 16px;">Thanks for reaching out!</h2>
          
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            Hi ${data.name.split(' ')[0]},
          </p>
          
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            We've received your ${REQUEST_TYPE_LABELS[data.requestType]?.replace(/^[^\s]+ /, '') || 'support'} request and will get back to you within 1 business day.
          </p>
          
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            If you need to add any additional information (like screenshots), simply reply to this email.
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
          
          <p style="color: #666; font-size: 14px; line-height: 1.6;">
            <strong>Your request summary:</strong><br>
            Type: ${REQUEST_TYPE_LABELS[data.requestType] || data.requestType}<br>
            Business: ${data.businessName}
            ${data.location ? `<br>Location: ${data.location}` : ''}
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
          
          <p style="font-size: 12px; color: #999;">
            TapAway — Helping restaurants get more reviews<br>
            <a href="https://tapaway.co" style="color: #0ba5a4;">tapaway.co</a>
          </p>
        </div>
      `,
    });

    console.log("Customer confirmation sent:", customerEmailResponse);

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in support-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);