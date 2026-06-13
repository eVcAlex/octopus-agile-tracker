import wretch from 'wretch';
import type { Region } from '../features/pricing/schemas';

export interface NotificationPrefs {
  region: Region;
  ratesPublished: boolean;
  plunge: boolean;
  cheapWindow: boolean;
  cheapWindowHours: 1 | 2 | 3 | 4;
}

export function isPushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Requests permission (if needed), subscribes the browser, and saves the
 * subscription + prefs to the backend. Safe to call again to update prefs.
 */
export async function subscribeToPush(prefs: NotificationPrefs): Promise<void> {
  if (!isPushSupported()) throw new Error('Push is not supported here');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission was denied');
  }

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    const { key } = await wretch('/api/push/vapid-public-key')
      .get()
      .json<{ key: string }>();
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
    });
  }

  await wretch('/api/push/subscribe')
    .post({ subscription: subscription.toJSON(), prefs })
    .json();
}

export async function sendTestNotification(): Promise<void> {
  if (!isPushSupported()) throw new Error('Push is not supported here');
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) throw new Error('Not subscribed — enable notifications first');
  await wretch('/api/push/test')
    .post({ subscription: subscription.toJSON() })
    .json();
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  try {
    await wretch('/api/push/unsubscribe')
      .post({ endpoint: subscription.endpoint })
      .json();
  } finally {
    await subscription.unsubscribe();
  }
}
