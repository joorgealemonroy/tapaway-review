/**
 * Mobile deep-link helpers.
 * Converts social web URLs into native app URI schemes on mobile so
 * taps open the actual Instagram / Facebook / TikTok apps instead of
 * the slow in-app browser. Falls back to the original URL on desktop
 * or when parsing fails.
 */

export type Platform = 'ios' | 'android' | 'web';

export const detectPlatform = (): Platform => {
  if (typeof navigator === 'undefined') return 'web';
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'web';
};

const extractHandle = (raw: string, host: RegExp): string | null => {
  if (!raw) return null;
  try {
    let url = raw.trim();
    if (
      !/^https?:\/\//i.test(url) &&
      !url.startsWith('instagram:') &&
      !url.startsWith('fb:') &&
      !url.startsWith('snssdk')
    ) {
      url = `https://${url}`;
    }
    const u = new URL(url);
    if (!host.test(u.hostname)) return null;
    const seg = u.pathname.split('/').filter(Boolean)[0];
    return seg ? seg.replace(/^@/, '') : null;
  } catch {
    const cleaned = raw.trim().replace(/^@/, '');
    return /^[\w.]+$/.test(cleaned) ? cleaned : null;
  }
};

export type SocialPlatform = 'instagram' | 'facebook' | 'tiktok' | 'yelp';

/**
 * Convert a raw social URL into a mobile deep link when appropriate.
 */
export const toSocialDeepLink = (
  rawUrl: string | null | undefined,
  platform: SocialPlatform,
  device: Platform = detectPlatform()
): string => {
  if (!rawUrl) return '';
  const original = rawUrl.trim();
  if (!original) return '';
  if (device === 'web') return original;

  switch (platform) {
    case 'instagram': {
      const handle = extractHandle(original, /(^|\.)instagram\.com$/i);
      if (!handle) return original;
      if (device === 'ios') return `instagram://user?username=${handle}`;
      return `intent://instagram.com/_u/${handle}/#Intent;package=com.instagram.android;scheme=https;end`;
    }
    case 'facebook': {
      const page = extractHandle(original, /(^|\.)facebook\.com$/i);
      if (!page) return original;
      return `fb://facewebmodal/f?href=https://facebook.com/${page}`;
    }
    case 'tiktok': {
      const handle = extractHandle(original, /(^|\.)tiktok\.com$/i);
      if (!handle) return original;
      return `snssdk1128://user/profile/${handle}`;
    }
    case 'yelp':
    default:
      return original;
  }
};
