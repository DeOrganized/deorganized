/**
 * Vercel Edge Middleware — Prediction Wars OG tag injection
 *
 * Twitter/X and other crawlers don't execute JavaScript, so react-helmet
 * tags aren't visible to them. This middleware intercepts requests to
 * /prediction-wars* before they reach the SPA, fetches the static
 * index.html, injects server-side OG/Twitter meta tags, and returns the
 * modified HTML. Real users get the same HTML — the React app hydrates
 * normally on top of it.
 */

export const config = {
  matcher: ['/prediction-wars', '/prediction-wars/:path*'],
};

const OG_IMAGE = 'https://www.deorganized.com/images/prediction-wars/og-card.png';
const SITE_URL = 'https://www.deorganized.com';
const VALID_COINS = new Set(['leo', 'welsh', 'pepe', 'roo', 'flat', 'play']);

function buildMetaTags(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean);
  const coinSlug = parts[1]?.toLowerCase() ?? '';
  const coin = VALID_COINS.has(coinSlug) ? coinSlug.toUpperCase() : null;

  const title = coin
    ? `${coin} — Prediction Wars | DeOrganized`
    : 'Prediction Wars | DeOrganized';
  const ogTitle = 'Memecoin Prediction Wars — Season 1 Live';
  const desc = coin
    ? `Follow ${coin} in the Memecoin Prediction Wars on StacksMarket. Season 1 live now.`
    : '6 memecoins. 6 real markets. One leaderboard. Trade predictions on BTC, STX, Gold, Oil, S&P, and NASDAQ. Powered by StacksMarket.';
  const url = `${SITE_URL}${pathname}`;

  return [
    `<title>${title}</title>`,
    `<meta property="og:title" content="${ogTitle}" />`,
    `<meta property="og:description" content="${desc}" />`,
    `<meta property="og:image" content="${OG_IMAGE}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${ogTitle}" />`,
    `<meta name="twitter:description" content="${desc}" />`,
    `<meta name="twitter:image" content="${OG_IMAGE}" />`,
  ].join('\n  ');
}

export default async function middleware(request: Request): Promise<Response | undefined> {
  const url = new URL(request.url);

  // Never intercept static assets — only handle extensionless SPA routes.
  if (/\.[a-zA-Z0-9]+$/.test(url.pathname)) return undefined;

  try {
    // Fetch the static index.html directly, bypassing this middleware.
    const indexRes = await fetch(new URL('/index.html', url.origin).toString(), {
      headers: { 'x-pw-bypass': '1' },
    });

    if (!indexRes.ok) return undefined;

    const html = await indexRes.text();
    const metaTags = buildMetaTags(url.pathname);

    // Strip the existing static <title> then inject all OG tags before </head>.
    const modified = html
      .replace(/<title>[^<]*<\/title>/, '')
      .replace('</head>', `  ${metaTags}\n</head>`);

    return new Response(modified, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        // Allow CDN to cache for 60s; serve stale up to 5 min while revalidating.
        'cache-control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch {
    // Fail open — serve the unmodified SPA. Crawlers won't get OG tags
    // but real users are unaffected.
    return undefined;
  }
}
