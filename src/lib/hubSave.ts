export type HubSaveDevice = "iphone" | "android" | "desktop";

export function hubSaveDevice(userAgent: string, maxTouchPoints = 0): HubSaveDevice {
  if (/iPhone|iPad|iPod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && maxTouchPoints > 1)) return "iphone";
  return /Android/i.test(userAgent) ? "android" : "desktop";
}

export function isEmbeddedBrowser(userAgent: string): boolean {
  return /Instagram|FBAN|FBAV|TikTok|Line\/|; wv\)|\bwv\b/i.test(userAgent);
}

// Never carry a preview, auth token, card code or NFC attribution into a saved link.
export function publicHubUrl(slug: string): string {
  return `https://tapaway.co/${encodeURIComponent(slug)}`;
}
