import { Hono } from 'hono';
import type { Context, Next } from 'hono';
import {
  runRatesPublishedAlerts,
  runCheapWindowAlerts,
} from '../services/alerts.js';
import { isStoreConfigured } from '../services/store.js';
import { isPushConfigured } from '../services/push.js';

export const cronRoutes = new Hono();

// Vercel sends "Authorization: Bearer ${CRON_SECRET}" to cron endpoints
async function requireCronSecret(c: Context, next: Next) {
  const secret = process.env.CRON_SECRET;
  if (secret && c.req.header('authorization') !== `Bearer ${secret}`) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  if (!isStoreConfigured() || !isPushConfigured()) {
    return c.json({ ok: true, skipped: 'push not configured' });
  }
  return next();
}

cronRoutes.use('*', requireCronSecret);

cronRoutes.get('/rates-published', async (c) => {
  const result = await runRatesPublishedAlerts();
  return c.json({ ok: true, ...result });
});

cronRoutes.get('/cheap-window', async (c) => {
  const result = await runCheapWindowAlerts();
  return c.json({ ok: true, ...result });
});
