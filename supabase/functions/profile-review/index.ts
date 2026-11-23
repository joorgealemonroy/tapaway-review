import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { admin } from "../_shared/paymentFirst.ts";
import { accessCors, accessJson, readAccessBody, secureOtpCode } from "../_shared/accountAccess.ts";
import { hashValue, takeQuota } from "../_shared/storefrontRateLimit.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN = /^[a-f0-9]{64}$/;
const GATEWAY = "https://connector-gateway.lovable.dev/twilio/Messages.json";
const failure = (code: string, error: string, status: number) => accessJson({ code, error }, status);
const userAgent = (req: Request) => (req.headers.get("user-agent") || "").slice(0, 500) || null;

export function normalizeReviewPhone(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 40 || !/^[+\d\s().-]+$/.test(value.trim())) return null;
  const raw = value.trim();
  const digits = raw.replace(/\D/g, "");
  const phone = raw.startsWith("+") ? `+${digits}` : digits.length === 10 ? `+1${digits}` : digits.length === 11 && digits.startsWith("1") ? `+${digits}` : "";
  return /^\+[1-9]\d{7,14}$/.test(phone) ? phone : null;
}

function otpSender() {
  // The explicitly enabled global TapAway sender owns this OTP suppression namespace.
  // Dedicated merchant senders must never be used as a fallback for verification.
  const from = Deno.env.get("TWILIO_FROM_NUMBER") || "";
  return Deno.env.get("REVIEW_OTP_ENABLED") === "true" && /^\+[1-9]\d{7,14}$/.test(from)
    && Deno.env.get("LOVABLE_API_KEY") && Deno.env.get("TWILIO_API_KEY") ? from : null;
}

async function keyedHash(value: string) {
  const secret = Deno.env.get("REVIEW_OTP_SECRET") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!secret) throw new Error("Verification secret unavailable");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const result = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(result), value => value.toString(16).padStart(2, "0")).join("");
}

function databaseFailure(error: { code?: string; message?: string }) {
  if (error.code === "28000") return failure("SESSION_EXPIRED", "Verify your phone again to manage your review.", 401);
  if (error.code === "P0001") return failure("RATE_LIMITED", "Please wait before trying again.", 429);
  if (error.message === "Reviews are unavailable for this hub.") return failure("REVIEWS_UNAVAILABLE", error.message, 404);
  if (error.message === "Verification texts are unavailable for this number.") return failure("OTP_SUPPRESSED", "Verification texts are unavailable for this number. Contact TapAway for help.", 400);
  const allowed = ["Check your phone number and verification consent.", "Choose 1 to 5 stars and keep feedback to 600 characters.", "Refresh the review form before trying again."];
  if (error.code === "22023") return failure("INVALID_REQUEST", allowed.includes(error.message || "") ? error.message! : "Please check your details and try again.", 400);
  return failure("SAVE_UNAVAILABLE", "We couldn’t complete this request. Please try again.", 503);
}

serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: accessCors });
  if (req.method !== "POST") return failure("METHOD_NOT_ALLOWED", "Method not allowed", 405);
  let body: Record<string, unknown>;
  try { body = await readAccessBody(req); } catch { return failure("INVALID_REQUEST", "Please check your details and try again.", 400); }
  const profileId = typeof body.profileId === "string" && UUID.test(body.profileId) ? body.profileId : "";
  if (!profileId || !["config", "request_code", "verify_code", "session", "save"].includes(String(body.action))) return failure("INVALID_REQUEST", "This review request is invalid.", 400);
  const db = admin();
  try {
    if (body.action === "config") {
      const { data, error } = await db.rpc("get_profile_review_config", { p_profile_id: profileId });
      if (error || !data) return failure("VERIFICATION_UNAVAILABLE", "Reviews are temporarily unavailable.", 503);
      return accessJson({ ...data, verificationAvailable: data.enabled === true && !!otpSender() });
    }

    if (body.action === "request_code") {
      const phone = normalizeReviewPhone(body.phone);
      if (!phone || body.otpConsent !== true || body.otpConsentVersion !== 1) return failure("INVALID_REQUEST", "Enter your phone number and review the verification notice.", 400);
      const from = otpSender();
      if (!from) return failure("VERIFICATION_UNAVAILABLE", "Phone verification is being prepared. Please try again later.", 503);
      const hour = Math.floor(Date.now() / 3600000);
      if (await takeQuota(req, `review-otp-network-hour:${hour}`, 20) < 0
        || await takeQuota(req, "review-otp-network-day", 100) < 0
        || await takeQuota(req, "review-otp-global", 500, "all") < 0) return failure("RATE_LIMITED", "Please wait before requesting another code.", 429);
      const challengeId = crypto.randomUUID();
      const code = secureOtpCode();
      const codeHash = await keyedHash(`review-code:${profileId}:${challengeId}:${code}`);
      const { error } = await db.rpc("create_profile_review_challenge", {
        p_profile_id: profileId, p_phone: phone, p_challenge_id: challengeId, p_code_hash: codeHash,
        p_otp_consent: true, p_otp_consent_version: 1, p_user_agent: userAgent(req),
      });
      if (error) return databaseFailure(error);
      // A signed STOP can arrive after code creation. Recheck before the provider call.
      const allowed = await db.rpc("profile_review_otp_allowed", { p_phone: phone });
      if (allowed.error || allowed.data !== true) return failure("OTP_SUPPRESSED", "Verification texts are unavailable for this number. Contact TapAway for help.", 400);
      const response = await fetch(GATEWAY, {
        method: "POST", signal: AbortSignal.timeout(10000),
        headers: { Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`, "X-Connection-Api-Key": Deno.env.get("TWILIO_API_KEY")!, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ From: from, To: phone,
          Body: `TapAway: Your review verification code is ${code}. Expires in 10 minutes. Do not share it. Reply STOP to unsubscribe. Help: tap@tapaway.co`,
        }),
      });
      const receipt = await response.json().catch(() => null);
      if (!response.ok || typeof receipt?.sid !== "string" || !/^SM[a-zA-Z0-9]+$/.test(receipt.sid)) {
        if (Number(receipt?.code) === 21610) await db.rpc("suppress_profile_review_otp", { p_phone: phone });
        return failure("VERIFICATION_UNAVAILABLE", "We couldn’t send your code. Please try again later.", 503);
      }
      const sent = await db.rpc("mark_profile_review_code_sent", { p_profile_id: profileId, p_challenge_id: challengeId });
      if (sent.error || sent.data !== true) return failure("VERIFICATION_UNAVAILABLE", "We couldn’t confirm your code request. Please try again later.", 503);
      return accessJson({ success: true, challengeId, maskedPhone: `••• ••• ${phone.slice(-4)}`, expiresIn: 600, retryAfter: 60 });
    }

    if (body.action === "verify_code") {
      const challengeId = typeof body.challengeId === "string" && UUID.test(body.challengeId) ? body.challengeId : "";
      const verificationId = typeof body.verificationId === "string" && UUID.test(body.verificationId) ? body.verificationId : "";
      const code = typeof body.code === "string" ? body.code.trim() : "";
      if (!challengeId || !verificationId || !/^\d{6}$/.test(code)) return failure("OTP_INVALID", "Enter the six-digit code from your text.", 400);
      if (await takeQuota(req, "review-verify-network", 100) < 0 || await takeQuota(req, "review-verify-challenge", 15, challengeId) < 0) return failure("RATE_LIMITED", "Please wait before trying again.", 429);
      // A retry of the same explicit verification action gets the same capability;
      // a different action cannot reuse a consumed code. Only its hash is stored.
      const token = await keyedHash(`review-session:${profileId}:${challengeId}:${verificationId}`);
      const { data, error } = await db.rpc("verify_profile_review_challenge", {
        p_profile_id: profileId, p_challenge_id: challengeId,
        p_code_hash: await keyedHash(`review-code:${profileId}:${challengeId}:${code}`),
        p_verification_id: verificationId, p_token_hash: await hashValue(token),
      });
      if (error) return databaseFailure(error);
      if (!data) return failure("OTP_INVALID", "That code is incorrect or expired. Check your text or request a new code.", 400);
      return accessJson({ success: true, token, ...data });
    }

    if (typeof body.token !== "string" || !TOKEN.test(body.token)) return failure("SESSION_EXPIRED", "Verify your phone again to manage your review.", 401);
    const tokenHash = await hashValue(body.token);
    if (await takeQuota(req, "review-session-network", 300) < 0) return failure("RATE_LIMITED", "Please wait before trying again.", 429);
    if (body.action === "session") {
      const { data, error } = await db.rpc("get_profile_review_session", { p_profile_id: profileId, p_token_hash: tokenHash });
      if (error) return databaseFailure(error);
      if (!data) return failure("SESSION_EXPIRED", "Verify your phone again to manage your review.", 401);
      return accessJson({ success: true, ...data });
    }

    const comment = body.comment == null ? null : typeof body.comment === "string" ? body.comment.trim() : undefined;
    if (!Number.isInteger(body.rating) || Number(body.rating) < 1 || Number(body.rating) > 5 || comment === undefined || (comment !== null && Array.from(comment).length > 600)
      || typeof body.submissionId !== "string" || !UUID.test(body.submissionId)
      || (body.marketingConsent !== true && body.marketingConsent !== false)) return failure("INVALID_REQUEST", "Choose 1 to 5 stars and keep feedback to 600 characters.", 400);
    const consentVersion = Number.isInteger(body.consentVersion) && Number(body.consentVersion) > 0 ? Number(body.consentVersion) : null;
    const requestHash = await hashValue(JSON.stringify([profileId, body.rating, comment || null, body.marketingConsent, consentVersion]));
    const { data, error } = await db.rpc("save_verified_profile_review", {
      p_profile_id: profileId, p_token_hash: tokenHash, p_rating: body.rating, p_comment: comment || null,
      p_submission_id: body.submissionId, p_request_hash: requestHash,
      p_marketing_consent: body.marketingConsent === true, p_consent_version: consentVersion, p_user_agent: userAgent(req),
    });
    if (error) return databaseFailure(error);
    if (!data?.review) return failure("SAVE_UNAVAILABLE", "We couldn’t confirm your review. Please try again.", 503);
    return accessJson({ success: true, ...data });
  } catch {
    // Never log a phone, code, bearer token, or submitted feedback.
    return failure("SAVE_UNAVAILABLE", "We couldn’t complete this request. Please try again.", 503);
  }
});
