// request-more-cards — customer-initiated add-on card request.
//
// Allowance is derived server-side from the account's own plan record:
//   Venue-family plans → 15 cards per calendar month
//   Everything else (Solo) → 4 cards per calendar month
// The client's number is validated against that; it is never trusted.
// An active or trialing subscription is required.
//
// Works for both account kinds:
//   restaurants        → fulfillment_orders (plan = 'addon')
//   personal_profiles  → personal_card_requests (is_addon = true)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { cardAllowanceForPlan, cardPlanLabel, canRequestCards } from "../_shared/cardAllowance.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Email sending helper
async function sendInternalEmail(options: {
  subject: string;
  html: string;
}): Promise<boolean> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const emailFrom = Deno.env.get('EMAIL_FROM') || 'no-reply@tapaway.co';
  const emailInternal = Deno.env.get('EMAIL_INTERNAL') || 'tap@tapaway.co';

  if (!resendApiKey) {
    console.error('[request-more-cards] RESEND_API_KEY not configured');
    return false;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: emailInternal,
        from: emailFrom,
        subject: options.subject,
        html: options.html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[request-more-cards] Resend API error:', response.status, errorText);
      return false;
    }

    const result = await response.json();
    console.log('[request-more-cards] Internal email sent, id:', result.id);
    return true;
  } catch (error) {
    console.error('[request-more-cards] Email send failed:', error);
    return false;
  }
}

function startOfMonthIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

