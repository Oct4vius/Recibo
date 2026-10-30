import { useState, type FormEvent } from 'react';
import { textToCents } from '@/features/transactions/amount-input';
import '../budget/budget.css';
import { limitText } from '../budget/budget-text';
import { Button } from '../ui/Button';
import { isAmountText, sanitizeAmountText } from '../ui/amount-text';

interface RateFormProps {
  rate: number;
  saving: boolean;
  error: string | null;
  /** El guardado vive en RateSection: este formulario se remonta (key) al cambiar la tasa y perdería el aviso. */
  onSave: (usdRate: number) => void;
}

export function RateForm({ rate, saving, error, onSave }: RateFormProps) {
  const [text, setText] = useState(limitText(rate));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!isAmountText(text) || saving) return;
    onSave(textToCents(text) / 100);
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
        <Button type="submit" disabled={!isAmountText(text) || saving}>
          {saving ? 'Guardando…' : 'Guardar'}
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
