import { useState } from 'react';
import type { LocalDate } from '@/lib/dates';
import { AddExpensePanel } from '../expense/AddExpensePanel';
import { ErrorLine } from '../ui/ErrorLine';
import { Notice } from '../ui/Notice';
import { useNotice } from '../ui/use-notice';
import { BudgetBar } from './BudgetBar';
import { CategoryList } from './CategoryList';
import { useMonthData } from './hooks';
import { MonthHeader } from './MonthHeader';
import { expenseCountLine, monthTitle, noSpendingText } from './month-text';
import './month.css';

interface MonthScreenProps {
  /** `categoryId` null = gastos sin categoría; `start` es el mes que se está viendo. */
  onOpenCategory: (categoryId: string | null, start: LocalDate) => void;
  onOpenBudget: () => void;
}

export function MonthScreen({ onOpenCategory, onOpenBudget }: MonthScreenProps) {
  const month = useMonthData();
  const [adding, setAdding] = useState(false);
  const { notice, show } = useNotice();
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
            <BudgetBar spentDop={summary.totalDop} limitDop={month.monthlyLimit} onOpenBudget={onOpenBudget} />
          )}
          <CategoryList
            data={breakdown}
            emptyText={noSpendingText(month.isCurrent, month.start)}
            onOpen={(categoryId) => onOpenCategory(categoryId, month.start)}
          />
        </>
      )}
      <AddExpensePanel
        open={adding}
        timeZone={month.timeZone}
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
