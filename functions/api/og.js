import { buildOgHtml } from '../../server/og.js';

/** Cloudflare Pages Function. */
export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const html = await buildOgHtml({ id: url.searchParams.get('id'), siteUrl: url.origin });
  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=3600',
    },
  });
}
