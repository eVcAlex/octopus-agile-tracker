import { Hono } from 'hono';
import {
  subscribeRequestSchema,
  unsubscribeRequestSchema,
} from '../schemas.js';
import {
  saveSubscription,
  deleteSubscription,
  isStoreConfigured,
} from '../services/store.js';
import { isPushConfigured } from '../services/push.js';

export const pushRoutes = new Hono();

pushRoutes.get('/vapid-public-key', (c) => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) return c.json({ error: 'Push not configured' }, 503);
  return c.json({ key });
});

pushRoutes.post('/subscribe', async (c) => {
  if (!isStoreConfigured() || !isPushConfigured()) {
    return c.json({ error: 'Push not configured' }, 503);
  }
  const body = subscribeRequestSchema.parse(await c.req.json());
  const stored = await saveSubscription(body.subscription, body.prefs);
  return c.json({ ok: true, id: stored.id });
});

pushRoutes.post('/unsubscribe', async (c) => {
  if (!isStoreConfigured()) return c.json({ ok: true });
  const body = unsubscribeRequestSchema.parse(await c.req.json());
  await deleteSubscription(body.endpoint);
  return c.json({ ok: true });
});
