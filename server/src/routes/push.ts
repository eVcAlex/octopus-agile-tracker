import { Hono } from 'hono';
import { z } from 'zod';
import {
  subscribeRequestSchema,
  unsubscribeRequestSchema,
  webPushSubscriptionSchema,
} from '../schemas.js';
import {
  saveSubscription,
  deleteSubscription,
  isStoreConfigured,
} from '../services/store.js';
import { isPushConfigured, sendPush } from '../services/push.js';

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

pushRoutes.post('/test', async (c) => {
  if (!isPushConfigured()) {
    return c.json({ error: 'Push not configured' }, 503);
  }
  const { subscription } = z.object({ subscription: webPushSubscriptionSchema }).parse(await c.req.json());
  const ok = await sendPush(
    { id: 'test', subscription, prefs: { region: 'H', ratesPublished: true, plunge: true, cheapWindow: true, cheapWindowHours: 2 }, createdAt: new Date().toISOString() },
    { title: 'Test notification', body: 'Push notifications are working!', tag: 'test', url: '/' }
  );
  return c.json({ ok });
});
