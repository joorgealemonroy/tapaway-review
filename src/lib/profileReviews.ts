/** First-party reviews collected on an explicitly enabled public hub. */
export const PROFILE_REVIEW_COMMENT_MAX_LENGTH = 600;

export interface PublicProfileReview {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at?: string;
  phone_verified?: boolean;
}

export interface PublicProfileReviews {
  enabled: boolean;
  total: number;
  average: number | null;
  reviews: PublicProfileReview[];
  has_more: boolean;
}

export interface SubmitProfileReviewArgs {
  p_profile_id: string;
  p_rating: number;
  p_comment: string | null;
  p_visitor_id: string;
  p_submission_id: string;
}

export interface ReviewSmsConfig {
  available: boolean;
  brandName: string;
  consentVersion: number;
  consentText: string;
  termsUrl: string;
  privacyUrl: string;
  frequencyText: string;
}

export interface ReviewConfig {
  enabled: boolean;
  phoneVerification: true;
  verificationAvailable: boolean;
  otpConsentVersion: number;
  otpConsentText: string;
  sms: ReviewSmsConfig | null;
}

export interface ReviewCodeResponse {
  success: true;
  challengeId: string;
  maskedPhone: string;
  expiresIn: number;
  retryAfter: number;
}

export interface ReviewSession {
  success: true;
  token?: string;
  expiresAt: string;
  maskedPhone: string;
  review: PublicProfileReview | null;
}

export type ReviewSmsStatus = "not_requested" | "subscribed" | "already_subscribed" | "unavailable" | "suppressed" | "consent_changed";

export interface ReviewSaveResponse {
  success: true;
  review: PublicProfileReview;
  smsStatus: ReviewSmsStatus;
}

/** Review blocks are lifted above links in both public and preview renderers. */
export function isCustomerReviewsBlock(block: { block_type: string; content: unknown }): boolean {
  return block.block_type === "text" && !!block.content && typeof block.content === "object"
    && (block.content as Record<string, unknown>).variant === "customer_reviews";
}
