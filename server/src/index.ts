import { config } from 'dotenv';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

// Load .env from repo root before any modules that check env at load time
config({
  path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env'),
});

const { serve } = await import('@hono/node-server');
const { app } = await import('./app.js');

const port = parseInt(process.env.PORT ?? '3001', 10);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Server running on http://localhost:${info.port}`);
});
