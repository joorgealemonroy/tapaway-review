/** Redirects after login stay on this application, including control-character edge cases. */
export function safeInternalPath(value: unknown, fallback = "/dashboard"): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\u0000-\u0020\u007f\\]/.test(value)) return fallback;
  try {
    const url = new URL(value, "https://tapaway.invalid");
    if (url.origin !== "https://tapaway.invalid" || url.username || url.password) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch { return fallback; }
}

/** Crash reports must not copy auth links, checkout references or credentials. */
export function redactDiagnostic(value: unknown): string {
  const text = typeof value === "string" ? value : value instanceof Error ? value.message : "Unknown error";
  return text
    .replace(/(?:https?:\/\/|\/)[^\s"'<>]*[?#][^\s"'<>]*/gi, url => `${url.split(/[?#]/)[0]}?[redacted]`)
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[redacted token]")
    .replace(/\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]+\b/g, "[redacted key]")
    .replace(/(["']?(?:access_token|refresh_token|token_hash|token|session_id|pf_key|password|secret|authorization)["']?\s*[:=]\s*)(?:"[^"\r\n]*"|'[^'\r\n]*'|[^\s&,;}]+)/gi, "$1[redacted]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted email]");
}

/** Only the route path is useful to support; query strings can be bearer credentials. */
export function diagnosticRoute(): string {
  return typeof window === "undefined" ? "/" : window.location.pathname;
}

/** Keep a token only in memory once an auth screen has captured it. */
export function clearAuthUrlCredentials(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  for (const key of ["token", "token_hash", "access_token", "refresh_token", "code", "error_description"]) url.searchParams.delete(key);
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  if (["access_token", "refresh_token", "token_hash", "token", "error", "error_description"].some(key => hash.has(key))) url.hash = "";
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}
