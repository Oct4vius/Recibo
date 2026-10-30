import { useState } from 'react';
import { breakdownRange } from '@/features/history/categories';
import type { Granularity } from '@/features/history/granularity';
import { useCategorySpending, useHistory } from '@/features/history/hooks';
import { expenseCountLabel } from '@/features/history/labels';
import { defaultSelectedIso, selectedStartFor, windowKeyOf, type HistorySelection } from '@/features/history/selection';
import { periodStartOf } from '@/features/history/window';
import { useTimeZone } from '@/features/profile/hooks';
import { toIsoDate, toLocalDate } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { CategoryList } from '../month/CategoryList';
import { viewForPeriod, type MovementsView } from '../movements/movements-view';
import { Button } from '../ui/Button';
import { ErrorLine } from '../ui/ErrorLine';
import { Placeholder } from '../ui/Placeholder';
import { HistoryBars } from './HistoryBars';
import { periodTitle } from './history-text';

interface PeriodViewProps {
  granularity: Granularity;
  onOpenMovements: (view: MovementsView) => void;
}

/** Barras de la ventana, el período elegido con su desglose y la navegación entre ventanas. */
export function PeriodView({ granularity, onOpenMovements }: PeriodViewProps) {
  const [offset, setOffset] = useState(0);
  const [selection, setSelection] = useState<HistorySelection | null>(null);
  const timeZone = useTimeZone();
  const { query } = useHistory(granularity, offset);
  // Granularidad de los datos mostrados: difiere de la pedida solo mientras llegan los nuevos.
  const shown = query.data?.granularity ?? granularity;
  const currentIso = toIsoDate(periodStartOf(shown, toLocalDate(new Date(), timeZone)));
  const buckets = query.data?.buckets ?? [];
  // La barra elegida vale solo para los datos en pantalla: si llegan otros, se descarta.
  const windowKey = windowKeyOf(shown, buckets[0]?.startIso);
  const selectedIso = selectedStartFor(selection, windowKey) ?? defaultSelectedIso(buckets, currentIso);
  const selectedBucket = buckets.find((bucket) => bucket.startIso === selectedIso);
  const categories = useCategorySpending(selectedIso === null ? null : breakdownRange(shown, selectedIso));
  // Nunca cifras de otro período bajo el título nuevo: mientras son de relleno, bloques.
  const breakdown = categories.isPlaceholderData ? undefined : categories.data;
  const empty = buckets.every((bucket) => bucket.totalDop === 0);

  const move = (delta: number) => {
    setOffset((current) => current + delta);
    setSelection(null);
  };

  if (query.isError) {
    return <ErrorLine onRetry={() => void query.refetch()} retrying={query.isFetching} />;
  }
  if (!query.isSuccess) {
    return (
      <div className="history-placeholders">
        <Placeholder width="100%" height={180} />
        <Placeholder width="100%" height={56} />
      </div>
    );
  }

  return (
    <>
      <HistoryBars
        granularity={shown}
        buckets={buckets}
        selectedIso={selectedIso}
        onSelect={(startIso) => setSelection({ windowKey, startIso })}
      />
      {empty && <p className="empty">Aún no hay gastos en estos períodos.</p>}
      <div className="history-window">
        <Button variant="secondary" onClick={() => move(1)}>
          ‹ Anteriores
        </Button>
        {offset > 0 && (
          <Button variant="secondary" onClick={() => move(-1)}>
            Siguientes ›
          </Button>
        )}
      </div>
      {selectedBucket && (
        <>
          <h2 className="history-period-title">{periodTitle(shown, selectedBucket.start)}</h2>
          <p className="month-total">{formatMoney(selectedBucket.totalDop, 'DOP')}</p>
          <p className="month-count">{expenseCountLabel(selectedBucket.txCount)}</p>
          <Button
            variant="secondary"
            className="history-open"
            onClick={() => onOpenMovements(viewForPeriod(shown, selectedBucket.start, undefined, timeZone))}
          >
            Ver estos gastos
          </Button>
          <CategoryList
            data={breakdown}
            emptyText="Sin gastos en este período."
            onOpen={(categoryId) => onOpenMovements(viewForPeriod(shown, selectedBucket.start, categoryId, timeZone))}
          />
        </>
      )}
    </>
  );
}
