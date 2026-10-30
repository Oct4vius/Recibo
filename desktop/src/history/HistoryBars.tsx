import type { Granularity } from '@/features/history/granularity';
import { axisLabels, bucketAccessibilityLabel } from '@/features/history/labels';
import type { HistoryBucket } from '@/features/history/mapping';
import { barRatios } from '@/features/history/scale';
import { useFillOnce } from '../ui/use-fill-once';

interface HistoryBarsProps {
  granularity: Granularity;
  /** Del más viejo al más nuevo. */
  buckets: readonly HistoryBucket[];
  selectedIso: string | null;
  onSelect: (startIso: string) => void;
}

/** Una barra por período; las alturas salen de `barRatios` y se llenan una sola vez por sesión. */
export function HistoryBars({ granularity, buckets, selectedIso, onSelect }: HistoryBarsProps) {
  const ratios = barRatios(buckets.map((bucket) => bucket.totalDop));
  const axis = axisLabels(granularity, buckets.map((bucket) => bucket.start));
  const armed = useFillOnce('history', true);

  return (
    <div className="history-bars">
      {buckets.map((bucket, i) => (
        // Clave por posición: la barra persiste al cambiar de ventana y anima a su nueva altura.
        <div key={i} className="history-col">
          <button
            type="button"
            className="history-bar"
            aria-label={bucketAccessibilityLabel(granularity, bucket.start, bucket.totalDop)}
            aria-pressed={bucket.startIso === selectedIso}
            onClick={() => onSelect(bucket.startIso)}
          >
            <span className="history-bar-fill" style={{ transform: `scaleY(${armed ? ratios[i] : 0})` }} />
          </button>
          <span className="history-axis">{axis[i].top}</span>
          <span className="history-axis history-axis-context">{axis[i].bottom}</span>
        </div>
      ))}
    </div>
  );
}
