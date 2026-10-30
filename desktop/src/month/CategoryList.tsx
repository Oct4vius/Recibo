import { monthName, type LocalDate } from '@/lib/dates';
import { shareOf, type CategoryBreakdownData } from '@/features/history/categories';
import { shareLabel } from '@/features/history/labels';
import { formatMoney } from '@/lib/money';
import { Placeholder } from '../ui/Placeholder';

interface CategoryListProps {
  /** undefined = todavía no llega. */
  data: CategoryBreakdownData | undefined;
  isCurrent: boolean;
  start: LocalDate;
}

export function CategoryList({ data, isCurrent, start }: CategoryListProps) {
  return (
    <section>
      <h2 className="section-title">En qué se fue</h2>
      {data === undefined ? (
        <div className="cat-placeholders">
          {[0, 1, 2, 3].map((i) => (
            <Placeholder key={i} width="100%" height={56} />
          ))}
        </div>
      ) : data.items.length === 0 ? (
        <p className="empty">{isCurrent ? 'Aún no hay gastos este mes.' : `No hubo gastos en ${monthName(start.month)}.`}</p>
      ) : (
        <ul className="cat-list">
          {data.items.map((item) => (
            <li key={item.categoryId ?? 'none'} className={item.categoryId === null ? 'cat cat-none' : 'cat'}>
              <span className="cat-name">{item.name}</span>
              <span className="cat-amount">{formatMoney(item.totalDop, 'DOP')}</span>
              <div className="cat-track">
                <div className="cat-fill" style={{ transform: `scaleX(${shareOf(item.totalDop, data.total)})` }} />
              </div>
              <span className="cat-pct">{shareLabel(item.totalDop, data.total)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
