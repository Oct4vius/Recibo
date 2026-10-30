import { useActiveBudgets } from '@/features/budgets/hooks';
import { useSpendingSummary } from '@/features/summary/hooks';
import type { BudgetPeriod } from '@/types/database';
import { BudgetBar } from '../month/BudgetBar';
import { ErrorLine } from '../ui/ErrorLine';
import { Placeholder } from '../ui/Placeholder';
import { BudgetLimitForm } from './BudgetLimitForm';
import { BUDGET_TITLES } from './budget-text';

interface BudgetBlockProps {
  period: BudgetPeriod;
  onNotice: (message: string) => void;
}

/** Un período: título, barra de lo gastado y el campo del límite. */
export function BudgetBlock({ period, onNotice }: BudgetBlockProps) {
  const summary = useSpendingSummary(period);
  const budgets = useActiveBudgets();
  const failed = [summary, budgets].filter((q) => q.isError);
  const limit = budgets.data?.[period] ?? null;

  return (
    <section className="budget-block" aria-label={BUDGET_TITLES[period]}>
      <h2>{BUDGET_TITLES[period]}</h2>
      {failed.length > 0 ? (
        <ErrorLine
          onRetry={() => failed.forEach((q) => void q.refetch())}
          retrying={failed.some((q) => q.isFetching)}
        />
      ) : !summary.data || !budgets.data ? (
        <div className="budget-placeholders">
          <Placeholder width="100%" height={14} />
          <Placeholder width={160} height={20} />
          <Placeholder width={260} height={44} />
        </div>
      ) : (
        <>
          <BudgetBar spentDop={summary.data.totalDop} limitDop={limit} fillKey={`budget-${period}`} />
          <BudgetLimitForm key={String(limit)} period={period} limit={limit} onNotice={onNotice} />
        </>
      )}
    </section>
  );
}
