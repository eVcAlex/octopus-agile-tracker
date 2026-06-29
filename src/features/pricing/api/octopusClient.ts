import wretch from 'wretch';
import type { z } from 'zod';
import type { StandingCharge } from '../schemas';

export const API_BASE = 'https://api.octopus.energy/v1';
export const PRODUCTS_BASE = `${API_BASE}/products`;

/** HTTP Basic auth header for an Octopus API key (password is blank). */
export function apiKeyAuth(apiKey: string): string {
  return `Basic ${btoa(apiKey + ':')}`;
}

/**
 * Follows Octopus' `next` pagination links, validating each page against
 * `schema`, and returns every result concatenated.
 */
export async function fetchAllPages<T>(
  firstUrl: string,
  schema: z.ZodType<{ next: string | null; results: T[] }>
): Promise<T[]> {
  const all: T[] = [];
  let nextUrl: string | null = firstUrl;

  while (nextUrl) {
    const raw = await wretch(nextUrl).get().json();
    const page = schema.parse(raw);
    all.push(...page.results);
    nextUrl = page.next;
  }

  return all;
}

/** Octopus returns separate rows per payment method; we track Direct Debit. */
export function isDirectDebit(r: { payment_method?: string | null }): boolean {
  return r.payment_method === 'DIRECT_DEBIT' || r.payment_method == null;
}

/** True when `now` falls within the row's validity window. */
export function isActiveNow(
  r: { valid_from: string; valid_to: string | null },
  now: Date = new Date()
): boolean {
  return (
    new Date(r.valid_from) <= now &&
    (r.valid_to === null || new Date(r.valid_to) > now)
  );
}

/** The Direct Debit standing charge in effect right now, inc VAT. */
export function currentStandingCharge(
  results: StandingCharge[]
): number | null {
  const current = results.filter(isDirectDebit).find((r) => isActiveNow(r));
  return current?.value_inc_vat ?? null;
}
