import { useState, type FormEvent } from 'react';
import { removeBudgetPrompt } from '@/features/budgets/text';
import { textToCents } from '@/features/transactions/amount-input';
import type { BudgetPeriod } from '@/types/database';
import { Button } from '../ui/Button';
import { ConfirmButton } from '../ui/ConfirmButton';
import { isAmountText, sanitizeAmountText } from '../ui/amount-text';
import { limitText } from './budget-text';

interface BudgetLimitFormProps {
  period: BudgetPeriod;
  limit: number | null;
  saving: boolean;
  removing: boolean;
  error: string | null;
  /** Las mutaciones viven en BudgetBlock: este formulario se remonta (key) al cambiar el límite y perdería el aviso. */
  onSave: (limitCents: number) => void;
  onRemove: () => void;
}

/** Campo del límite y sus botones. BudgetBlock lo monta con `key` = límite guardado: la precarga se renueva al guardar. */
export function BudgetLimitForm({ period, limit, saving, removing, error, onSave, onRemove }: BudgetLimitFormProps) {
  const [text, setText] = useState(limitText(limit));
  const prompt = removeBudgetPrompt(period);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!isAmountText(text) || saving) return;
    onSave(textToCents(text));
  };

  return (
    <form className="budget-form" onSubmit={submit}>
      <label className="field">
        Monto
        <input
          className="budget-amount"
          inputMode="decimal"
          autoComplete="off"
          value={text}
          onChange={(event) => setText(sanitizeAmountText(event.target.value))}
        />
      </label>
      <div className="budget-actions">
        <Button type="submit" disabled={!isAmountText(text) || saving || removing}>
          {saving ? 'Guardando…' : 'Guardar'}
        </Button>
        {limit !== null && (
          <ConfirmButton
            label="Quitar presupuesto"
            question={prompt.title}
            detail={prompt.message}
            confirmLabel="Quitar presupuesto"
            pending={removing || saving}
            onConfirm={onRemove}
          />
        )}
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
