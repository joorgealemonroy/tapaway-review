/**
 * Shared display-name resolution for admin surfaces.
 *
 * Falls back through every human-readable field before ever showing
 * "(unnamed)" — a slug or username is humanized instead
 * (e.g. "elchilitos-mexican-restaurant" -> "Elchilitos Mexican Restaurant").
 */

export interface DisplayNameSource {
  business_name?: string | null;
  full_name?: string | null;
  display_name?: string | null;
  title?: string | null;
  username?: string | null;
  slug?: string | null;
}

const EMPTY_NAME_VALUES = new Set(["(unnamed)", "unnamed", "n/a", "null", "undefined"]);

const clean = (v?: string | null) => {
  const value = typeof v === "string" ? v.trim() : "";
  return EMPTY_NAME_VALUES.has(value.toLowerCase()) ? "" : value;
};

const BUSINESS_WORDS = [
  "restaurant",
  "collective",
  "company",
  "roasting",
  "mediterranean",
  "italian",
  "mexican",
  "peruvian",
  "chophouse",
  "kitchen",
  "cantina",
  "coffee",
  "bakery",
  "salon",
  "spa",
  "grill",
  "cafe",
  "house",
  "arts",
  "craft",
  "ales",
  "bar",
  "co",
];

const splitCompactHandle = (value: string) => {
  let result = value;
  BUSINESS_WORDS.forEach((word) => {
    result = result.replace(new RegExp(`(${word})`, "gi"), " $1 ");
  });
  return result;
};

export const humanizeSlug = (raw?: string | null): string => {
  const s = clean(raw).replace(/^@/, "");
  if (!s) return "";
  return splitCompactHandle(s)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

export const resolveDisplayName = (source: DisplayNameSource): string => {
  const direct =
    clean(source.business_name) ||
    clean(source.full_name) ||
    clean(source.display_name) ||
    clean(source.title);
  if (direct) return direct;

  const humanized = humanizeSlug(source.slug) || humanizeSlug(source.username);
  if (humanized) return humanized;

  return "(unnamed)";
};
