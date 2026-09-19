import { Hono } from 'hono';
import type { Context, Next } from 'hono';
import {
  inRatesPublishWindow,
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

// One endpoint for a single scheduler job (every ~15 min, all day): runs the
// cheap-window check every time and the rates/plunge check during the UK
// afternoon/evening publish window. Each part is isolated so one failing
// (e.g. an Octopus API blip) doesn't stop the other.
cronRoutes.get('/tick', async (c) => {
  const run = async <T>(fn: () => Promise<T>) => {
    try {
      return await fn();
    } catch (err) {
      console.error('[cron/tick]', (err as Error).message);
      return { error: (err as Error).message };
    }
  };

  const rates = inRatesPublishWindow()
    ? await run(runRatesPublishedAlerts)
    : { skipped: 'outside the UK 15:00–21:00 publish window' };
  const cheapWindow = await run(runCheapWindowAlerts);

  return c.json({ ok: true, rates, cheapWindow });
});
