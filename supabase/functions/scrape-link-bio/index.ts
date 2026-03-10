const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ALLOWED_DOMAINS = [
  'linktr.ee',
  'stan.store',
  'beacons.ai',
  'lnk.bio',
  'bio.link',
  'campsite.bio',
  'linkpop.com',
];

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
  'twitch.tv': 'website',
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

function extractMeta(html: string, property: string): string | null {
  // Try og: and regular meta
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

function extractTitle(html: string): string {
  const ogTitle = extractMeta(html, 'og:title');
  if (ogTitle) {
    // Linktree titles are like "Name | Linktree" — strip suffix
    return ogTitle.replace(/\s*\|\s*(Linktree|Stan Store|Beacons|lnk\.bio).*$/i, '').trim();
  }
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch?.[1]) {
    return titleMatch[1].replace(/\s*\|\s*(Linktree|Stan Store|Beacons|lnk\.bio).*$/i, '').trim();
  }
  return '';
}

function extractLinks(html: string, sourceHostname: string): Array<{label: string; url: string; type: string}> {
  const links: Array<{label: string; url: string; type: string}> = [];
  const seen = new Set<string>();

  // Match all <a> tags
  const anchorRegex = /<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = anchorRegex.exec(html)) !== null) {
    const href = match[1];
    const innerHtml = match[2];

    // Skip empty, fragment, or same-domain links
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) continue;

    let url: URL;
    try {
      url = new URL(href);
    } catch {
      continue;
    }

    // Skip links back to the same platform
    if (url.hostname.includes(sourceHostname)) continue;
    // Skip common CDN/tracking domains
    if (url.hostname.includes('cdn.') || url.hostname.includes('analytics.') || url.hostname.includes('google-analytics')) continue;

    const normalizedUrl = url.origin + url.pathname.replace(/\/$/, '');
    if (seen.has(normalizedUrl)) continue;
    seen.add(normalizedUrl);

    // Extract text label: strip HTML tags, trim
    const label = innerHtml.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (!label || label.length > 200) continue;

    const type = detectLinkType(href);
    links.push({ label, url: href, type });
  }

  return links;
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

    // Normalize URL
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    // Validate domain
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
        JSON.stringify({
          success: false,
          error: `Unsupported platform. We support: ${ALLOWED_DOMAINS.join(', ')}`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Scraping:', formattedUrl);

    // Fetch the page
    const response = await fetch(formattedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TapAway/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ success: false, error: `Failed to fetch page (${response.status})` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = await response.text();

    // Extract data using meta tags (resilient approach)
    const name = extractTitle(html);
    const photoUrl = extractMeta(html, 'og:image') || null;
    const description = extractMeta(html, 'og:description') || null;

    // Extract all external links
    const allLinks = extractLinks(html, hostname);

    // Separate social links from content links
    const socialTypes = new Set(['instagram', 'tiktok', 'x', 'youtube', 'spotify', 'facebook', 'linkedin', 'snapchat', 'pinterest', 'soundcloud']);
    const socialLinks = allLinks.filter(l => socialTypes.has(l.type));
    const contentLinks = allLinks.filter(l => !socialTypes.has(l.type));

    console.log(`Extracted: name="${name}", ${contentLinks.length} content links, ${socialLinks.length} social links`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          name,
          bio: description,
          photoUrl,
          links: contentLinks,
          socialLinks,
        }
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