type ShippingRow = {
  shipping_name?: string | null;
  shipping_address_line1?: string | null;
  shipping_address_line2?: string | null;
  shipping_city?: string | null;
  shipping_state?: string | null;
  shipping_postal_code?: string | null;
  shipping_country?: string | null;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ success: false, error: 'No authorization header' }, 401);
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return json({ success: false, error: 'Invalid auth token' }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const quantity = body?.quantity;
    const restaurantId: string | undefined = body?.restaurantId || undefined;
    const personalProfileId: string | undefined = body?.personalProfileId || undefined;

    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1) {
      return json({ success: false, error: 'Quantity must be a whole number of at least 1' }, 400);
    }

    const isAdmin = user.email === 'tap@tapaway.co';

    // ── Resolve the account ────────────────────────────────────────────
    type Account = {
      kind: 'restaurant' | 'personal';
      id: string;
      name: string;
      email: string | null;
      planType: string | null;
      status: string | null;
      slug: string | null;
    };

    let account: Account | null = null;

    if (!personalProfileId) {
      let q = supabaseAdmin
        .from('restaurants')
        .select('id, restaurant_name, owner_name, email, plan_type, subscription_status, custom_slug');
      if (restaurantId) q = q.eq('id', restaurantId);
      if (!isAdmin) q = q.eq('owner_id', user.id);
      const { data: restaurant } = await q.maybeSingle();
      if (restaurant) {
        account = {
          kind: 'restaurant',
          id: restaurant.id,
          name: restaurant.restaurant_name || restaurant.owner_name || 'Unknown',
          email: restaurant.email || user.email || null,
          planType: restaurant.plan_type,
          status: restaurant.subscription_status,
          slug: restaurant.custom_slug,
        };
      }
    }

    if (!account) {
      let q = supabaseAdmin
        .from('personal_profiles')
        .select('id, full_name, username, email, plan_type, subscription_status');
      if (personalProfileId) q = q.eq('id', personalProfileId);
      if (!isAdmin) q = q.eq('user_id', user.id);
      const { data: profile } = await q.maybeSingle();
      if (profile) {
        account = {
          kind: 'personal',
          id: profile.id,
          name: profile.full_name || profile.username || 'Unknown',
          email: profile.email || user.email || null,
          planType: profile.plan_type,
          status: profile.subscription_status,
          slug: profile.username,
        };
      }
    }

    if (!account) {
      return json({ success: false, error: 'Account not found' }, 404);
    }

    // ── Subscription gate ──────────────────────────────────────────────
    if (!isAdmin && !canRequestCards(account.status)) {
      return json({
        success: false,
        error: "Card requests need an active plan. Open the Plan tab in your dashboard to get set up.",
        code: 'inactive_subscription',
      }, 400);
    }

    // ── Plan-based monthly allowance ───────────────────────────────────
    const allowance = cardAllowanceForPlan(account.planType);
    const monthStart = startOfMonthIso();

    let usedThisMonth = 0;
    if (account.kind === 'restaurant') {
      const { data: orders, error: usageErr } = await supabaseAdmin
        .from('fulfillment_orders')
        .select('quantity')
        .eq('restaurant_id', account.id)
        .eq('plan', 'addon')
        .gte('created_at', monthStart);
      if (usageErr) console.error('[request-more-cards] usage lookup failed:', usageErr.message);
      usedThisMonth = (orders || []).reduce((sum, o) => sum + (o.quantity || 0), 0);
    } else {
      const { data: reqs, error: usageErr } = await supabaseAdmin
        .from('personal_card_requests')
        .select('quantity')
        .eq('profile_id', account.id)
        .eq('is_addon', true)
        .gte('created_at', monthStart);
      if (usageErr) console.error('[request-more-cards] usage lookup failed:', usageErr.message);
      usedThisMonth = (reqs || []).reduce((sum, r) => sum + (r.quantity || 0), 0);
    }

    const remaining = Math.max(allowance - usedThisMonth, 0);

    console.log('[request-more-cards]', {
      kind: account.kind,
      plan: account.planType,
      allowance,
      usedThisMonth,
      remaining,
      quantity,
    });

    if (remaining <= 0) {
      return json({
        success: false,
        error: `You've already requested ${allowance} card${allowance === 1 ? '' : 's'} this month on the ${cardPlanLabel(account.planType)} plan. Your allowance resets next month.`,
        code: 'allowance_exhausted',
        allowance,
        remaining: 0,
      }, 400);
    }

    if (quantity > remaining) {
      return json({
        success: false,
        error: `You can request ${remaining} more card${remaining === 1 ? '' : 's'} this month.`,
        code: 'over_allowance',
        allowance,
        remaining,
      }, 400);
    }

    // ── Reuse the most recent shipping address ─────────────────────────
    let existing: ShippingRow | null = null;
    if (account.kind === 'restaurant') {
      const { data } = await supabaseAdmin
        .from('fulfillment_orders')
        .select('shipping_name, shipping_address_line1, shipping_address_line2, shipping_city, shipping_state, shipping_postal_code, shipping_country')
        .eq('restaurant_id', account.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      existing = data as ShippingRow | null;
    } else {
      const { data } = await supabaseAdmin
        .from('personal_card_requests')
        .select('shipping_name, shipping_address_line1, shipping_address_line2, shipping_city, shipping_state, shipping_postal_code, shipping_country')
        .eq('profile_id', account.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      existing = data as ShippingRow | null;
    }

    // Optional caller-supplied shipping override (confirmed in the dialog).
    const shippingInput = body?.shipping && typeof body.shipping === 'object' ? body.shipping : null;
    const shipping: ShippingRow = {
      shipping_name: shippingInput?.name?.toString().slice(0, 120) || existing?.shipping_name || null,
      shipping_address_line1: shippingInput?.line1?.toString().slice(0, 200) || existing?.shipping_address_line1 || null,
      shipping_address_line2: shippingInput?.line2?.toString().slice(0, 200) || existing?.shipping_address_line2 || null,
      shipping_city: shippingInput?.city?.toString().slice(0, 100) || existing?.shipping_city || null,
      shipping_state: shippingInput?.state?.toString().slice(0, 60) || existing?.shipping_state || null,
      shipping_postal_code: shippingInput?.postalCode?.toString().slice(0, 20) || existing?.shipping_postal_code || null,
      shipping_country: shippingInput?.country?.toString().slice(0, 60) || existing?.shipping_country || 'US',
    };

    // ── Create the request record ──────────────────────────────────────
    let newId: string;
    if (account.kind === 'restaurant') {
      const { data: newOrder, error: insertError } = await supabaseAdmin
        .from('fulfillment_orders')
        .insert({
          user_id: user.id,
          restaurant_id: account.id,
          plan: 'addon',
          quantity,
          status: 'pending',
          ...shipping,
        })
        .select('id')
        .single();
      if (insertError || !newOrder) {
        console.error('[request-more-cards] Insert error:', insertError);
        return json({ success: false, error: 'Failed to create order' }, 500);
      }
      newId = newOrder.id;
    } else {
      const { data: newReq, error: insertError } = await supabaseAdmin
        .from('personal_card_requests')
        .insert({
          user_id: user.id,
          profile_id: account.id,
          quantity,
          status: 'pending',
          is_addon: true,
          ...shipping,
        })
        .select('id')
        .single();
      if (insertError || !newReq) {
        console.error('[request-more-cards] Insert error:', insertError);
        return json({ success: false, error: 'Failed to create request' }, 500);
      }
      newId = newReq.id;
    }

    const shippingInfo = [
      shipping.shipping_name,
      shipping.shipping_address_line1,
      shipping.shipping_address_line2,
      [shipping.shipping_city, shipping.shipping_state, shipping.shipping_postal_code].filter(Boolean).join(', '),
      shipping.shipping_country,
    ].filter(Boolean).join('<br>') || 'No shipping address on file — please confirm with customer';

    const internalHtml = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Card Reorder Request</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <h1 style="color: #7c3aed; margin-top: 0;">🔄 Card Reorder Request</h1>
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Account</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #111827; font-weight: 600;">${account.name} (${account.kind})</td></tr>
      <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Email</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #111827;">${account.email || user.email}</td></tr>
      <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Plan</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #111827;">${cardPlanLabel(account.planType)} (${account.planType || 'n/a'}) · ${account.status || 'n/a'}</td></tr>
      <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Requested Quantity</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #111827; font-weight: 600; font-size: 18px;">${quantity} cards</td></tr>
      <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Monthly Usage</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #111827;">${usedThisMonth + quantity}/${allowance} cards used this month</td></tr>
      <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Hub URL</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><a href="https://tapaway.co/${account.slug || ''}" style="color: #0d9488;">tapaway.co/${account.slug || ''}</a></td></tr>
    </table>
    <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <h3 style="color: #92400e; margin: 0 0 8px 0;">📍 Shipping Address</h3>
      <p style="color: #78350f; margin: 0; line-height: 1.6;">${shippingInfo}</p>
    </div>
    <p style="color: #6b7280; font-size: 12px;">Record ID: ${newId}</p>
  </div>
</body></html>`;

    const emailSent = await sendInternalEmail({
      subject: `Card Reorder Request – ${account.name} (${quantity} cards)`,
      html: internalHtml,
    });

    return json({
      success: true,
      orderId: newId,
      emailSent,
      monthlyUsage: {
        used: usedThisMonth + quantity,
        limit: allowance,
        remaining: remaining - quantity,
      },
    });
  } catch (error) {
    console.error('[request-more-cards] Error:', error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});
