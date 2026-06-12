import type { Context } from 'hono';
import { ZodError } from 'zod';

export function errorMiddleware(err: Error, c: Context) {
  if (err instanceof ZodError) {
    return c.json({ error: 'Invalid request', details: err.issues }, 400);
  }
  console.error(`[error] ${c.req.method} ${c.req.path}:`, err.message);
  return c.json({ error: 'Internal server error' }, 500);
}
