import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rateLimit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ALLOWED_DOMAINS = [
  'linktr.ee', 'stan.store', 'beacons.ai', 'lnk.bio',
  'bio.link', 'campsite.bio', 'linkpop.com', 'hoo.be',
  'instagram.com', 'tiktok.com', 'youtube.com',
  'x.com', 'twitter.com', 'twitch.tv',
  'spotify.com', 'open.spotify.com',
];

const SOCIAL_DOMAINS = [
  'instagram.com', 'tiktok.com', 'youtube.com',
  'x.com', 'twitter.com', 'twitch.tv',
  'spotify.com', 'open.spotify.com',
];

// Domains that require JS rendering (Firecrawl fallback)
const JS_RENDERED_DOMAINS = ['hoo.be'];

const LINK_TYPE_MAP: Record<string, string> = {
  'instagram.com': 'instagram',
  'tiktok.com': 'tiktok',
  'youtube.com': 'youtube',
  'youtu.be': 'youtube',
  'twitter.com': 'x',
  'x.com': 'x',
  'spotify.com': 'spotify',
  'open.spotify.com': 'spotify',
  'facebook.com': 'facebook',
  'fb.com': 'facebook',
  'linkedin.com': 'linkedin',
  'snapchat.com': 'snapchat',
  'pinterest.com': 'pinterest',
  'soundcloud.com': 'soundcloud',
  'music.apple.com': 'apple_music',
  'podcasts.apple.com': 'podcast',
  'venmo.com': 'venmo',
  'cash.app': 'cashapp',
  'paypal.me': 'website',
  'twitch.tv': 'twitch',
  'github.com': 'website',
};

function detectLinkType(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    for (const [domain, type] of Object.entries(LINK_TYPE_MAP)) {
      if (hostname === domain || hostname.endsWith('.' + domain)) {
        return type;
      }
    }
  } catch { /* ignore */ }
  return 'website';
}

function extractUsernameFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname.replace(/^\/+|\/+$/g, '');
    // Remove @ prefix if present
    const username = path.split('/')[0].replace(/^@/, '');
    return username || '';
  } catch { return ''; }
}

function extractMeta(html: string, property: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, 'i'),
    new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["']`, 'i'),
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m?.[1]) return m[1];
  }
  return null;
}

function cleanTitle(raw: string): string {
  return raw
    .replace(/\s*\([@\w.]+\)\s*/g, '') // strip (@handle)
    .replace(/\s*[|–—-]\s*(Linktree|Stan Store|Stan|Beacons|lnk\.bio|Bio Link|Campsite|LinkPop).*$/i, '')
    .trim();
}

function extractTitle(html: string): string {
  const ogTitle = extractMeta(html, 'og:title');
  if (ogTitle) return cleanTitle(ogTitle);
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch?.[1]) return cleanTitle(titleMatch[1]);
  return '';
}

function extractLinktreeAvatar(html: string): string | null {
  const match = html.match(/<img[^>]+src=["'](https:\/\/ugc\.production\.linktr\.ee\/[^"'?]+[^"']*)["'][^>]*>/i);
  if (match?.[1]) return match[1];
  return null;
}

function extractLinks(html: string, sourceHostname: string): Array<{label: string; url: string; type: string; imageUrl: string | null}> {
  const links: Array<{label: string; url: string; type: string; imageUrl: string | null}> = [];
  const seen = new Set<string>();
  const anchorRegex = /<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = anchorRegex.exec(html)) !== null) {
    const href = match[1];
    const innerHtml = match[2];
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) continue;

    let url: URL;
    try { url = new URL(href); } catch { continue; }

    if (url.hostname.includes(sourceHostname)) continue;
    if (url.hostname.includes('cdn.') || url.hostname.includes('analytics.') || url.hostname.includes('google-analytics')) continue;

    // Extract image: try <img src>, then inline background-image CSS
    const imgMatch = innerHtml.match(/<img[^>]+src=["']([^"']+)["']/i);
    let imageUrl = imgMatch?.[1] || null;
    if (!imageUrl) {
      const bgMatch = match[0].match(/background-image:\s*url\(["']?([^"')]+)["']?\)/i)
        || innerHtml.match(/background-image:\s*url\(["']?([^"')]+)["']?\)/i);
      if (bgMatch?.[1]) imageUrl = bgMatch[1];
    }

    let label = innerHtml.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

    // If no text label but has an SVG (icon-only link), treat as social icon
    if (!label && innerHtml.match(/<svg[\s>]/i)) {
      const type = detectLinkType(href);
      const socialTypes = new Set(['instagram', 'tiktok', 'x', 'youtube', 'spotify', 'facebook', 'linkedin', 'snapchat', 'pinterest', 'soundcloud']);
      if (socialTypes.has(type)) {
        links.push({ label: type, url: href, type, imageUrl: null });
      }
      continue;
    }

    if (!label || label.length > 200) continue;

    // Dedup by label+URL combo so different buttons to the same URL are kept
    const dedupeKey = label + '||' + url.origin + url.pathname.replace(/\/$/, '');
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    // Deduplicate repeated-word labels like "InstagramInstagram"
    if (label.length >= 6 && label.length % 2 === 0) {
      const half = label.substring(0, label.length / 2);
      if (label === half + half) label = half;
    }

    const type = detectLinkType(href);
    links.push({ label, url: href, type, imageUrl });
  }

  return links;
}

