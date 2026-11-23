import { useEffect, useId, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ChevronDown, Loader2, ShieldCheck, Star } from "lucide-react";
import { hubButtonColors } from "@/lib/hubLinkButtons";
import { getSafeExternalUrl } from "@/lib/sanitizeUrl";
import { PROFILE_REVIEW_COMMENT_MAX_LENGTH, type ReviewCodeResponse, type ReviewConfig, type ReviewSaveResponse, type ReviewSession, type ReviewSmsStatus } from "@/lib/profileReviews";
import { clearReviewSession, normalizeReviewPhone, persistReviewSession, readReviewSessionToken, requestProfileReview, ReviewRequestError, validReview, validReviewSession } from "@/lib/profileReviewClient";

interface Props { profileId: string; accentColor?: string | null; isPreview?: boolean; onSaved: () => Promise<boolean>; }
type VerifiedSession = ReviewSession & { token: string };
type Step = "compose" | "phone" | "code" | "verified" | "saved";
const SCORES = [1, 2, 3, 4, 5] as const;
const COMMENT_LIMIT = PROFILE_REVIEW_COMMENT_MAX_LENGTH;
const inputClass = "w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-base leading-relaxed text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-700 disabled:opacity-60";

/** Phone verification identifies the review editor, independently of optional offers. */
export function PhoneVerifiedReviewForm({ profileId, accentColor, isPreview = false, onSaved }: Props) {
  const id = useId();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [noteExpanded, setNoteExpanded] = useState(false);
  const [offersExpanded, setOffersExpanded] = useState(false);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<Step>("compose");
  const [editIntent, setEditIntent] = useState(false);
  const [challenge, setChallenge] = useState<ReviewCodeResponse | null>(null);
  const [session, setSession] = useState<VerifiedSession | null>(null);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [smsStatus, setSmsStatus] = useState<ReviewSmsStatus>("not_requested");
  const [refreshError, setRefreshError] = useState(false);
  const [resendAt, setResendAt] = useState(0);
  const [clock, setClock] = useState(() => Date.now());
  const lock = useRef(false);
  const verificationAttempt = useRef<string | null>(null);
  const saveAttempt = useRef<{ id: string; fingerprint: string } | null>(null);
  const preserveDraftOnVerify = useRef(false);
  const buttonColors = hubButtonColors(accentColor || "#005b32", false);
  const buttonStyle = { backgroundColor: buttonColors.background, color: buttonColors.color };
  const characterCount = Array.from(comment).length;

  const configQuery = useQuery({
    queryKey: ["profile-review-config", profileId], enabled: !!profileId, staleTime: 60_000, retry: 1,
    queryFn: () => requestProfileReview<ReviewConfig>({ action: "config", profileId }),
  });
  const config = configQuery.data;
  const sms = config?.sms;
  const termsUrl = getSafeExternalUrl(sms?.termsUrl);
  const privacyUrl = getSafeExternalUrl(sms?.privacyUrl);
  const offersAvailable = !!(sms?.available && sms.consentText && sms.consentVersion > 0
    && termsUrl?.startsWith("https://") && privacyUrl?.startsWith("https://"));
  const canVerify = config?.enabled === true && config.phoneVerification === true && config.verificationAvailable === true
    && config.otpConsentVersion > 0 && typeof config.otpConsentText === "string" && config.otpConsentText.trim().length > 0;
  const resendWait = Math.max(0, Math.ceil((resendAt - clock) / 1000));
  const showDraft = step === "compose" || step === "verified";

  useEffect(() => {
    if (!resendAt) return;
    const interval = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [resendAt]);

  useEffect(() => {
    if (isPreview) return;
    const token = readReviewSessionToken(profileId);
    if (!token) return;
    let canceled = false;
    setRestoring(true);
    void requestProfileReview<ReviewSession>({ action: "session", profileId, token }).then(value => {
      if (canceled) return;
      if (!validReviewSession(value)) throw new ReviewRequestError("Please verify your phone again.", "SESSION_EXPIRED");
      setSession({ ...value, token });
      if (value.review) { setRating(value.review.rating); setComment(value.review.comment || ""); setStep("saved"); }
      persistReviewSession(profileId, token, value.expiresAt);
    }).catch(problem => {
      if (canceled) return;
      if (problem instanceof ReviewRequestError && problem.code === "SESSION_EXPIRED") clearReviewSession(profileId);
    }).finally(() => { if (!canceled) setRestoring(false); });
    return () => { canceled = true; };
  }, [profileId, isPreview]);

  const start = () => {
    if (isPreview || lock.current) return false;
    lock.current = true; setBusy(true); setError(null); setNotice(null);
    return true;
  };
  const finish = () => { lock.current = false; setBusy(false); };
  const failed = (problem: unknown) => {
    if (problem instanceof ReviewRequestError && problem.code === "SESSION_EXPIRED") {
      preserveDraftOnVerify.current = true;
      clearReviewSession(profileId); setSession(null); setChallenge(null); setCode(""); setStep("phone");
      setResendAt(0); verificationAttempt.current = null;
      setError("Please verify your phone again to save your review.");
    } else setError(problem instanceof Error ? problem.message : "We couldn’t complete that step. Please try again.");
  };

  const sendCode = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!canVerify || resendWait > 0 || !start()) return;
    try {
      const normalized = normalizeReviewPhone(phone);
      if (!normalized) { setError("Enter a valid mobile number. Include the country code for numbers outside the US or Canada."); return; }
      const value = await requestProfileReview<ReviewCodeResponse>({ action: "request_code", profileId, phone: normalized,
        otpConsent: true, otpConsentVersion: config.otpConsentVersion });
      if (value.success !== true || typeof value.challengeId !== "string" || typeof value.maskedPhone !== "string") {
        throw new Error("We couldn’t send the code. Please try again.");
      }
      setChallenge(value); setCode(""); verificationAttempt.current = crypto.randomUUID(); setStep("code");
      const now = Date.now(); setClock(now); setResendAt(now + Math.max(0, value.retryAfter || 60) * 1000);
    } catch (problem) { failed(problem); }
    finally { finish(); }
  };

  const verifyCode = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!challenge || !start()) return;
    try {
      if (!/^\d{6}$/.test(code)) { setError("Enter the 6-digit code from the text message."); return; }
      verificationAttempt.current ||= crypto.randomUUID();
      const value = await requestProfileReview<ReviewSession>({ action: "verify_code", profileId,
        challengeId: challenge.challengeId, code, verificationId: verificationAttempt.current });
      if (!validReviewSession(value) || typeof value.token !== "string" || value.token.length < 32) {
        throw new Error("We couldn’t confirm verification. Please try again.");
      }
      setSession({ ...value, token: value.token }); persistReviewSession(profileId, value.token, value.expiresAt);
      setCode(""); setChallenge(null); setStep("verified"); saveAttempt.current = null;
      if (value.review) {
        const keepComposeDraft = !editIntent && rating > 0;
        if (!preserveDraftOnVerify.current && !keepComposeDraft) {
          setRating(value.review.rating); setComment(value.review.comment || "");
          setNoteExpanded(!!value.review.comment);
        }
        setEditIntent(true);
        setNotice(preserveDraftOnVerify.current ? "Phone verified again. Your unsaved changes are ready."
          : keepComposeDraft ? "You’ve reviewed with this number before. Saving will update your review." : "Your previous review is ready to edit.");
      } else if (editIntent) { setEditIntent(false); setNotice("There’s no review for this number yet. You can write one now."); }
      preserveDraftOnVerify.current = false;
    } catch (problem) { failed(problem); }
    finally { finish(); }
  };

  const saveReview = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session || config?.enabled !== true || !start()) return;
    try {
      if (rating < 1 || rating > 5) { setError("Choose a rating from 1 to 5."); return; }
      if (characterCount > COMMENT_LIMIT) { setError("Keep your feedback to 600 characters or fewer."); return; }
      const feedback = comment.trim() || null;
      const consent = marketingConsent && offersAvailable;
      const fingerprint = JSON.stringify([rating, feedback, consent, consent ? sms.consentVersion : null]);
      if (!saveAttempt.current || saveAttempt.current.fingerprint !== fingerprint) saveAttempt.current = { id: crypto.randomUUID(), fingerprint };
      const value = await requestProfileReview<ReviewSaveResponse>({ action: "save", profileId, token: session.token,
        rating, comment: feedback, submissionId: saveAttempt.current.id, marketingConsent: consent,
        ...(consent ? { consentVersion: sms.consentVersion } : {}) });
      if (value.success !== true || !validReview(value.review) || value.review.phone_verified !== true) {
        throw new Error("We couldn’t confirm your review was saved. Your feedback is still here—please try again.");
      }
      setSavedMessage(session.review ? "Your review has been updated." : "Thanks for your review!");
      setSession({ ...session, review: value.review }); setRating(value.review.rating); setComment(value.review.comment || "");
      setSmsStatus(value.smsStatus); setMarketingConsent(false); setOffersExpanded(false); setStep("saved");
      setRefreshError(!(await onSaved()));
      if (value.smsStatus === "consent_changed") void configQuery.refetch();
    } catch (problem) { failed(problem); }
    finally { finish(); }
  };

  const editReview = () => {
    if (isPreview || lock.current) return;
    setError(null); setNotice(null); setSavedMessage(null); setMarketingConsent(false); setOffersExpanded(false); saveAttempt.current = null;
    preserveDraftOnVerify.current = false;
    setEditIntent(true);
    if (session && Date.parse(session.expiresAt) > Date.now()) {
      if (session.review) { setRating(session.review.rating); setComment(session.review.comment || ""); setNoteExpanded(!!session.review.comment); }
      setStep("verified");
    } else { setSession(null); setChallenge(null); setCode(""); setStep("phone"); }
  };
  const changeNumber = () => {
    if (isPreview || lock.current) return;
    clearReviewSession(profileId); setSession(null); setChallenge(null); setCode(""); setPhone("");
    setMarketingConsent(false); setOffersExpanded(false); setStep("phone"); setResendAt(0); setError(null); setSavedMessage(null);
    verificationAttempt.current = null; saveAttempt.current = null;
    preserveDraftOnVerify.current = false;
  };

  const continueReview = () => {
    if (isPreview || busy || restoring || rating < 1 || characterCount > COMMENT_LIMIT) return;
    setError(null); setNotice(null);
    setStep(session ? "verified" : challenge ? "code" : "phone");
  };
  const editDraft = () => {
    if (isPreview || busy) return;
    setEditIntent(false); setError(null); setNotice(null); setStep("compose");
  };

  const offers = offersAvailable && <div className="border-t border-gray-100">
    <button type="button" onClick={() => setOffersExpanded(value => !value)} disabled={isPreview || busy}
      aria-expanded={offersExpanded} aria-controls={`${id}-offers-panel`}
      className="flex min-h-11 w-full items-center justify-between gap-3 text-left text-xs font-medium text-gray-600">
      <span>{marketingConsent ? "Messages & offers selected" : "Messages & offers (optional)"}</span>
      <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${offersExpanded ? "rotate-180" : ""}`} aria-hidden="true" />
    </button>
    {offersExpanded && <div id={`${id}-offers-panel`} className="rounded-xl bg-gray-50 px-3 pb-3">
      <label className="flex min-h-11 cursor-pointer items-start gap-2.5 py-2">
        <input type="checkbox" checked={marketingConsent} onChange={event => setMarketingConsent(event.target.checked)} disabled={isPreview || busy}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300" style={{ accentColor: buttonColors.background }}
          aria-describedby={`${id}-offers-disclosure`} />
        <span className="text-xs font-medium leading-5 text-gray-800">Send me {sms.brandName} messages & offers <span className="font-normal text-gray-500">(optional)</span></span>
      </label>
      <p id={`${id}-offers-disclosure`} className="text-xs leading-relaxed text-gray-600">{sms.consentText}{" "}
        <a href={termsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-8 items-center font-medium underline underline-offset-2">Terms</a>{" · "}
        <a href={privacyUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-8 items-center font-medium underline underline-offset-2">Privacy</a>
      </p>
    </div>}
  </div>;
  const verificationDisclosure = <div className="text-xs leading-relaxed text-gray-600">
    {config?.otpConsentText && <p>{config.otpConsentText}</p>}
    <p><a href="/terms#review-verification" target="_blank" rel="noopener noreferrer" aria-label="Phone verification terms" className="inline-flex min-h-8 items-center font-medium underline underline-offset-2">Terms</a>{" · "}
      <a href="/privacy#review-verification" target="_blank" rel="noopener noreferrer" aria-label="Phone verification privacy policy" className="inline-flex min-h-8 items-center font-medium underline underline-offset-2">Privacy</a></p>
  </div>;

  if (config?.enabled === false) return null;
  return <div className="mt-4">
    {restoring && <p className="mb-3 flex items-center gap-2 text-xs text-gray-500" role="status"><Loader2 className="h-3.5 w-3.5 animate-spin" />Checking your saved review…</p>}
    {session && <div className="mb-3 flex flex-wrap items-center justify-between gap-1">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800"><ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />Phone verified</span>
      <button type="button" disabled={busy || isPreview} onClick={changeNumber} className="min-h-9 text-xs text-gray-500 underline underline-offset-2">Use a different number</button>
    </div>}

    {step === "saved" && session?.review ? <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">
      <p className="flex items-center gap-2 font-semibold" role="status"><CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />{savedMessage || "Your review"}</p>
      <p className="mt-1"><span className="font-semibold">{session.review.rating}/5</span>{session.review.comment ? ` · ${session.review.comment}` : " · Rating only"}</p>
      {(smsStatus === "subscribed" || smsStatus === "already_subscribed") && <p className="mt-2 text-xs">Your messages and offers preference is saved.</p>}
      {smsStatus === "suppressed" && <p className="mt-2 text-xs">Your review is saved. Messages and offers remain off because this number previously opted out.</p>}
      {["unavailable", "consent_changed"].includes(smsStatus) && <p className="mt-2 text-xs">Your review is saved. Messages and offers weren’t enabled; you can try that option again later.</p>}
      <button type="button" onClick={editReview} disabled={busy || isPreview} className="mt-2 min-h-11 font-semibold underline underline-offset-4">Edit my review</button>
      {refreshError && <p className="mt-1 text-xs">Your review was saved. <button type="button" className="min-h-11 font-semibold underline" onClick={async () => setRefreshError(!(await onSaved()))}>Refresh reviews</button></p>}
    </div> : <>
      {showDraft && <fieldset disabled={isPreview || busy || restoring}>
        <legend className="text-sm font-semibold">{session?.review ? "Edit your review" : "How was your meal?"}</legend>
        <p id={`${id}-rating-hint`} className="mt-0.5 text-xs text-gray-500">Tap a star to rate. Your phone number stays private.</p>
        <div className="mt-2 grid max-w-[280px] grid-cols-5 gap-1" role="radiogroup" aria-label="Your rating" aria-describedby={`${id}-rating-hint`}>
          {SCORES.map(score => <label key={score} className="relative min-w-0 cursor-pointer">
            <input type="radio" name={`${id}-rating`} value={score} checked={rating === score} onChange={() => { setRating(score); setError(null); }} aria-label={`${score} ${score === 1 ? "star" : "stars"}`} className="peer sr-only" />
            <span className={`flex min-h-12 items-center justify-center rounded-xl border transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-emerald-700 ${score <= rating ? "border-amber-300 bg-amber-50" : "border-gray-200 bg-gray-50 hover:bg-gray-100"} ${isPreview || busy ? "opacity-60" : ""}`}>
              <Star className={`h-7 w-7 ${score <= rating ? "fill-amber-400 text-amber-600" : "text-gray-400"}`} aria-hidden="true" />
            </span>
          </label>)}
        </div>
        {rating > 0 && <div className="mt-1">
          <p className="sr-only" aria-live="polite">{rating} out of 5 stars selected</p>
          <button type="button" onClick={() => setNoteExpanded(value => !value)} aria-expanded={noteExpanded} aria-controls={`${id}-note-panel`}
            className="flex min-h-11 w-full items-center justify-between gap-3 text-left text-xs font-medium text-gray-600">
            <span>{comment.trim() ? "Edit note (optional)" : "Add a note (optional)"}</span>
            <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${noteExpanded ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
          {noteExpanded ? <div id={`${id}-note-panel`} className="space-y-1.5">
            <label htmlFor={`${id}-comment`} className="sr-only">Your feedback (optional)</label>
            <textarea id={`${id}-comment`} value={comment} onChange={event => setComment(event.target.value)} rows={2} placeholder="Anything you’d like to add?"
              aria-describedby={`${id}-public-note ${id}-count`} aria-invalid={characterCount > COMMENT_LIMIT} className={inputClass + " resize-y"} />
            <div className="flex items-start justify-between gap-3 text-xs"><p id={`${id}-public-note`} className="text-gray-500">Your review will be public.</p><span id={`${id}-count`} className={`shrink-0 tabular-nums ${characterCount > COMMENT_LIMIT ? "font-semibold text-red-700" : "text-gray-500"}`}>{characterCount}/{COMMENT_LIMIT}</span></div>
          </div> : comment.trim() && <p className="line-clamp-2 break-words text-sm text-gray-600">{comment}</p>}
          {!noteExpanded && characterCount > COMMENT_LIMIT && <p className="text-xs text-red-700" role="alert">Keep your note to {COMMENT_LIMIT} characters or fewer.</p>}
        </div>}
      </fieldset>}

      {step === "compose" && rating > 0 && <div className="mt-3">
        <button type="button" onClick={continueReview} disabled={isPreview || busy || restoring || characterCount > COMMENT_LIMIT}
          className="flex min-h-11 w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60" style={buttonStyle}>Continue</button>
        <p className="mt-1.5 text-center text-xs text-gray-500">{session ? "Review your details before posting." : "Verify your phone next. Your review will be public."}</p>
      </div>}

      {!showDraft && rating > 0 && <div className="flex items-start justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2">
        <div className="min-w-0 text-sm text-gray-700"><span className="font-semibold">{rating}/5</span><span className="text-xs text-gray-500"> · Your rating</span>{comment.trim() && <p className="mt-0.5 line-clamp-2 break-words text-xs text-gray-600">{comment}</p>}</div>
        <button type="button" onClick={editDraft} disabled={isPreview || busy} aria-label="Edit rating or note" className="-my-1 flex min-h-9 shrink-0 items-center text-xs font-medium text-gray-600 underline underline-offset-2">Edit</button>
      </div>}

      {step !== "compose" && (rating > 0 || editIntent) && <div className="mt-3 space-y-3">
        {!config && <p className="text-xs text-gray-500" role="status">{configQuery.isPending ? "Preparing phone verification…" : "Phone verification couldn’t load."}{configQuery.isError && <button type="button" className="ml-1 min-h-9 font-semibold underline" onClick={() => void configQuery.refetch()}>Try again</button>}</p>}

        {!session && step === "phone" && <form onSubmit={event => void sendCode(event)} className="space-y-3">
          <div><label htmlFor={`${id}-phone`} className="mb-1.5 block text-sm font-semibold">Mobile number</label><input id={`${id}-phone`} type="tel" inputMode="tel" autoComplete="tel" maxLength={30} value={phone} onChange={event => setPhone(event.target.value)} placeholder="(555) 123-4567" disabled={isPreview || busy || restoring} className={inputClass} aria-describedby={`${id}-phone-note`} /><p id={`${id}-phone-note`} className="mt-1 text-xs text-gray-500">Verify to post and edit later. Your number stays private.</p></div>
          {offers}
          {verificationDisclosure}
          <button type="submit" disabled={isPreview || busy || restoring || !canVerify || !normalizeReviewPhone(phone) || resendWait > 0} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60" style={buttonStyle}>{busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}{busy ? "Sending code…" : "Send code"}</button>
          {config && !canVerify && <p className="text-xs text-gray-500" role="status">Text verification is currently unavailable.</p>}
        </form>}

        {!session && step === "code" && challenge && <form onSubmit={event => void verifyCode(event)} className="space-y-3">
          <div><label htmlFor={`${id}-code`} className="mb-1.5 block text-sm font-semibold">Verification code</label><p className="mb-2 text-xs text-gray-500">Enter the 6-digit code sent to {challenge.maskedPhone}.</p><input id={`${id}-code`} type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" disabled={isPreview || busy} className={inputClass + " tracking-[0.25em] tabular-nums"} /></div>
          <button type="submit" disabled={isPreview || busy || !/^\d{6}$/.test(code)} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-60" style={buttonStyle}>{busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}{busy ? "Verifying…" : "Verify phone"}</button>
          <div className="flex flex-wrap items-center justify-between gap-2"><button type="button" onClick={() => void sendCode()} disabled={isPreview || busy || resendWait > 0} className="min-h-11 text-xs font-medium text-gray-600 underline underline-offset-2 disabled:no-underline disabled:opacity-60">{resendWait > 0 ? `Resend code in ${resendWait}s` : "Resend code"}</button><button type="button" onClick={changeNumber} disabled={isPreview || busy} className="min-h-11 text-xs font-medium text-gray-600 underline underline-offset-2">Change number</button></div>
        </form>}

        {session && <form onSubmit={event => void saveReview(event)} className="space-y-3">
          {offers}
          <button type="submit" disabled={isPreview || busy || rating < 1 || characterCount > COMMENT_LIMIT || config?.enabled !== true} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60" style={buttonStyle}>{busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}{busy ? "Saving review…" : session.review ? "Save changes" : "Post review"}</button>
          <p className="text-center text-xs text-gray-500">Your review will be public.</p>
        </form>}
      </div>}
      {notice && <p className="mt-3 text-xs text-gray-600" role="status">{notice}</p>}
      {error && <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>}
      {!session && !editIntent && step === "compose" && rating === 0 && <button type="button" onClick={editReview} disabled={isPreview || busy || restoring} className="mt-2 min-h-11 text-xs font-medium text-gray-600 underline underline-offset-2">Edit my review</button>}
    </>}
  </div>;
}
