import { z } from "zod";

/**
 * URL validation schemas to prevent phishing attacks
 * Only allow URLs from trusted domains for review platforms
 */
export const urlValidationSchemas = {
  google: z.string()
    .optional()
    .refine(
      (val) => !val || val === "" || /^https:\/\/search\.google\.com\/local\/writereview\?placeid=/.test(val),
      "Google review URL must start with https://search.google.com/local/writereview?placeid="
    ),
  
  yelp: z.string()
    .optional()
    .refine(
      (val) => !val || val === "" || /^https:\/\/(www\.)?yelp\.(com|ca)\//.test(val),
      "Yelp URL must be from yelp.com or yelp.ca"
    ),
  
  instagram: z.string()
    .optional()
    .transform((val) => {
      if (!val || val === "") return val;
      // If it's already a deep link, return as-is
      if (val.startsWith('instagram://')) {
        return val;
      }
      // If it's a web URL, extract username and convert to deep link
      if (val.startsWith('http://') || val.startsWith('https://')) {
        const username = val.replace(/^https?:\/\/(www\.)?instagram\.com\/@?/, "").split("/")[0];
        return `instagram://user?username=${username}`;
      }
      // If it's just a username, convert to deep link
      // Remove @ symbol if present
      const username = val.replace(/^@/, '').trim();
      return `instagram://user?username=${username}`;
    })
    .refine(
      (val) => !val || val === "" || /^instagram:\/\/user\?username=[\w.]+$/.test(val),
      "Instagram must be a valid username"
    ),
  
  directions: z.string()
    .optional()
    .refine(
      (val) => !val || val === "" || /^https:\/\/maps\.(apple|google)\.com\//.test(val),
      "Directions URL must be from maps.apple.com or maps.google.com"
    ),
};

/**
 * Validate a URL against a specific schema
 */
export const validateUrl = (url: string | null, type: keyof typeof urlValidationSchemas): { valid: boolean; error?: string } => {
  if (!url || url === "") return { valid: true };
  
  const schema = urlValidationSchemas[type];
  const result = schema.safeParse(url);
  
  if (!result.success) {
    return { valid: false, error: result.error.errors[0]?.message };
  }
  
  return { valid: true };
};

/**
 * Validate all URLs at once
 */
export const validateAllUrls = (urls: {
  google?: string | null;
  yelp?: string | null;
  instagram?: string | null;
  directions?: string | null;
}): { valid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  
  const googleResult = validateUrl(urls.google || "", "google");
  if (!googleResult.valid) errors.google = googleResult.error!;
  
  const yelpResult = validateUrl(urls.yelp || "", "yelp");
  if (!yelpResult.valid) errors.yelp = yelpResult.error!;
  
  const instagramResult = validateUrl(urls.instagram || "", "instagram");
  if (!instagramResult.valid) errors.instagram = instagramResult.error!;
  
  const directionsResult = validateUrl(urls.directions || "", "directions");
  if (!directionsResult.valid) errors.directions = directionsResult.error!;
  
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};
