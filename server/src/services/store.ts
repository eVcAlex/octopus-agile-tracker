import { createHash } from 'node:crypto';
import { Redis } from '@upstash/redis';
import type {
  PushPrefs,
  StoredSubscription,
  WebPushSubscription,
} from '../schemas.js';

const SUBS_SET = 'subs';

let client: Redis | null = null;

export function redis(): Redis {
  if (client) return client;
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    throw new Error(
      'Redis not configured: set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN'
    );
  }
  client = new Redis({ url, token });
  return client;
}

export function isStoreConfigured(): boolean {
  return Boolean(
    (process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL) &&
    (process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN)
  );
}

export function subscriptionId(endpoint: string): string {
  return createHash('sha256').update(endpoint).digest('hex').slice(0, 32);
}

export async function saveSubscription(
  subscription: WebPushSubscription,
  prefs: PushPrefs
): Promise<StoredSubscription> {
  const id = subscriptionId(subscription.endpoint);
  const stored: StoredSubscription = {
    id,
    subscription,
    prefs,
    createdAt: new Date().toISOString(),
  };
  const r = redis();
  await r.set(`sub:${id}`, JSON.stringify(stored));
  await r.sadd(SUBS_SET, id);
  return stored;
}

export async function deleteSubscription(endpoint: string): Promise<void> {
  const id = subscriptionId(endpoint);
  const r = redis();
  await r.del(`sub:${id}`);
  await r.srem(SUBS_SET, id);
}

export async function deleteSubscriptionById(id: string): Promise<void> {
  const r = redis();
  await r.del(`sub:${id}`);
  await r.srem(SUBS_SET, id);
}

export async function listSubscriptions(): Promise<StoredSubscription[]> {
  const r = redis();
  const ids = await r.smembers(SUBS_SET);
  if (!ids.length) return [];
  const raw = await r.mget<(StoredSubscription | string | null)[]>(
    ...ids.map((id) => `sub:${id}`)
  );
  return raw
    .map((v) =>
      typeof v === 'string' ? (JSON.parse(v) as StoredSubscription) : v
    )
    .filter((v): v is StoredSubscription => v !== null);
}

/**
 * Returns true exactly once per key within `ttlSeconds` — used to dedupe
 * notifications across cron runs.
 */
export async function claimOnce(
  key: string,
  ttlSeconds: number
): Promise<boolean> {
  const r = redis();
  const result = await r.set(`notified:${key}`, '1', {
    nx: true,
    ex: ttlSeconds,
  });
  return result === 'OK';
}
