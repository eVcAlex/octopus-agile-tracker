import webpush from 'web-push';
import type { StoredSubscription } from '../schemas.js';
import { deleteSubscriptionById } from './store.js';

let configured = false;

export function isPushConfigured(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function ensureConfigured() {
  if (configured) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    throw new Error(
      'Push not configured: set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY'
    );
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? 'mailto:admin@example.com',
    publicKey,
    privateKey
  );
  configured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  tag?: string;
  url?: string;
}

/** Sends a notification; prunes the subscription if the endpoint is gone. */
export async function sendPush(
  sub: StoredSubscription,
  payload: PushPayload
): Promise<boolean> {
  ensureConfigured();
  try {
    await webpush.sendNotification(sub.subscription, JSON.stringify(payload));
    return true;
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    if (statusCode === 404 || statusCode === 410) {
      await deleteSubscriptionById(sub.id);
    }
    return false;
  }
}
