import type { ProcessedSlot } from '../../schemas';
import { getSlotStatus, getPriceColor, formatPrice } from '../../utils';
import styles from './CurrentSlotBanner.module.scss';

function endLabel(slot: ProcessedSlot): string {
  return slot.validTo.toLocaleTimeString('en-GB', {
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
