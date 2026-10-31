import { useState } from 'react';
import { passwordChangeError } from '@/features/auth/password';
import { Button } from '../ui/Button';

interface PasswordFormProps {
  saving: boolean;
  /** Error del servidor al guardar. */
  serverError: string | null;
  onSave: (input: { current: string; next: string }) => void;
  onCancel: () => void;
}

export function PasswordForm({ saving, serverError, onSave, onCancel }: PasswordFormProps) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [invalid, setInvalid] = useState<string | null>(null);
  const error = invalid ?? serverError;
  const edit = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setInvalid(null);
  };

  return (
    <form
      className="expense-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (saving) return;
        const problem = passwordChangeError({ current, next, repeat });
        if (problem) {
          setInvalid(problem);
          return;
        }
        onSave({ current, next });
      }}
    >
      <label className="field">
        Contraseña actual
        <input
          type="password"
          value={current}
          autoComplete="current-password"
          autoFocus
          onChange={(event) => edit(setCurrent)(event.target.value)}
        />
      </label>
      <label className="field">
        Nueva contraseña
        <input type="password" value={next} autoComplete="new-password" onChange={(event) => edit(setNext)(event.target.value)} />
      </label>
      <label className="field">
        Repite la nueva contraseña
        <input
          type="password"
          value={repeat}
          autoComplete="new-password"
          onChange={(event) => edit(setRepeat)(event.target.value)}
        />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="expense-actions">
        <Button type="submit" disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar'}
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
