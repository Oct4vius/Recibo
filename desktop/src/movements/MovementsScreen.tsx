import { useState } from 'react';
import { useTimeZone } from '@/features/profile/hooks';
import { groupByDay } from '@/features/transactions/grouping';
import { useTransactionList } from '@/features/transactions/hooks';
import { monthStart, toLocalDate } from '@/lib/dates';
import { AddExpensePanel } from '../expense/AddExpensePanel';
import { Button } from '../ui/Button';
import { ErrorLine } from '../ui/ErrorLine';
import { Notice } from '../ui/Notice';
import { Placeholder } from '../ui/Placeholder';
import { useNotice } from '../ui/use-notice';
import { MovementRow } from './MovementRow';
import { MovementsFilters } from './MovementsFilters';
import { dayHeading, emptyMovementsText } from './movements-text';
import { defaultMovementsView, toFilters, type MovementsView } from './movements-view';
import './movements.css';

interface MovementsScreenProps {
  /** Vista con la que se llegó (p. ej. una categoría); null = el mes actual sin filtros. */
  initial: MovementsView | null;
}

export function MovementsScreen({ initial }: MovementsScreenProps) {
  const timeZone = useTimeZone();
  const current = monthStart(toLocalDate(new Date(), timeZone));
  const [view, setView] = useState<MovementsView>(() => initial ?? defaultMovementsView(current));
  const [adding, setAdding] = useState(false);
  const { notice, show } = useNotice();
  const list = useTransactionList(toFilters(view, timeZone));

  const items = list.data?.pages.flatMap((page) => page.items) ?? [];
  const entries = groupByDay(items, new Date(), timeZone, dayHeading);
  const loadingFirst = list.isPending;

  return (
    <div className="movements-screen">
      <header className="movements-header">
        <h1>Movimientos</h1>
        <Button variant="primary" onClick={() => setAdding(true)}>
          ＋ Agregar gasto
        </Button>
      </header>
      <MovementsFilters view={view} current={current} count={list.data?.pages[0]?.count ?? undefined} onChange={setView} />
      {list.isError && !list.data ? (
        <ErrorLine onRetry={() => void list.refetch()} retrying={list.isFetching} />
      ) : loadingFirst ? (
        <div className="movements-placeholders">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Placeholder key={i} width="100%" height={64} />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <p className="empty">{emptyMovementsText(view, current)}</p>
      ) : (
        <>
          <ul className="movements-list">
            {entries.map((entry) =>
              entry.kind === 'header' ? (
                <li key={entry.key} className="day-heading">
                  <h2>{entry.title}</h2>
                </li>
              ) : (
                <li key={entry.key}>
                  <MovementRow item={entry.item} onPress={() => undefined} />
                </li>
              ),
            )}
          </ul>
          {list.isFetchNextPageError && (
            <ErrorLine onRetry={() => void list.fetchNextPage()} retrying={list.isFetchingNextPage} />
          )}
          {list.hasNextPage && !list.isFetchNextPageError && (
            <Button variant="secondary" className="movements-more" onClick={() => void list.fetchNextPage()} disabled={list.isFetchingNextPage}>
              {list.isFetchingNextPage ? 'Cargando…' : 'Ver más movimientos'}
            </Button>
          )}
        </>
      )}
      <AddExpensePanel
        open={adding}
        timeZone={timeZone}
        onClose={() => setAdding(false)}
        onSaved={() => {
          setAdding(false);
          show('Gasto guardado');
        }}
      />
      <Notice message={notice} />
    </div>
  );
}
