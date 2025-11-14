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
    .refine(
      (val) => !val || val === "" || /^https:\/\/(www\.)?instagram\.com\//.test(val),
      "Instagram URL must be from instagram.com"
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
