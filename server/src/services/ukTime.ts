const UK = 'Europe/London';

/** UK local time's offset from UTC in minutes at an instant (0 or 60). */
function ukOffsetMinutes(at: Date): number {
  const name =
    new Intl.DateTimeFormat('en-GB', {
      timeZone: UK,
      timeZoneName: 'longOffset',
    })
      .formatToParts(at)
      .find((p) => p.type === 'timeZoneName')?.value ?? 'GMT';
  const m = name.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!m) return 0; // plain "GMT"
  return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]));
}

/** The UK calendar date of an instant, as YYYY-MM-DD. */
export function ukDateString(at: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: UK }).format(at);
}

/**
 * [from, to) covering a UK calendar day, `offsetDays` from today's UK date.
 * Agile rates run on UK time, so in summer a day starts at 23:00 UTC.
 */
export function ukDayBounds(
  offsetDays: number,
  now: Date = new Date()
): { from: Date; to: Date } {
  const [y, m, d] = ukDateString(now).split('-').map(Number);
  const midnight = (days: number) => {
    const guess = Date.UTC(y, m - 1, d + days);
    return new Date(guess - ukOffsetMinutes(new Date(guess)) * 60_000);
  };
  return { from: midnight(offsetDays), to: midnight(offsetDays + 1) };
}
