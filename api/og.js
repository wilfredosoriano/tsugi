import { buildOgHtml } from '../server/og.js';

/** Vercel Function. Thin adapter — the logic lives in server/og.js. */
export default async function handler(req, res) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const siteUrl = `${proto}://${host}`;

  const html = await buildOgHtml({ id: req.query.id, siteUrl });
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600');
  return res.status(200).send(html);
}
