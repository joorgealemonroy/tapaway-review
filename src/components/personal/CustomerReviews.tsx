import { useId, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ChevronDown, Loader2, ShieldCheck, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { PublicProfileReviews } from "@/lib/profileReviews";
import { validReview } from "@/lib/profileReviewClient";
import { PhoneVerifiedReviewForm } from "./PhoneVerifiedReviewForm";

const PAGE_SIZE = 3;
const SCORES = [1, 2, 3, 4, 5] as const;
interface Props { profileId: string; title?: string; accentColor?: string | null; isPreview?: boolean; }

function parseReviewsPage(value: unknown): PublicProfileReviews {
  if (!value || typeof value !== "object") throw new Error("Reviews unavailable");
  const page = value as PublicProfileReviews;
  if (typeof page.enabled !== "boolean" || !Number.isInteger(page.total) || page.total < 0
    || typeof page.has_more !== "boolean" || !Array.isArray(page.reviews)
    || (page.total === 0 ? page.average !== null : typeof page.average !== "number" || page.average < 1 || page.average > 5)
    || page.reviews.some(review => !validReview(review))) throw new Error("Reviews unavailable");
  return page;
}

function ReadOnlyStars({ rating }: { rating: number }) {
  return <span role="img" className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
    {SCORES.map(score => <Star key={score} className={`h-3.5 w-3.5 ${score <= rating ? "fill-amber-400 text-amber-600" : "fill-transparent text-gray-300"}`} aria-hidden="true" />)}
  </span>;
}

/** Anyone can read reviews; writing and later edits require a verified phone. */
export function CustomerReviews({ profileId, title = "Customer reviews", accentColor, isPreview = false }: Props) {
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  const heading = typeof title === "string" && title.trim() ? title.trim().slice(0, 120) : "Customer reviews";
  const query = useInfiniteQuery({
    queryKey: ["public-profile-reviews", profileId], initialPageParam: 0,
    enabled: !!profileId, staleTime: 30_000, refetchInterval: 60_000, retry: 1,
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
    seen.add(review.id); return true;
  });
  if (summary?.enabled === false) return null;

  return <section aria-labelledby={`${id}-heading`} className="w-full overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 text-left text-gray-900 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 id={`${id}-heading`} className="text-base font-bold">{heading}</h2>{summary && summary.total > 0 && <span className="text-xs font-medium text-gray-500">{summary.total.toLocaleString()} {summary.total === 1 ? "review" : "reviews"}</span>}</div>
    {query.isPending ? <p role="status" className="mt-3 flex items-center gap-2 text-sm text-gray-600"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Loading reviews…</p>
      : !summary ? <div className="mt-3 text-sm text-gray-600" role="status"><p>Reviews couldn’t load.</p><button type="button" className="mt-1 min-h-11 font-semibold text-gray-900 underline underline-offset-4" disabled={query.isFetching} onClick={() => void query.refetch()}>Try again</button></div>
      : <>
        {summary.total > 0 && summary.average !== null
          ? <div className="mt-2 flex items-center gap-2"><span className="text-2xl font-bold tabular-nums">{summary.average.toFixed(1)}<span className="ml-0.5 text-sm font-normal text-gray-500">/ 5</span></span><Star className="h-5 w-5 fill-amber-400 text-amber-600" aria-hidden="true" /><span className="sr-only">Average customer rating</span></div>
          : <p className="mt-2 text-sm text-gray-600">Be the first to leave a review.</p>}
        <PhoneVerifiedReviewForm key={profileId} profileId={profileId} accentColor={accentColor} isPreview={isPreview}
          onSaved={async () => { setExpanded(true); return !(await query.refetch()).isError; }} />
        {summary.total > 0 && <div className="mt-4 border-t border-gray-100 pt-1">
          <button type="button" aria-expanded={expanded} aria-controls={`${id}-reviews`} onClick={() => setExpanded(value => !value)} className="flex min-h-12 w-full items-center justify-between gap-3 text-sm font-semibold text-gray-900">{expanded ? "Customer reviews" : `Read ${summary.total === 1 ? "the review" : `all ${summary.total.toLocaleString()} reviews`}`}<ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true" /></button>
          {expanded && <div id={`${id}-reviews`} className="space-y-3 pt-1">
            {reviews.map(review => <article key={review.id} className="rounded-xl bg-gray-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs"><span className="font-semibold text-gray-700">Customer</span><time dateTime={review.created_at} className="text-gray-500">{new Date(review.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</time></div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2"><ReadOnlyStars rating={review.rating} /><span className="text-xs font-medium text-gray-600" aria-hidden="true">{review.rating}/5</span>{review.phone_verified === true && <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-800"><ShieldCheck className="h-3 w-3" aria-hidden="true" />Phone verified</span>}</div>
              {review.comment && <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-700">{review.comment}</p>}
              {review.updated_at && Date.parse(review.updated_at) > Date.parse(review.created_at) + 1000 && <p className="mt-1.5 text-[10px] text-gray-500">Edited {new Date(review.updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</p>}
            </article>)}
            {query.isFetchNextPageError && <p className="text-sm text-red-700" role="alert">More reviews couldn’t load. Please try again.</p>}
            {query.hasNextPage && <button type="button" className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-900 disabled:opacity-60" disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>{query.isFetchingNextPage ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Loading…</> : "Load more reviews"}</button>}
          </div>}
        </div>}
      </>}
  </section>;
}
