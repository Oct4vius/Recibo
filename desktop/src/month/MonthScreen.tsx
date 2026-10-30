import { useEffect, useState } from 'react';
import { AddExpensePanel } from '../expense/AddExpensePanel';
import { ErrorLine } from '../ui/ErrorLine';
import { Notice } from '../ui/Notice';
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
  const [adding, setAdding] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 3000);
    return () => clearTimeout(timer);
  }, [saved]);
  // Con keepPreviousData, los datos del mes anterior no se muestran bajo el título nuevo: mientras son de relleno, bloques.
  const summary = month.summary.isPlaceholderData ? undefined : month.summary.data;
  const breakdown = month.categories.isPlaceholderData ? undefined : month.categories.data;

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
        <ErrorLine onRetry={month.retry} retrying={month.retrying} />
      ) : (
        <>
          {month.isCurrent && summary && month.budgetsReady && (
            <BudgetBar spentDop={summary.totalDop} limitDop={month.monthlyLimit} />
          )}
          <CategoryList data={breakdown} isCurrent={month.isCurrent} start={month.start} />
        </>
      )}
      <AddExpensePanel
        open={adding}
        timeZone={month.timeZone}
        onClose={() => setAdding(false)}
        onSaved={() => {
          setAdding(false);
          setSaved(true);
        }}
      />
      <Notice message={saved ? 'Gasto guardado' : null} />
    </div>
  );
}
