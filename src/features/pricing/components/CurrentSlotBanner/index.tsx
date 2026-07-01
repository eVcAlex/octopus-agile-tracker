import type { ProcessedSlot } from '../../schemas';
import { getSlotStatus, getPriceColor, formatPrice } from '../../utils';
import styles from './CurrentSlotBanner.module.scss';

function endLabel(slot: ProcessedSlot): string {
  // validTo may be a string after the query cache is rehydrated from
  // localStorage (JSON loses Date types), so normalise before formatting.
  return new Date(slot.validTo).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function CurrentSlotBanner({ data }: { data: ProcessedSlot[] }) {
  const status = getSlotStatus(data);
  if (!status) return null;

  const { current, nextCheaper } = status;
  const accent = getPriceColor(current.priceIncVat);

  return (
    <div
      className={styles.banner}
      style={{ borderLeftColor: accent }}
      role="status"
    >
      <span className={styles.dot} style={{ background: accent }} />
      <span className={styles.label}>
        Now{' '}
        <b className={styles.mono}>
          {current.time}–{endLabel(current)}
        </b>
        <b className={styles.mono} style={{ color: accent, marginLeft: 6 }}>
          {formatPrice(current.priceIncVat)}
        </b>
      </span>
      {nextCheaper && (
        <span className={styles.next}>
          <span className={styles.dim}>· next cheaper</span>{' '}
          <b className={styles.mono}>{nextCheaper.time}</b>{' '}
          <b
            className={styles.mono}
            style={{ color: getPriceColor(nextCheaper.priceIncVat) }}
          >
            {formatPrice(nextCheaper.priceIncVat)}
          </b>
        </span>
      )}
    </div>
  );
}
