import { useState } from 'react';
import type { CategoryInput } from '@/features/categories/api';
import type { Category } from '@/features/categories/mapping';
import { categoryNameError, MAX_CATEGORY_NAME } from '@/features/categories/validation';
import { Button } from '../ui/Button';

interface CategoryFormProps {
  /** null = categoría nueva. */
  category: Category | null;
  saving: boolean;
  /** Cualquier acción del panel en curso: no se puede guardar ni cancelar. */
  busy: boolean;
  /** Error del servidor al guardar. */
  serverError: string | null;
  onSave: (input: CategoryInput) => void;
  onCancel: () => void;
}

export function CategoryForm({ category, saving, busy, serverError, onSave, onCancel }: CategoryFormProps) {
  const [name, setName] = useState(category?.name ?? '');
  const [countsAsSpending, setCountsAsSpending] = useState(category?.countsAsSpending ?? true);
  const [invalid, setInvalid] = useState<string | null>(null);
  const error = invalid ?? serverError;

  return (
    <form
      className="expense-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (busy) return;
        const problem = categoryNameError(name);
        if (problem) {
          setInvalid(problem);
          return;
        }
        onSave({ id: category?.id, name, countsAsSpending });
      }}
    >
      <label className="field">
        Nombre
        <input
          type="text"
          value={name}
          maxLength={MAX_CATEGORY_NAME}
          autoFocus
          onChange={(event) => {
            setName(event.target.value);
            setInvalid(null);
          }}
        />
      </label>
      <label className="settings-check">
        <input type="checkbox" checked={countsAsSpending} onChange={(event) => setCountsAsSpending(event.target.checked)} />
        Cuenta como gasto
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="expense-actions">
        <Button type="submit" disabled={busy}>
          {saving ? 'Guardando…' : 'Guardar'}
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
