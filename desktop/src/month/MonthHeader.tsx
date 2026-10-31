import { formatMoney } from '@/lib/money';
import { Button } from '../ui/Button';
import { Placeholder } from '../ui/Placeholder';
import { MonthNav } from './MonthNav';

interface MonthHeaderProps {
  title: string;
  /** null = todavía no llega. */
  totalDop: number | null;
  countLine: string | null;
  canGoNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onAddExpense: () => void;
}

export function MonthHeader({ title, totalDop, countLine, canGoNext, onPrevious, onNext, onAddExpense }: MonthHeaderProps) {
  return (
    <header className="month-header">
      <div>
        <MonthNav title={title} heading="h1" canGoNext={canGoNext} onPrevious={onPrevious} onNext={onNext} />
        {totalDop === null ? (
          <div className="month-total-slot">
            <Placeholder width={260} height={48} />
          </div>
        ) : (
          <p className="month-total">{formatMoney(totalDop, 'DOP')}</p>
        )}
        {countLine === null ? <Placeholder width={200} height={20} /> : <p className="month-count">{countLine}</p>}
      </div>
      <Button variant="primary" onClick={onAddExpense}>
        ＋ Agregar gasto
      </Button>
    </header>
  );
}
