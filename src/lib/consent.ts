/** Explicit optional advertising/returning-visitor consent. No checkout implies acceptance. */
export type ConsentState = "pending" | "accepted" | "declined";
export const CONSENT_NOTICE_VERSION = "2026-10-14";
export const CONSENT_NOTICE = "Allow Meta (Facebook and Instagram) and Trybe to receive page visits, device and referral information for advertising measurement, ad optimization, retargeting and creator attribution. Allow TapAway to remember a returning-visitor identifier for first-party analytics. Checkout contact information is not advertising consent. You can decline or change your choice in Cookie settings. Server advertising reports are disabled until revocable server consent records are available.";
const STORAGE_KEY = "tapaway_tracking_consent_v2";
const DENIED_FALLBACK = "tapaway_tracking_declined";
type ConsentRecord = { state: "accepted" | "declined"; visitor: string; at: string; noticeVersion: string; notice: string; previousAcceptance?: { at: string; noticeVersion: string; notice: string } };
const listeners = new Set<(state: ConsentState) => void>();

function readRecord(): ConsentRecord | null {
  try {
    const record = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (record?.noticeVersion === CONSENT_NOTICE_VERSION && typeof record.visitor === "string"
      && typeof record.at === "string" && (record.state === "accepted" || record.state === "declined")) return record;
  } catch { /* Unknown/storage-blocked consent fails closed. */ }
  return null;
}
function readState(): ConsentState {
  if (typeof window !== "undefined" && window.name === DENIED_FALLBACK) return "declined";
  return readRecord()?.state ?? "pending";
}
let current: ConsentState = readState();
export function getConsent(): ConsentState { return current; }
export function consentAllowsTracking(): boolean { return getConsent() === "accepted"; }
function notify() { listeners.forEach((listener) => listener(current)); }

export function setConsent(state: "accepted" | "declined"): void {
  const old = readRecord();
  const previousAcceptance = old?.state === "accepted"
    ? { at: old.at, noticeVersion: old.noticeVersion, notice: old.notice }
    : old?.previousAcceptance;
  const record: ConsentRecord = { state, visitor: old?.visitor || crypto.randomUUID(), at: new Date().toISOString(),
    noticeVersion: CONSENT_NOTICE_VERSION, notice: CONSENT_NOTICE, ...(previousAcceptance ? { previousAcceptance } : {}) };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    if (window.name === DENIED_FALLBACK) window.name = "";
    current = state;
  } catch {
    // Do not load SDKs without durable choice evidence. A denial survives SDK reload
    // even if both browser storage mechanisms are blocked; this name contains no ID.
    current = "declined";
    window.name = DENIED_FALLBACK;
  }
  notify();
}
export function onConsentChange(listener: (state: ConsentState) => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function openConsentSettings(): void {
  window.dispatchEvent(new Event("tapaway:open-consent-settings"));
}
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    current = readState();
    notify();
  });
}