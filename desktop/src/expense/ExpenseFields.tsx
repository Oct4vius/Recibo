import { currencySymbol } from '@/lib/money';
import type { Currency } from '@/types/database';
import { sanitizeAmountText } from '../ui/amount-text';
import { CategorySelect } from './CategorySelect';
import type { ExpenseForm } from './expense-form';

const CURRENCIES: readonly Currency[] = ['DOP', 'USD'];

interface ExpenseFieldsProps {
  form: ExpenseForm;
  /** Hoy (YYYY-MM-DD) en la zona del perfil: la fecha no puede ser posterior. */
  today: string;
  /** El monto toma el foco al abrir el panel. */
  autoFocusAmount?: boolean;
  onChange: (patch: Partial<ExpenseForm>) => void;
}

/** Los cinco campos de un gasto: monto, moneda, comercio, categoría y fecha. */
export function ExpenseFields({ form, today, autoFocusAmount = false, onChange }: ExpenseFieldsProps) {
  return (
    <>
      <label className="field">
        Monto
        <input
          className="expense-amount"
          autoFocus={autoFocusAmount}
          inputMode="decimal"
          autoComplete="off"
          value={form.amountText}
          onChange={(event) => onChange({ amountText: sanitizeAmountText(event.target.value) })}
        />
      </label>
      <div className="field" role="group" aria-label="Moneda">
        Moneda
        <div className="expense-currency">
          {CURRENCIES.map((currency) => (
            <button
              key={currency}
              type="button"
              className="expense-currency-option"
              aria-pressed={form.currency === currency}
              onClick={() => onChange({ currency })}
            >
              {currencySymbol(currency)}
            </button>
          ))}
        </div>
      </div>
      <label className="field">
        Comercio (opcional)
        <input value={form.merchant} autoComplete="off" onChange={(event) => onChange({ merchant: event.target.value })} />
      </label>
      <CategorySelect value={form.categoryId} onChange={(categoryId) => onChange({ categoryId })} />
      <label className="field">
        Fecha
        <input type="date" value={form.date} max={today} onChange={(event) => onChange({ date: event.target.value })} />
      </label>
    </>
  );
}
