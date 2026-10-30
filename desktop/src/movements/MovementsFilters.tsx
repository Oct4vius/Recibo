import { useCategories } from '@/features/categories/hooks';
import { addMonths, type LocalDate } from '@/lib/dates';
import { BANK_LABELS, countLabel, UNCATEGORIZED } from '@/features/transactions/filters';
import type { BankCode } from '@/types/database';
import { MonthNav } from '../month/MonthNav';
import { nextMonth } from '../month/month-nav';
import { monthTitle } from '../month/month-text';
import { Button } from '../ui/Button';
import { defaultMovementsView, hasFilters, type MovementsView } from './movements-view';

interface MovementsFiltersProps {
  view: MovementsView;
  /** Primer día del mes actual. */
  current: LocalDate;
  /** undefined = todavía no llega. */
  count: number | undefined;
  onChange: (view: MovementsView) => void;
}

const BANKS = Object.keys(BANK_LABELS) as BankCode[];

/** Filtros siempre visibles: mes, categoría, banco y "por revisar". */
export function MovementsFilters({ view, current, count, onChange }: MovementsFiltersProps) {
  const categories = useCategories();
  const { scope } = view;
  const set = (patch: Partial<MovementsView>) => onChange({ ...view, ...patch });

  return (
    <div className="filters">
      <div className="filters-row">
        {scope.kind === 'month' ? (
          <MonthNav
            title={monthTitle(scope.start)}
            heading="h2"
            canGoNext={nextMonth(scope.start, current) !== null}
            onPrevious={() => set({ scope: { kind: 'month', start: addMonths(scope.start, -1) } })}
            onNext={() => {
              const next = nextMonth(scope.start, current);
              if (next) set({ scope: { kind: 'month', start: next } });
            }}
          />
        ) : (
          <h2 className="month-nav-title">{scope.kind === 'all' ? 'Todos los meses' : scope.period.label}</h2>
        )}
        {scope.kind !== 'all' && (
          <Button variant="secondary" onClick={() => set({ scope: { kind: 'all' } })}>
            Ver todos los meses
          </Button>
        )}
      </div>
      <div className="filters-row">
        <label className="filter-select">
          Categoría
          <select value={view.categoryId ?? ''} onChange={(event) => set({ categoryId: event.target.value || null })}>
            <option value="">Todas</option>
            {categories.data?.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
            <option value={UNCATEGORIZED}>Sin categoría</option>
          </select>
        </label>
        <label className="filter-select">
          Banco
          <select value={view.bankCode ?? ''} onChange={(event) => set({ bankCode: (event.target.value || null) as BankCode | null })}>
            <option value="">Todos</option>
            {BANKS.map((code) => (
              <option key={code} value={code}>
                {BANK_LABELS[code]}
              </option>
            ))}
          </select>
        </label>
        <Button variant="secondary" aria-pressed={view.review} onClick={() => set({ review: !view.review })}>
          Solo por revisar
        </Button>
        {hasFilters(view, current) && (
          <Button variant="secondary" onClick={() => onChange(defaultMovementsView(current))}>
            Quitar filtros
          </Button>
        )}
      </div>
      <p className="filters-count" aria-live="polite">
        {count === undefined ? '' : countLabel(count)}
      </p>
    </div>
  );
}
