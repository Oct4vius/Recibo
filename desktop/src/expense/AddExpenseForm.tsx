import { useState } from 'react';
import type { NewExpense } from '@/features/transactions/api';
import { SAVE_ERROR } from '@/features/transactions/messages';
import { toIsoDate, toLocalDate } from '@/lib/dates';
import { Button } from '../ui/Button';
import { ExpenseFields } from './ExpenseFields';
import { canSaveExpense, toNewExpense, type ExpenseForm } from './expense-form';
import './add-expense.css';

interface AddExpenseFormProps {
  timeZone: string;
  saving: boolean;
  failed: boolean;
  onSave: (expense: NewExpense) => void;
  onCancel: () => void;
}

/** Campos del gasto nuevo. Vive dentro del panel: al cerrarse se desmonta y el siguiente gasto empieza limpio. */
export function AddExpenseForm({ timeZone, saving, failed, onSave, onCancel }: AddExpenseFormProps) {
  const today = toIsoDate(toLocalDate(new Date(), timeZone));
  const [form, setForm] = useState<ExpenseForm>({ amountText: '', currency: 'DOP', merchant: '', categoryId: null, date: today });
  const canSave = canSaveExpense(form, today) && !saving;

  return (
    <form
      className="expense-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSave) onSave(toNewExpense(form, timeZone));
      }}
    >
      <ExpenseFields form={form} today={today} autoFocusAmount onChange={(patch) => setForm((current) => ({ ...current, ...patch }))} />
      {failed && (
        <p className="form-error" role="alert">
          {SAVE_ERROR}
        </p>
      )}
      <div className="expense-actions">
        <Button type="submit" disabled={!canSave}>
          {saving ? 'Guardando…' : 'Guardar'}
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
