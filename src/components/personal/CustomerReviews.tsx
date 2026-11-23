import { useId, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { CheckCircle2, ChevronDown, Loader2, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { hubButtonColors } from "@/lib/hubLinkButtons";
import { PROFILE_REVIEW_COMMENT_MAX_LENGTH, type PublicProfileReviews, type SubmitProfileReviewArgs } from "@/lib/profileReviews";

const PAGE_SIZE = 3;
const COMMENT_LIMIT = PROFILE_REVIEW_COMMENT_MAX_LENGTH;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SCORES = [1, 2, 3, 4, 5] as const;

interface Props {
  profileId: string;
  title?: string;
  accentColor?: string | null;
  isPreview?: boolean;
}

function parseReviewsPage(value: unknown): PublicProfileReviews {
  if (!value || typeof value !== "object") throw new Error("Reviews unavailable");
  const page = value as PublicProfileReviews;
  if (typeof page.enabled !== "boolean" || !Number.isInteger(page.total) || page.total < 0
    || typeof page.has_more !== "boolean" || !Array.isArray(page.reviews)
    || (page.total === 0 ? page.average !== null : typeof page.average !== "number" || page.average < 1 || page.average > 5)
    || page.reviews.some(review => !review || typeof review.id !== "string" || !UUID.test(review.id)
      || !Number.isInteger(review.rating) || review.rating < 1 || review.rating > 5
      || (review.comment !== null && typeof review.comment !== "string")
      || typeof review.created_at !== "string" || !Number.isFinite(Date.parse(review.created_at)))) {
    throw new Error("Reviews unavailable");
  }
  return page;
}

function visitorForProfile(profileId: string): string {
  const key = `tapaway:review-visitor:${profileId}`;
  try {
    const saved = window.localStorage.getItem(key);
    if (saved && UUID.test(saved)) return saved;
    const visitor = crypto.randomUUID();
    window.localStorage.setItem(key, visitor);
    return visitor;
  } catch {
    // Browsers may block storage. A component-held ID still deduplicates retries.
    return crypto.randomUUID();
  }
}

function publicError(error: { code?: string; message?: string } | null): string {
  if (error?.message === "You can leave another review after 24 hours.") {
    return "You’ve already left a review in the last 24 hours. Refresh the reviews below to see it.";
  }
  const messages = new Set([
    "Reviews are unavailable for this hub.",
    "Choose a rating from 1 to 5.",
    "Keep your feedback to 600 characters or fewer.",
    "Refresh this page and try again.",
    "You can leave another review after 24 hours.",
    "Reviews are busy right now. Please try again later.",
  ]);
  return error?.message && messages.has(error.message)
    ? error.message : "We couldn’t save your review. Your feedback is still here—please try again.";
}

function ReadOnlyStars({ rating }: { rating: number }) {
  return <span role="img" className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
    {SCORES.map(score => <Star key={score} className={`h-3.5 w-3.5 ${score <= rating ? "fill-amber-400 text-amber-600" : "fill-transparent text-gray-300"}`} aria-hidden="true" />)}
  </span>;
}

/** Guest ratings and optional public comments; no contact details are collected. */
export function CustomerReviews({ profileId, title = "Customer reviews", accentColor, isPreview = false }: Props) {
  const formId = useId();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showSavedReviewCheck, setShowSavedReviewCheck] = useState(false);
  const [refreshError, setRefreshError] = useState(false);
  const visitor = useRef<string | null>(null);
  const attempt = useRef<{ id: string; rating: number; comment: string } | null>(null);
  const busy = useRef(false);
  const buttonColors = hubButtonColors(accentColor || "#005b32", false);
  const heading = typeof title === "string" && title.trim() ? title.trim().slice(0, 120) : "Customer reviews";
  const characterCount = Array.from(comment).length;

  const query = useInfiniteQuery({
    queryKey: ["public-profile-reviews", profileId],
    initialPageParam: 0,
    enabled: !!profileId,
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1,
    queryFn: async ({ pageParam, signal }) => {
      const { data, error } = await supabase.rpc("get_public_profile_reviews" as never, {
        p_profile_id: profileId, p_limit: PAGE_SIZE, p_offset: pageParam,
      } as never).abortSignal(signal);
      if (error) throw error;
      return parseReviewsPage(data);
    },
    getNextPageParam: (lastPage, pages) => lastPage.has_more
      ? pages.reduce((count, page) => count + page.reviews.length, 0) : undefined,
  });
  const summary = query.data?.pages[0];
  const seen = new Set<string>();
  const reviews = (query.data?.pages.flatMap(page => page.reviews) || []).filter(review => {
    if (seen.has(review.id)) return false;
    seen.add(review.id);
    return true;
  });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isPreview || busy.current || submitted || !summary?.enabled) return;
    if (!rating) { setSubmitError("Choose a rating from 1 to 5."); return; }
    if (characterCount > COMMENT_LIMIT) { setSubmitError("Keep your feedback to 600 characters or fewer."); return; }
    busy.current = true;
    setSending(true);
    setSubmitError(null);
    setShowSavedReviewCheck(false);
    try {
      visitor.current ||= visitorForProfile(profileId);
      const feedback = comment.trim();
      if (!attempt.current || attempt.current.rating !== rating || attempt.current.comment !== feedback) {
        attempt.current = { id: crypto.randomUUID(), rating, comment: feedback };
      }
      const payload: SubmitProfileReviewArgs = {
        p_profile_id: profileId, p_rating: rating, p_comment: feedback || null,
        p_visitor_id: visitor.current, p_submission_id: attempt.current.id,
      };
      const { data, error } = await supabase.rpc("submit_profile_review" as never, payload as never);
      if (error) {
        setSubmitError(publicError(error));
        setShowSavedReviewCheck(error.message === "You can leave another review after 24 hours.");
        return;
      }
      if (typeof data !== "string" || !UUID.test(data)) throw new Error("No saved review");
      setSubmitted(true);
      setExpanded(true);
      const refreshed = await query.refetch();
      setRefreshError(refreshed.isError);
    } catch {
      setSubmitError(publicError(null));
    } finally {
      busy.current = false;
      setSending(false);
    }
  };

  if (summary?.enabled === false) return null;

  return <section aria-labelledby={`${formId}-heading`} className="w-full overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 text-left text-gray-900 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 id={`${formId}-heading`} className="text-base font-bold">{heading}</h2>
      {summary && summary.total > 0 && <span className="text-xs font-medium text-gray-500">{summary.total.toLocaleString()} {summary.total === 1 ? "review" : "reviews"}</span>}
    </div>

    {query.isPending ? <p role="status" className="mt-3 flex items-center gap-2 text-sm text-gray-600"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Loading reviews…</p>
      : !summary ? <div className="mt-3 text-sm text-gray-600" role="status"><p>Reviews couldn’t load.</p><button type="button" className="mt-1 min-h-11 font-semibold text-gray-900 underline underline-offset-4" disabled={query.isFetching} onClick={() => void query.refetch()}>Try again</button></div>
      : <>
        {summary.total > 0 && summary.average !== null
          ? <div className="mt-2 flex items-center gap-2"><span className="text-2xl font-bold tabular-nums">{summary.average.toFixed(1)}<span className="ml-0.5 text-sm font-normal text-gray-500">/ 5</span></span><Star className="h-5 w-5 fill-amber-400 text-amber-600" aria-hidden="true" /><span className="sr-only">Average customer rating</span></div>
          : <p className="mt-2 text-sm text-gray-600">Be the first to leave a review.</p>}

        {submitted ? <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900" role="status">
          <p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />Thanks for your review!</p>
          <p className="mt-1">Your rating{comment.trim() ? " and feedback are" : " is"} now public.</p>
          {refreshError && <p className="mt-2">Your review was saved. <button type="button" className="min-h-11 font-semibold underline" onClick={async () => setRefreshError((await query.refetch()).isError)}>Refresh reviews</button></p>}
        </div> : <form onSubmit={event => void submit(event)} className="mt-4">
          <fieldset disabled={isPreview || sending}>
            <legend className="text-sm font-semibold">How was your meal?</legend>
            <p id={`${formId}-rating-hint`} className="mt-0.5 text-xs text-gray-500">{isPreview ? "Customers can tap a star to leave a review." : "Tap a star to rate. No sign-in needed."}</p>
            <div className="mt-2 grid max-w-[280px] grid-cols-5 gap-1" role="radiogroup" aria-label="Your rating" aria-describedby={`${formId}-rating-hint`}>
              {SCORES.map(score => <label key={score} className="relative min-w-0 cursor-pointer">
                <input type="radio" name={`${formId}-rating`} value={score} checked={rating === score} onChange={() => { setRating(score); setSubmitError(null); }} aria-label={`${score} ${score === 1 ? "star" : "stars"}`} className="peer sr-only" />
                <span className={`flex min-h-12 items-center justify-center rounded-xl border transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-emerald-700 ${score <= rating ? "border-amber-300 bg-amber-50" : "border-gray-200 bg-gray-50 hover:bg-gray-100"} ${isPreview || sending ? "cursor-default opacity-60" : ""}`}>
                  <Star className={`h-7 w-7 ${score <= rating ? "fill-amber-400 text-amber-600" : "text-gray-400"}`} aria-hidden="true" />
                </span>
              </label>)}
            </div>
            {rating > 0 && <div className="mt-3 space-y-2">
              <p className="text-xs font-medium text-gray-600" aria-live="polite">{rating} out of 5 stars selected</p>
              <label htmlFor={`${formId}-comment`} className="block text-sm font-semibold">Your feedback <span className="font-normal text-gray-500">(optional)</span></label>
              <textarea id={`${formId}-comment`} value={comment} onChange={event => setComment(event.target.value)} rows={3}
                placeholder="What did you enjoy? What could we improve?"
                aria-describedby={`${formId}-public-note ${formId}-count`}
                aria-invalid={characterCount > COMMENT_LIMIT}
                className="w-full resize-y rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-base leading-relaxed text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-700" />
              <div className="flex items-start justify-between gap-3 text-xs">
                <p id={`${formId}-public-note`} className="text-gray-500">Your rating and written feedback will be public.</p>
                <span id={`${formId}-count`} className={`shrink-0 tabular-nums ${characterCount > COMMENT_LIMIT ? "font-semibold text-red-700" : "text-gray-500"}`}>{characterCount}/{COMMENT_LIMIT}</span>
              </div>
              <button type="submit" disabled={sending || characterCount > COMMENT_LIMIT} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60" style={{ backgroundColor: buttonColors.background, color: buttonColors.color }}>
                {sending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}{sending ? "Posting review…" : "Post review"}
              </button>
            </div>}
          </fieldset>
          {submitError && <p className="mt-3 text-sm text-red-700" role="alert">{submitError}</p>}
          {showSavedReviewCheck && <button type="button" disabled={query.isFetching} className="mt-1 min-h-11 text-sm font-semibold text-gray-900 underline underline-offset-4 disabled:opacity-60" onClick={() => { setExpanded(true); void query.refetch(); }}>Refresh reviews</button>}
        </form>}

        {summary.total > 0 && <div className="mt-4 border-t border-gray-100 pt-1">
          <button type="button" aria-expanded={expanded} aria-controls={`${formId}-reviews`} onClick={() => setExpanded(value => !value)} className="flex min-h-12 w-full items-center justify-between gap-3 text-sm font-semibold text-gray-900">
            {expanded ? "Customer reviews" : `Read ${summary.total === 1 ? "the review" : `all ${summary.total.toLocaleString()} reviews`}`}<ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
          {expanded && <div id={`${formId}-reviews`} className="space-y-3 pt-1">
            {reviews.map(review => <article key={review.id} className="rounded-xl bg-gray-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs"><span className="font-semibold text-gray-700">Customer</span><time dateTime={review.created_at} className="text-gray-500">{new Date(review.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</time></div>
              <div className="mt-1.5 flex items-center gap-2"><ReadOnlyStars rating={review.rating} /><span className="text-xs font-medium text-gray-600" aria-hidden="true">{review.rating}/5</span></div>
              {review.comment && <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-700">{review.comment}</p>}
            </article>)}
            {query.isFetchNextPageError && <p className="text-sm text-red-700" role="alert">More reviews couldn’t load. Please try again.</p>}
            {query.hasNextPage && <button type="button" className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-900 disabled:opacity-60" disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>{query.isFetchingNextPage ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Loading…</> : "Load more reviews"}</button>}
          </div>}
        </div>}
      </>}
  </section>;
}