// --- Stan Store specific extraction ---
function extractStanStore(html: string, pageUrl: string) {
  // Profile name from SSR element
  const nameMatch = html.match(/<div[^>]+class="[^"]*store-header__fullname[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  const name = nameMatch ? nameMatch[1].replace(/<[^>]+>/g, '').trim() : '';

  // Profile photo from store header
  const photoMatch = html.match(/<img[^>]+class="[^"]*base-preview-image[^"]*"[^>]+src=["']([^"']+)["']/i);
  const photoUrl = photoMatch ? photoMatch[1] : null;

  // Extract product/content blocks
  const contentLinks: Array<{label: string; url: string; type: string}> = [];
  // Match block headings — these are the product titles
  const headingRegex = /<h4[^>]+class="[^"]*block__heading[^"]*"[^>]*>([\s\S]*?)<\/h4>/gi;
  let m;
  while ((m = headingRegex.exec(html)) !== null) {
    const title = m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (title && title.length <= 200) {
      contentLinks.push({ label: title, url: pageUrl, type: 'website' });
    }
  }

  // Also try to find social links via anchor tags (Stan does render some social <a> tags)
  const socialLinks: Array<{label: string; url: string; type: string}> = [];
  const socialTypes = new Set(['instagram', 'tiktok', 'x', 'youtube', 'spotify', 'facebook', 'linkedin', 'snapchat', 'pinterest', 'soundcloud']);
  const anchorRegex = /<a\s[^>]*href=["']([^"']+)["'][^>]*>/gi;
  let aMatch;
  while ((aMatch = anchorRegex.exec(html)) !== null) {
    const href = aMatch[1];
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) continue;
    try { new URL(href); } catch { continue; }
    const type = detectLinkType(href);
    if (socialTypes.has(type)) {
      socialLinks.push({ label: type, url: href, type });
    }
  }

  return { name, photoUrl, contentLinks, socialLinks };
}

