/** Normalises an unknown thrown value into a display string, or null. */
export function errorMessage(error: unknown): string | null {
  if (!error) return null;
  return error instanceof Error ? error.message : String(error);
}
