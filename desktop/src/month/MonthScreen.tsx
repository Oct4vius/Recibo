import { useState } from 'react';
import { ErrorLine } from '../ui/ErrorLine';
import { BudgetBar } from './BudgetBar';
import { CategoryList } from './CategoryList';
import { useMonthData } from './hooks';
import { MonthHeader } from './MonthHeader';
import { expenseCountLine, monthTitle } from './month-text';
import './month.css';

interface MonthScreenProps {
  /** El plan 2 lo conecta a Movimientos; por ahora las filas no son botones. */
  onOpenCategory?: (categoryId: string | null, monthStartIso: string) => void;
}

export function MonthScreen(_props: MonthScreenProps) {
  const month = useMonthData();
  // La Task 6 muestra el panel de "Agregar gasto" con este estado.
  const [, setAdding] = useState(false);
  const summary = month.summary.data;

  return (
    <div className="month-screen">
      <MonthHeader
        title={monthTitle(month.start)}
        totalDop={summary?.totalDop ?? null}
        countLine={summary ? expenseCountLine(summary.txCount, month.isCurrent, month.start) : null}
        canGoNext={month.canGoNext}
        onPrevious={month.goPrevious}
        onNext={month.goNext}
        onAddExpense={() => setAdding(true)}
      />
      {month.failed ? (
        <ErrorLine onRetry={month.retry} />
      ) : (
        <>
          {month.isCurrent && summary && !month.summary.isPlaceholderData && month.budgetsReady && (
            <BudgetBar spentDop={summary.totalDop} limitDop={month.monthlyLimit} />
          )}
          <CategoryList data={month.categories.data} isCurrent={month.isCurrent} start={month.start} />
        </>
      )}
    </div>
  );
}
