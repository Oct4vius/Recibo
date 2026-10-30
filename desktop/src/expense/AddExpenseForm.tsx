import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { fetchCategories } from '@/features/categories/api';
import { categoryKeys } from '@/features/categories/keys';
import { createExpense } from '@/features/transactions/api';
import { invalidateSpending } from '@/features/transactions/invalidate';
import { toIsoDate, toLocalDate } from '@/lib/dates';
import { currencySymbol } from '@/lib/money';
import type { Currency } from '@/types/database';
import { useSession } from '../session/SessionProvider';
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
  const { userId } = useSession();
  const queryClient = useQueryClient();
  const today = toIsoDate(toLocalDate(new Date(), timeZone));
  const [form, setForm] = useState<ExpenseForm>({ amountText: '', currency: 'DOP', merchant: '', categoryId: null, date: today });
  const categories = useQuery({ queryKey: categoryKeys.list(), queryFn: fetchCategories, staleTime: 5 * 60_000 });
  const save = useMutation({
    mutationFn: () => createExpense(toNewExpense(form, timeZone), userId ?? ''),
    onSuccess: () => {
      invalidateSpending(queryClient);
      onSaved();
    },
  });
  const set = (patch: Partial<ExpenseForm>) => setForm((current) => ({ ...current, ...patch }));
  const canSave = userId !== null && canSaveExpense(form, today) && !save.isPending;

  return (
    <form
      className="expense-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSave) save.mutate();
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
          No se pudo guardar. Revisa tu internet.
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