// --- Beacons specific extraction ---
function extractBeacons(html: string, pageUrl: string) {
  const contentLinks: Array<{label: string; url: string; type: string}> = [];
  // Beacons uses data-link-title or similar patterns; try generic button/link text extraction
  const buttonRegex = /<(?:a|button)[^>]*(?:class="[^"]*link-block[^"]*"|data-link-title)[^>]*>([\s\S]*?)<\/(?:a|button)>/gi;
  let m;
  while ((m = buttonRegex.exec(html)) !== null) {
    const title = m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (title && title.length <= 200) {
      contentLinks.push({ label: title, url: pageUrl, type: 'website' });
    }
  }
  return contentLinks;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url || typeof url !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    let hostname: string;
    try {
      hostname = new URL(formattedUrl).hostname.replace(/^www\./, '');
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isAllowed = ALLOWED_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d));
    if (!isAllowed) {
      return new Response(
        JSON.stringify({ success: false, error: `Unsupported platform. We support: ${ALLOWED_DOMAINS.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Scraping:', formattedUrl);

    const response = await fetch(formattedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TapAway/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    // For social URLs, try Microlink API first for metadata
    const isSocialUrl = SOCIAL_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d));

    if (isSocialUrl) {
      const detectedType = detectLinkType(formattedUrl);
      const platformLabel = detectedType.charAt(0).toUpperCase() + detectedType.slice(1);
      const fallbackUsername = extractUsernameFromUrl(formattedUrl);

      let name = fallbackUsername;
      let bio: string | null = null;
      let photoUrl: string | null = null;

      // Try Microlink API for metadata
      try {
        console.log('Trying Microlink for social URL:', formattedUrl);
        const mlResp = await fetch(`https://api.microlink.io?url=${encodeURIComponent(formattedUrl)}`);
        if (mlResp.ok) {
          const mlData = await mlResp.json();
          if (mlData?.status === 'success' && mlData?.data) {
            name = mlData.data.title || fallbackUsername;
            bio = mlData.data.description || null;
            photoUrl = mlData.data.image?.url || mlData.data.logo?.url || null;
            console.log(`Microlink success: name="${name}", photo=${!!photoUrl}`);
          } else {
            await mlResp.text(); // consume if not already
          }
        } else {
          await mlResp.text(); // consume body
          console.log(`Microlink failed (${mlResp.status}), using URL fallback`);
        }
      } catch (mlErr) {
        console.error('Microlink error:', mlErr);
      }

      // Clean up name — remove platform suffixes
      if (name) {
        name = name
          .replace(/\s*[@•·|–—-]\s*(Instagram|TikTok|YouTube|X|Twitter|Twitch|Spotify).*$/i, '')
          .replace(/\s*on\s+(Instagram|TikTok|YouTube|X|Twitter|Twitch|Spotify)$/i, '')
          .replace(/\([@\w.]+\)/g, '')
          .trim();
      }

      // Consume the original response body if it exists
      if (!response.ok) {
        await response.text();
      } else {
        await response.text();
      }

      console.log(`Social URL final: name="${name}", photo=${!!photoUrl}, type=${detectedType}`);

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            name: name || fallbackUsername,
            bio,
            photoUrl,
            links: [],
            socialLinks: [{ label: platformLabel, url: formattedUrl, type: detectedType }],
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!response.ok) {
      await response.text();
      return new Response(
        JSON.stringify({ success: false, error: `Failed to fetch page (${response.status})` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = await response.text();

    // Common meta fallbacks
    const metaPhoto = extractMeta(html, 'og:image') || null;
    const metaBio = extractMeta(html, 'og:description') || null;
    const metaName = extractTitle(html);

    const socialTypes = new Set(['instagram', 'tiktok', 'x', 'youtube', 'spotify', 'facebook', 'linkedin', 'snapchat', 'pinterest', 'soundcloud', 'twitch']);

    let name: string;
    let photoUrl: string | null;
    let bio: string | null = metaBio;
    let contentLinks: Array<{label: string; url: string; type: string; imageUrl?: string | null}>;
    let socialLinks: Array<{label: string; url: string; type: string}>;

    if (hostname === 'stan.store' || hostname.endsWith('.stan.store')) {
      // Platform-specific routing
      const stan = extractStanStore(html, formattedUrl);
      name = stan.name || metaName;
      photoUrl = stan.photoUrl || metaPhoto;
      contentLinks = stan.contentLinks;
      socialLinks = stan.socialLinks;
    } else {
      // Generic anchor-based extraction (works for Linktree, lnk.bio, bio.link, etc.)
      name = metaName;
      photoUrl = (hostname === 'linktr.ee' || hostname.endsWith('.linktr.ee'))
        ? (extractLinktreeAvatar(html) || metaPhoto)
        : metaPhoto;
      const allLinks = extractLinks(html, hostname);
      socialLinks = allLinks.filter(l => socialTypes.has(l.type) && !l.imageUrl);
      contentLinks = allLinks.filter(l => !socialTypes.has(l.type) || !!l.imageUrl);
    }

    console.log(`Extracted: name="${name}", ${contentLinks.length} content links, ${socialLinks.length} social links`);

    // Firecrawl fallback for JS-rendered sites with 0 links
    const isJsRendered = JS_RENDERED_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d));
    if (isJsRendered && contentLinks.length === 0) {
      const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
      if (firecrawlKey) {
        console.log('Falling back to Firecrawl for JS-rendered page (have social icons but no content links)');
        try {
          const fcResp = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${firecrawlKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: formattedUrl,
              formats: ['html'],
              waitFor: 3000,
            }),
          });
          if (fcResp.ok) {
            const fcData = await fcResp.json();
            const renderedHtml = fcData?.data?.html || '';
            if (renderedHtml) {
              // Re-extract from rendered HTML
              const fcAllLinks = extractLinks(renderedHtml, hostname);
              const fcSocialLinks = fcAllLinks.filter(l => socialTypes.has(l.type) && !l.imageUrl);
              contentLinks = fcAllLinks.filter(l => !socialTypes.has(l.type) || !!l.imageUrl);

              // Merge Firecrawl social links with ones already found, dedup by URL
              const existingSocialUrls = new Set(socialLinks.map(l => l.url));
              for (const sl of fcSocialLinks) {
                if (!existingSocialUrls.has(sl.url)) {
                  socialLinks.push(sl);
                }
              }

              // Try to get better name/photo from rendered HTML
              const fcName = extractTitle(renderedHtml);
              if (fcName) name = fcName;
              const fcPhoto = extractMeta(renderedHtml, 'og:image');
              if (fcPhoto) photoUrl = fcPhoto;
              const fcBio = extractMeta(renderedHtml, 'og:description');
              if (fcBio) bio = fcBio;

              console.log(`Firecrawl extracted: ${contentLinks.length} content links, ${socialLinks.length} social links`);
            }
          }
        } catch (fcErr) {
          console.error('Firecrawl fallback failed:', fcErr);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: { name, bio, photoUrl, links: contentLinks, socialLinks },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error scraping:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Failed to scrape' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
