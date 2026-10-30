import { useEffect } from 'react';
import type { Rule } from '@/features/rules/mapping';
import { useDeleteRule, useSaveRule } from '@/features/rules/hooks';
import { appliedRuleText, ruleErrorMessage } from '@/features/rules/presentation';
import { SAVE_ERROR } from '@/features/transactions/messages';
import '../expense/add-expense.css';
import { ConfirmButton } from '../ui/ConfirmButton';
import { SidePanel } from '../ui/SidePanel';
import { RuleForm } from './RuleForm';

interface RulePanelProps {
  /** La regla abierta (null = nueva); se conserva mientras el panel sale. */
  rule: Rule | null;
  open: boolean;
  onClose: () => void;
  onDone: (notice: string) => void;
}

/** Panel de una regla. Las mutaciones viven aquí para que sus avisos lleguen aunque el panel se cierre. */
export function RulePanel({ rule, open, onClose, onDone }: RulePanelProps) {
  const save = useSaveRule();
  const remove = useDeleteRule();
  const busy = save.isPending || remove.isPending;

  const { reset: resetSave } = save;
  const { reset: resetRemove } = remove;
  useEffect(() => {
    if (!open) return;
    resetSave();
    resetRemove();
  }, [open, rule?.id, resetSave, resetRemove]);

  return (
    <SidePanel open={open} title={rule ? 'Tu regla' : 'Nueva regla'} onClose={onClose} busy={busy}>
      <RuleForm
        key={rule?.id ?? 'new'}
        rule={rule}
        saving={save.isPending}
        busy={busy}
        serverError={save.isError ? ruleErrorMessage(save.error) : null}
        onSave={(input) => save.mutate(input, { onSuccess: (result) => onDone(appliedRuleText(result.appliedCount)) })}
        onCancel={onClose}
      />
      {rule && (
        <div className="settings-delete">
          <ConfirmButton
            label="Borrar regla"
            question="¿Borrar esta regla?"
            detail="Los movimientos ya categorizados no cambian."
            confirmLabel="Sí, borrar"
            pending={busy}
            onConfirm={() => remove.mutate(rule.id, { onSuccess: () => onDone('Regla borrada') })}
          />
          {remove.isError && (
            <p className="form-error" role="alert">
              {SAVE_ERROR}
            </p>
          )}
        </div>
      )}
    </SidePanel>
  );
}
