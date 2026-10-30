import { shareOf, type CategoryBreakdownData } from '@/features/history/categories';
import { categoryAccessibilityLabel, shareLabel } from '@/features/history/labels';
import { formatMoney } from '@/lib/money';
import { Placeholder } from '../ui/Placeholder';

interface CategoryListProps {
  /** undefined = todavía no llega. */
  data: CategoryBreakdownData | undefined;
  /** Texto cuando no hay gastos. */
  emptyText: string;
  /** Si existe, cada fila es un botón que abre los movimientos de esa categoría (null = sin categoría). */
  onOpen?: (categoryId: string | null) => void;
}

export function CategoryList({ data, emptyText, onOpen }: CategoryListProps) {
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
        <p className="empty">{emptyText}</p>
      ) : (
        <ul className="cat-list">
          {data.items.map((item) => (
            <li key={item.categoryId ?? 'none'}>
              <button
                type="button"
                className={item.categoryId === null ? 'cat cat-none' : 'cat'}
                aria-label={categoryAccessibilityLabel(item, data.total)}
                onClick={() => onOpen?.(item.categoryId)}
              >
                <span className="cat-name">{item.name}</span>
                <span className="cat-amount">{formatMoney(item.totalDop, 'DOP')}</span>
                <span className="cat-track">
                  <span className="cat-fill" style={{ transform: `scaleX(${shareOf(item.totalDop, data.total)})` }} />
                </span>
                <span className="cat-pct">{shareLabel(item.totalDop, data.total)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
