import { useState } from 'react';
import { useCategories } from '@/features/categories/hooks';
import { useCreateExpense } from '@/features/transactions/hooks';
import { SAVE_ERROR } from '@/features/transactions/messages';
import { toIsoDate, toLocalDate } from '@/lib/dates';
import { currencySymbol } from '@/lib/money';
import type { Currency } from '@/types/database';
import { Button } from '../ui/Button';
import { canSaveExpense, sanitizeAmountText, toNewExpense, type ExpenseForm } from './expense-form';
import './add-expense.css';

const CURRENCIES: readonly Currency[] = ['DOP', 'USD'];

interface AddExpenseFormProps {
  timeZone: string;
  onSaved: () => void;
  onCancel: () => void;
}

/** Campos y guardado del gasto. Vive dentro del panel: al cerrarse se desmonta y el siguiente gasto empieza limpio. */
export function AddExpenseForm({ timeZone, onSaved, onCancel }: AddExpenseFormProps) {
  const today = toIsoDate(toLocalDate(new Date(), timeZone));
  const [form, setForm] = useState<ExpenseForm>({ amountText: '', currency: 'DOP', merchant: '', categoryId: null, date: today });
  const categories = useCategories();
  const save = useCreateExpense();
  const set = (patch: Partial<ExpenseForm>) => setForm((current) => ({ ...current, ...patch }));
  const canSave = canSaveExpense(form, today) && !save.isPending;

  return (
    <form
      className="expense-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSave) save.mutate(toNewExpense(form, timeZone), { onSuccess: onSaved });
      }}
    >
      <label className="field">
        Monto
        <input
          className="expense-amount"
          autoFocus
          inputMode="decimal"
          autoComplete="off"
          value={form.amountText}
          onChange={(event) => set({ amountText: sanitizeAmountText(event.target.value) })}
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
              onClick={() => set({ currency })}
            >
              {currencySymbol(currency)}
            </button>
          ))}
        </div>
      </div>
      <label className="field">
        Comercio (opcional)
        <input value={form.merchant} autoComplete="off" onChange={(event) => set({ merchant: event.target.value })} />
      </label>
      <label className="field">
        Categoría
        <select
          value={form.categoryId ?? ''}
          onChange={(event) => set({ categoryId: event.target.value === '' ? null : event.target.value })}
        >
          <option value="">Sin categoría</option>
          {(categories.data ?? []).map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Fecha
        <input type="date" value={form.date} max={today} onChange={(event) => set({ date: event.target.value })} />
      </label>
      {save.isError && (
        <p className="form-error" role="alert">
          {SAVE_ERROR}
        </p>
      )}
      <div className="expense-actions">
        <Button type="submit" disabled={!canSave}>
          {save.isPending ? 'Guardando…' : 'Guardar'}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
