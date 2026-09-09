// trial-followup — daily trial-nurture SMS sequence (Fix #4).
// Invoked ONLY by the pg_cron job 'trial-followup-daily'; never from the client.
// Texts restaurant owners on day 3 / 10 / 13 of their 14-day trial while their
// subscription_status is 'trialing', via the same Twilio connector gateway used
// by send-mass-sms. Every attempt is logged to trial_nurture_log; the
// UNIQUE(restaurant_id, day_number) constraint plus a pre-send check guarantee
// no owner is ever texted twice for the same day.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TWILIO_GATEWAY = "https://connector-gateway.lovable.dev/twilio";
const STOP_SUFFIX = "\nReply STOP to opt out.";
const MAX_SMS_LEN = 300;
const NURTURE_DAYS = [3, 10, 13];

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function startOfDayUTC(d: Date): Date {
  const x = new Date(d.getTime());
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function buildMessage(day: number, business: string, slug: string | null): string {
  // Defensive cap so templates stay under MAX_SMS_LEN even with long names.
  const biz = business.length > 60 ? `${business.slice(0, 57)}...` : business;
  const hub = slug
    ? ` Your hub's live at tapaway.co/${slug}.`
    : ` Your hub's live and ready to share.`;

  let body: string;
  if (day === 3) {
    body =
      `Hey! Jorge here — it's day 3 of your TapAway trial at ${biz}. ` +
      `How are the cards landing?${hub} Need anything tweaked? Just reply to this text.`;
  } else if (day === 10) {
    body =
      `Heads up — your TapAway trial at ${biz} ends in 4 days, then your hub + cards go dark. ` +
      `Want to keep the reviews rolling? Just reply to this text and I'll keep you live.`;
  } else {
    body =
      `Last call — your TapAway trial at ${biz} ends tomorrow. ` +
      `One reply keeps your hub + cards live, no extra steps. Just reply to this text and you're set.`;
  }

  // Hard cap: trim the body (never the STOP suffix) so templates always fit.
  let message = `TapAway: ${body}${STOP_SUFFIX}`;
  if (message.length > MAX_SMS_LEN) {
    const over = message.length - MAX_SMS_LEN;
    body = body.slice(0, body.length - over);
    message = `TapAway: ${body}${STOP_SUFFIX}`;
  }
  return message;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    const TWILIO_FROM_NUMBER = Deno.env.get("TWILIO_FROM_NUMBER");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("trial-followup misconfigured: missing Supabase env");
      return json(500, { error: "Server configuration error (Supabase)" });
    }

    // ---- Internal auth: only the pg_cron job may call this.
    // The cron job sends Authorization: Bearer <service-role key> (from Vault).
    // Fail closed: no key configured, or wrong key, means no access.
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token || token !== SUPABASE_SERVICE_ROLE_KEY) {
      return json(401, { error: "Unauthorized" });
    }

    if (!LOVABLE_API_KEY || !TWILIO_API_KEY || !TWILIO_FROM_NUMBER) {
      console.error("trial-followup misconfigured: Twilio env missing", {
        has_lovable_key: !!LOVABLE_API_KEY,
        has_twilio_key: !!TWILIO_API_KEY,
        has_from_number: !!TWILIO_FROM_NUMBER,
      });
      return json(500, { error: "Twilio is not connected" });
    }

    // Manual test hook: ?dry_run=1 walks the whole targeting pipeline but sends
    // nothing and writes no log rows. Never used by the cron job.
    const dryRun = new URL(req.url).searchParams.get("dry_run") === "1";

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const today = startOfDayUTC(new Date());
    const cutoff = new Date(today.getTime() - 14 * 86400000).toISOString();

    const { data: trials, error: qErr } = await admin
      .from("restaurants")
      .select("id, restaurant_name, phone, custom_slug, created_at")
      .eq("subscription_status", "trialing")
      // Comped accounts (family, free on purpose) never receive trial
      // nurture texts, regardless of subscription_status.
      .neq("payment_state", "complimentary")
      .gte("created_at", cutoff);

    if (qErr) {
      console.error("trial-followup: failed to load trialing restaurants", qErr);
      return json(500, { error: "Failed to load trialing restaurants" });
    }

    type Candidate = {
      id: string;
      business: string;
      phone: string;
      slug: string | null;
      day: number;
    };

    const candidates: Candidate[] = [];
    for (const r of (trials ?? []) as any[]) {
      const ageDays = Math.floor(
        (today.getTime() - startOfDayUTC(new Date(r.created_at)).getTime()) / 86400000,
      );
      if (!NURTURE_DAYS.includes(ageDays)) continue;
      const phone = typeof r.phone === "string" ? r.phone.trim() : "";
      candidates.push({
        id: r.id,
        business: String(r.restaurant_name || "your business"),
        phone,
        slug: typeof r.custom_slug === "string" && r.custom_slug.trim() ? r.custom_slug.trim() : null,
        day: ageDays,
      });
    }

    // Already-logged (restaurant_id, day) pairs — skip so we never double-send.
    const { data: logged, error: logQErr } = await admin
      .from("trial_nurture_log")
      .select("restaurant_id, day_number")
      .gte("sent_at", cutoff);
    if (logQErr) {
      console.error("trial-followup: failed to read nurture log", logQErr);
      return json(500, { error: "Failed to read nurture log" });
    }
    const loggedSet = new Set(
      ((logged ?? []) as any[]).map((l) => `${l.restaurant_id}:${l.day_number}`),
    );

    let sent = 0;
    let failed = 0;
    let skippedNoPhone = 0;
    let skippedLogged = 0;
    const preview: Array<{ restaurant_id: string; day: number; to: string; message: string }> = [];

    for (const c of candidates) {
      if (loggedSet.has(`${c.id}:${c.day}`)) {
        skippedLogged++;
        continue;
      }
      if (!c.phone) {
        skippedNoPhone++;
        continue;
      }

      const message = buildMessage(c.day, c.business, c.slug);

      if (dryRun) {
        preview.push({ restaurant_id: c.id, day: c.day, to: c.phone, message });
        continue;
      }

      try {
        const res = await fetch(`${TWILIO_GATEWAY}/Messages.json`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": TWILIO_API_KEY,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            To: c.phone,
            From: TWILIO_FROM_NUMBER,
            Body: message,
          }),
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`Twilio HTTP ${res.status}: ${txt.slice(0, 200)}`);
        }
        await admin
          .from("trial_nurture_log")
          .insert({ restaurant_id: c.id, day_number: c.day, status: "sent" });
        sent++;
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : "Unknown error";
        console.error(`trial-followup: send failed for ${c.id} (day ${c.day})`, errMsg);
        try {
          await admin.from("trial_nurture_log").insert({
            restaurant_id: c.id,
            day_number: c.day,
            status: "failed",
            error: errMsg.slice(0, 500),
          });
        } catch (logErr) {
          console.error("trial-followup: log insert failed", logErr);
        }
        failed++;
      }
    }

    return json(200, {
      dry_run: dryRun,
      processed: candidates.length,
      sent,
      failed,
      skipped_no_phone: skippedNoPhone,
      skipped_already_logged: skippedLogged,
      ...(dryRun ? { preview } : {}),
    });
  } catch (err) {
    console.error("trial-followup unexpected error", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return json(500, { error: msg });
  }
});
