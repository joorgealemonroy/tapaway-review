/** First-party reviews collected on an explicitly enabled public hub. */
export const PROFILE_REVIEW_COMMENT_MAX_LENGTH = 600;

export interface PublicProfileReview {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
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

/** Review blocks are lifted above links in both public and preview renderers. */
export function isCustomerReviewsBlock(block: { block_type: string; content: unknown }): boolean {
  return block.block_type === "text" && !!block.content && typeof block.content === "object"
    && (block.content as Record<string, unknown>).variant === "customer_reviews";
}
