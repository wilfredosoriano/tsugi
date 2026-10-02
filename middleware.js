import { buildOgHtml } from './server/og.js';

/**
 * Vercel Routing Middleware. Link-preview crawlers don't run JS, so for them
 * a shared Tsugi URL (/?id=…, /browse?id=…) is answered with server-rendered
 * Open Graph tags for that title. This has to be middleware rather than a
 * vercel.json rewrite: rewrites run after the static index.html already
 * matched "/", so a rewrite rule for bots never fired. Everyone else falls
 * through untouched to the SPA.
 */
const BOT_UA = /facebookexternalhit|Facebot|Twitterbot|Discordbot|Slackbot|WhatsApp|TelegramBot|LinkedInBot|Pinterest|SkypeUriPreview|redditbot|Embedly|vkShare|Applebot/i;

export const config = { matcher: ['/', '/browse', '/saved', '/profile'] };

export default async function middleware(request) {
  if (!BOT_UA.test(request.headers.get('user-agent') || '')) return undefined;
  try {
    const url = new URL(request.url);
    const html = await buildOgHtml({ id: url.searchParams.get('id'), siteUrl: url.origin });
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300, s-maxage=3600',
      },
    });
  } catch {
    // Never break a page load over a preview card — fall back to the SPA's own tags.
    return undefined;
  }
}
