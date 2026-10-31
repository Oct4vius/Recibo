import { useCategorySpending, useSpendingOverall } from '@/features/history/hooks';
import { expenseCountLabel } from '@/features/history/labels';
import { formatMoney } from '@/lib/money';
import { CategoryList } from '../month/CategoryList';
import { viewForAllTime, type MovementsView } from '../movements/movements-view';
import { Button } from '../ui/Button';
import { ErrorLine } from '../ui/ErrorLine';
import { Placeholder } from '../ui/Placeholder';
import { allTimeTitle } from './history-text';

/** Vista "Todo": total desde el primer gasto y su desglose por categoría. */
export function AllTimeView({ onOpenMovements }: { onOpenMovements: (view: MovementsView) => void }) {
  const overall = useSpendingOverall();
  const categories = useCategorySpending('all');

  if (overall.isError) return <ErrorLine onRetry={() => void overall.refetch()} retrying={overall.isFetching} />;
  if (overall.isPending) return <Placeholder width="100%" height={120} />;
  const { firstIso, totalDop, txCount } = overall.data;
  if (firstIso === null) return <p className="empty">Aún no hay gastos.</p>;

  return (
    <>
      <h2 className="history-period-title">{allTimeTitle(firstIso)}</h2>
      <p className="month-total">{formatMoney(totalDop, 'DOP')}</p>
      <p className="month-count">{expenseCountLabel(txCount)}</p>
      <Button variant="secondary" className="history-open" onClick={() => onOpenMovements(viewForAllTime(undefined))}>
        Ver estos gastos
      </Button>
      {categories.isError ? (
        <ErrorLine onRetry={() => void categories.refetch()} retrying={categories.isFetching} />
      ) : (
        <CategoryList
          data={categories.data}
          emptyText="Sin gastos en este período."
          onOpen={(categoryId) => onOpenMovements(viewForAllTime(categoryId))}
        />
      )}
    </>
  );
}
