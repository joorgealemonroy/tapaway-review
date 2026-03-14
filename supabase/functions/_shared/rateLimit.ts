/**
 * Shared in-memory rate limiter for edge functions.
 * Resets when the function cold-starts.
 */

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

/**
 * Check if a request is within the rate limit.
 * @returns true if allowed, false if rate limited.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}

/**
 * Build a rate limit key from the request IP + a suffix.
 */
export function getRateLimitKey(req: Request, suffix: string): string {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  return `${ip}:${suffix}`;
}

/**
 * Standard 429 response for rate-limited requests.
 */
export function rateLimitResponse(corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ error: "Too many requests. Please try again later." }),
    { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
