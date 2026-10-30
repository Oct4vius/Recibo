import { useState, type FormEvent } from 'react';
import { useUpdateProfile } from '@/features/profile/hooks';
import { textToCents } from '@/features/transactions/amount-input';
import { SAVE_ERROR } from '@/features/transactions/messages';
import '../budget/budget.css';
import { limitText } from '../budget/budget-text';
import { Button } from '../ui/Button';
import { isAmountText, sanitizeAmountText } from '../ui/amount-text';

export function RateForm({ rate, onNotice }: { rate: number; onNotice: (message: string) => void }) {
  const [text, setText] = useState(limitText(rate));
  const [error, setError] = useState<string | null>(null);
  const update = useUpdateProfile();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!isAmountText(text) || update.isPending) return;
    setError(null);
    update.mutate(
      { usd_rate: textToCents(text) / 100 },
      { onSuccess: () => onNotice('Tasa guardada'), onError: () => setError(SAVE_ERROR) },
    );
  };

  return (
    <form className="budget-form" onSubmit={submit}>
      <label className="field">
        Pesos por cada US$ 1
        <input
          className="budget-amount"
          inputMode="decimal"
          autoComplete="off"
          value={text}
          onChange={(event) => setText(sanitizeAmountText(event.target.value))}
        />
      </label>
      <div className="budget-actions">
        <Button type="submit" disabled={!isAmountText(text) || update.isPending}>
          {update.isPending ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
