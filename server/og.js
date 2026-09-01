/**
 * Server-rendered Open Graph/Twitter Card HTML for a single shared anime
 * link — so pasting a Tsugi URL into Discord/Slack/X/etc. shows its title
 * and cover art instead of a blank card.
 *
 * A social-media crawler fetches raw HTML and reads <meta> tags; it never
 * runs the SPA's JS, so a client-side-only title/meta update (the usual SPA
 * approach) is invisible to it. This exists purely for those crawlers — real
 * visitors always get the React app. See vercel.json for the request-routing
 * side of that (only known bot user agents get rewritten here).
 *
 * Imported by:
 *   api/og.js            → Vercel Function (Node)
 *   functions/api/og.js  → Cloudflare Pages Function (Workers)
 */

import { cleanText, displayTitle } from '../src/lib/format.js';

const SITE_NAME = 'Tsugi';
const SITE_DESCRIPTION = 'Browse anime by genre and ask for recommendations grounded in the real AniList catalog.';

function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

async function fetchMedia(id) {
  const res = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      query: `query ($id: Int) {
        Media(id: $id) {
          title { romaji english }
          description(asHtml: false)
          coverImage { extraLarge large }
        }
      }`,
      variables: { id },
    }),
  });
  if (!res.ok) return null;
  const json = await res.json();
  if (json.errors?.length) return null;
  return json.data.Media;
}

export async function buildOgHtml({ id, siteUrl }) {
  const numId = Number(id);
  const media = Number.isInteger(numId) && numId > 0 ? await fetchMedia(numId).catch(() => null) : null;

  const pageUrl = media ? `${siteUrl}/?id=${numId}` : siteUrl;
  const title = media ? displayTitle(media) : `${SITE_NAME} — what to watch next`;
  const description = media
    ? (cleanText(media.description).slice(0, 200) || SITE_DESCRIPTION)
    : SITE_DESCRIPTION;
  const image = media?.coverImage?.extraLarge || media?.coverImage?.large;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(title)}${media ? ` — ${SITE_NAME}` : ''}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
${image ? `<meta property="og:image" content="${esc(image)}">` : ''}
<meta property="og:url" content="${esc(pageUrl)}">
<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
${image ? `<meta name="twitter:image" content="${esc(image)}">` : ''}
<meta http-equiv="refresh" content="0; url=${esc(pageUrl)}">
</head>
<body>
<a href="${esc(pageUrl)}">${esc(title)}</a>
</body>
</html>`;
}
