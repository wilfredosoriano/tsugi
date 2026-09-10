import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { rankPicks } from './server/rank.js';
import { buildOgHtml } from './server/og.js';

/**
 * In production, /api/recommend is served by a Vercel Function (api/) or a
 * Cloudflare Pages Function (functions/api/). Neither runs under `vite dev`,
 * so this plugin mounts the same shared handler on the dev server. That way
 * `npm run dev` in VS Code exercises the real code path.
 */
function devApi(env) {
  return {
    name: 'tsugi-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/recommend', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          return res.end(JSON.stringify({ error: 'Use POST.' }));
        }
        res.setHeader('Content-Type', 'application/json');
        try {
          const body = await new Promise((resolve, reject) => {
            let raw = '';
            req.on('data', (c) => (raw += c));
            req.on('end', () => {
              try { resolve(JSON.parse(raw || '{}')); } catch (e) { reject(e); }
            });
            req.on('error', reject);
          });

          const result = await rankPicks({
            question: body.question,
            pool: body.pool,
            apiKey: env.GROQ_API_KEY,
            model: env.GROQ_MODEL,
          });
          res.end(JSON.stringify(result));
        } catch (err) {
          res.statusCode = err.status || 500;
          res.end(JSON.stringify({ error: err.message }));
        }
      });

      // /api/og likewise only exists as a Vercel/Cloudflare function in
      // production (see vercel.json for the bot-user-agent routing side);
      // mounted here so it's curl-able during local dev too.
      server.middlewares.use('/api/og', async (req, res) => {
        const id = new URL(req.url, 'http://x').searchParams.get('id');
        const html = await buildOgHtml({ id, siteUrl: `http://localhost:${server.config.server.port}` });
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(html);
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), devApi(env)],
    server: { port: 5100 },
  };
});
