import { useState, type FormEvent } from 'react';
import { useRemoveBudget, useSaveBudget } from '@/features/budgets/hooks';
import { removeBudgetPrompt } from '@/features/budgets/text';
import { textToCents } from '@/features/transactions/amount-input';
import { SAVE_ERROR } from '@/features/transactions/messages';
import type { BudgetPeriod } from '@/types/database';
import { Button } from '../ui/Button';
import { ConfirmButton } from '../ui/ConfirmButton';
import { isAmountText, sanitizeAmountText } from '../ui/amount-text';
import { limitText } from './budget-text';

interface BudgetLimitFormProps {
  period: BudgetPeriod;
  limit: number | null;
  onNotice: (message: string) => void;
}

/** Campo del límite y sus botones. BudgetBlock lo monta con `key` = límite guardado: la precarga se renueva al guardar. */
export function BudgetLimitForm({ period, limit, onNotice }: BudgetLimitFormProps) {
  const [text, setText] = useState(limitText(limit));
  const [error, setError] = useState<string | null>(null);
  const save = useSaveBudget();
  const remove = useRemoveBudget();
  const prompt = removeBudgetPrompt(period);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!isAmountText(text) || save.isPending) return;
    setError(null);
    save.mutate(
      { period, limitCents: textToCents(text) },
      { onSuccess: () => onNotice('Presupuesto guardado'), onError: () => setError(SAVE_ERROR) },
    );
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
        <Button type="submit" disabled={!isAmountText(text) || save.isPending || remove.isPending}>
          {save.isPending ? 'Guardando…' : 'Guardar'}
        </Button>
        {limit !== null && (
          <ConfirmButton
            label="Quitar presupuesto"
            question={prompt.title}
            detail={prompt.message}
            confirmLabel="Quitar presupuesto"
            pending={remove.isPending || save.isPending}
            onConfirm={() => {
              setError(null);
              remove.mutate(period, { onSuccess: () => onNotice('Presupuesto quitado'), onError: () => setError(SAVE_ERROR) });
            }}
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
