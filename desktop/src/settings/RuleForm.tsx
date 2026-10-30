import { useState } from 'react';
import type { RuleInput } from '@/features/rules/api';
import type { Rule } from '@/features/rules/mapping';
import { MATCH_FIELD_LABELS, MAX_RULE_PATTERN, rulePatternError, type MatchField } from '@/features/rules/presentation';
import { CategorySelect } from '../expense/CategorySelect';
import { Button } from '../ui/Button';

const MATCH_FIELDS: readonly MatchField[] = ['merchant', 'counterparty_last4'];

interface RuleFormProps {
  /** null = regla nueva. */
  rule: Rule | null;
  saving: boolean;
  /** Cualquier acción del panel en curso: no se puede guardar ni cancelar. */
  busy: boolean;
  /** Error del servidor al guardar. */
  serverError: string | null;
  onSave: (input: RuleInput) => void;
  onCancel: () => void;
}

export function RuleForm({ rule, saving, busy, serverError, onSave, onCancel }: RuleFormProps) {
  const [matchField, setMatchField] = useState<MatchField>(rule?.matchField ?? 'merchant');
  const [pattern, setPattern] = useState(rule?.pattern ?? '');
  const [categoryId, setCategoryId] = useState<string | null>(rule?.categoryId ?? null);
  const [invalid, setInvalid] = useState<string | null>(null);
  const error = invalid ?? serverError;
  const account = matchField === 'counterparty_last4';

  return (
    <form
      className="expense-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (busy) return;
        const problem = rulePatternError(matchField, pattern);
        if (problem || !categoryId) {
          setInvalid(problem ?? 'Elige una categoría.');
          return;
        }
        onSave({ id: rule?.id, matchField, pattern, categoryId });
      }}
    >
      <div className="match-options" role="group" aria-label="Buscar en">
        {MATCH_FIELDS.map((field) => (
          <Button
            key={field}
            variant="secondary"
            className="match-option"
            aria-pressed={matchField === field}
            onClick={() => {
              setMatchField(field);
              setInvalid(null);
            }}
          >
            {MATCH_FIELD_LABELS[field]}
          </Button>
        ))}
      </div>
      <label className="field">
        {account ? 'Últimos 4 dígitos de la cuenta' : 'Texto del comercio'}
        <input
          type="text"
          inputMode={account ? 'numeric' : 'text'}
          value={pattern}
          maxLength={account ? 4 : MAX_RULE_PATTERN}
          autoFocus
          onChange={(event) => {
            setPattern(event.target.value);
            setInvalid(null);
          }}
        />
      </label>
      <CategorySelect
        value={categoryId}
        noneLabel="Elige una categoría"
        onChange={(id) => {
          setCategoryId(id);
          setInvalid(null);
        }}
      />
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
