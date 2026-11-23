import { supabase } from "@/integrations/supabase/client";
import type { PublicProfileReview, ReviewSession } from "@/lib/profileReviews";

export class ReviewRequestError extends Error {
  constructor(message: string, public code = "REQUEST_UNAVAILABLE") { super(message); this.name = "ReviewRequestError"; }
}

/** Custom review capabilities never replace the signed-in merchant's auth session. */
export async function requestProfileReview<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("profile-review", { body });
  let response = data;
  if (error && (!response || typeof response !== "object")) {
    const context = (error as unknown as { context?: { json?: () => Promise<unknown> } }).context;
    try { if (context?.json) response = await context.json(); } catch { /* Show a safe retry message below. */ }
  }
  if (error || response?.error) {
    const code = typeof response?.code === "string" ? response.code : "REQUEST_UNAVAILABLE";
    const fallback = "We couldn’t complete that step. Please try again.";
    const message = typeof response?.error === "string" && response.error.length <= 240 ? response.error : fallback;
    throw new ReviewRequestError(message, code);
  }
  if (!response || typeof response !== "object") throw new ReviewRequestError("We couldn’t complete that step. Please try again.");
  return response as T;
}

export function normalizeReviewPhone(value: string): string | null {
  const trimmed = value.trim();
  if (!/^\+?[\d\s().-]+$/.test(trimmed)) return null;
  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+")) return /^[1-9]\d{7,14}$/.test(digits) ? `+${digits}` : null;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

const sessionKey = (profileId: string) => `tapaway:review-session:${profileId}`;
export function readReviewSessionToken(profileId: string): string | null {
  try {
    const saved = JSON.parse(window.localStorage.getItem(sessionKey(profileId)) || "null");
    if (typeof saved?.token === "string" && saved.token.length >= 32 && saved.token.length <= 1000
      && typeof saved.expiresAt === "string" && Date.parse(saved.expiresAt) > Date.now()) return saved.token;
    window.localStorage.removeItem(sessionKey(profileId));
  } catch { /* Storage is optional; fresh phone verification still works. */ }
  return null;
}

export function persistReviewSession(profileId: string, token: string, expiresAt: string): void {
  try { window.localStorage.setItem(sessionKey(profileId), JSON.stringify({ token, expiresAt })); } catch { /* Keep the current tab's session. */ }
}

export function clearReviewSession(profileId: string): void {
  try { window.localStorage.removeItem(sessionKey(profileId)); } catch { /* Storage may be unavailable. */ }
}

export function validReview(value: unknown): value is PublicProfileReview {
  if (!value || typeof value !== "object") return false;
  const review = value as PublicProfileReview;
  return typeof review.id === "string" && /^[\da-f-]{36}$/i.test(review.id)
    && Number.isInteger(review.rating) && review.rating >= 1 && review.rating <= 5
    && (review.comment === null || typeof review.comment === "string")
    && typeof review.created_at === "string" && Number.isFinite(Date.parse(review.created_at));
}

export function validReviewSession(value: ReviewSession): boolean {
  return value?.success === true && typeof value.maskedPhone === "string"
    && typeof value.expiresAt === "string" && Date.parse(value.expiresAt) > Date.now()
    && (value.review === null || validReview(value.review));
}
