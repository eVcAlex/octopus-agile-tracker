import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { pushRoutes } from './routes/push.js';
import { cronRoutes } from './routes/cron.js';
import { errorMiddleware } from './middleware/error.js';

const app = new Hono();

const configuredOrigins = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  '*',
  cors({
    origin: (origin) => {
      if (!origin) return null;
      // Dev: localhost only
      if (process.env.NODE_ENV !== 'production') {
        return origin.startsWith('http://localhost:') ? origin : null;
      }
      // Prod: explicit allowlist first, then fallback to any *.vercel.app
      if (configuredOrigins.length > 0) {
        return configuredOrigins.includes(origin) ? origin : null;
      }
      return origin.endsWith('.vercel.app') ? origin : null;
    },
    allowMethods: ['GET', 'POST', 'OPTIONS'],
  })
);

app.use('*', logger());

app.get('/api/health', (c) => c.json({ ok: true }));
app.route('/api/push', pushRoutes);
app.route('/api/cron', cronRoutes);

app.onError(errorMiddleware);

export { app };
