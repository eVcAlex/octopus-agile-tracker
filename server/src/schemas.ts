import { z } from 'zod';

export const REGIONS = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'J',
  'K',
  'L',
  'M',
  'N',
  'P',
] as const;

export const regionSchema = z.enum(REGIONS);
export type Region = z.infer<typeof regionSchema>;

export const pushPrefsSchema = z.object({
  region: regionSchema,
  ratesPublished: z.boolean(),
  plunge: z.boolean(),
  cheapWindow: z.boolean(),
  cheapWindowHours: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
  ]),
});
export type PushPrefs = z.infer<typeof pushPrefsSchema>;

export const webPushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});
export type WebPushSubscription = z.infer<typeof webPushSubscriptionSchema>;

export const subscribeRequestSchema = z.object({
  subscription: webPushSubscriptionSchema,
  prefs: pushPrefsSchema,
});

export const unsubscribeRequestSchema = z.object({
  endpoint: z.string().url(),
});

export interface StoredSubscription {
  id: string;
  subscription: WebPushSubscription;
  prefs: PushPrefs;
  createdAt: string;
}

export const octopusRateSchema = z.object({
  value_exc_vat: z.number(),
  value_inc_vat: z.number(),
  valid_from: z.string(),
  valid_to: z.string(),
  payment_method: z.string().nullable(),
});

export const octopusResponseSchema = z.object({
  count: z.number(),
  next: z.string().nullable(),
  previous: z.string().nullable(),
  results: z.array(octopusRateSchema),
});

export type OctopusRate = z.infer<typeof octopusRateSchema>;
