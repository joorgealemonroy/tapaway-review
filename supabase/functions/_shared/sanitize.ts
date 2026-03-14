/**
 * HTML escape utility for edge functions.
 * Prevents HTML injection in email templates.
 */

const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * Escape HTML special characters to prevent injection in email templates.
 */
export function escapeHtml(str: string | null | undefined): string {
  if (!str) return "";
  return String(str).replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char] || char);
}

/**
 * Sanitize user text: trim, enforce max length, escape HTML.
 */
export function sanitizeText(str: string | null | undefined, maxLen = 2000): string {
  if (!str) return "";
  return escapeHtml(String(str).trim().slice(0, maxLen));
}

/**
 * Validate that no field in a record exceeds maxLen characters.
 * Returns the first offending field name, or null if all pass.
 */
export function validateFieldLengths(
  fields: Record<string, unknown>,
  maxLen = 2000
): string | null {
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === "string" && value.length > maxLen) {
      return key;
    }
  }
  return null;
}
