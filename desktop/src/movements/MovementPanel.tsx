import { useEffect } from 'react';
import type { RuleInput } from '@/features/rules/api';
import { useSaveRule } from '@/features/rules/hooks';
import { RULE_SAVE_FAILED, ruleNotice } from '@/features/rules/offer';
import type { ExpenseChanges } from '@/features/transactions/api';
import { useDeleteExpense, useMarkReviewed, useSetIgnored, useUpdateExpense } from '@/features/transactions/hooks';
import type { TransactionListItem } from '@/features/transactions/mapping';
import { SidePanel } from '../ui/SidePanel';
import { MovementActions } from './MovementActions';
import { MovementForm } from './MovementForm';

interface MovementPanelProps {
  /** El movimiento abierto; se conserva mientras el panel sale para que no se vacíe a media animación. */
  item: TransactionListItem | null;
  open: boolean;
  timeZone: string;
  onClose: () => void;
  /** Toda acción que termina cierra el panel y deja este aviso. */
  onDone: (notice: string) => void;
}

/**
 * Panel de un movimiento. Las mutaciones viven aquí (no en los hijos): sus avisos llegan aunque el panel se
 * cierre y así se sabe cuándo está ocupado.
 */
export function MovementPanel({ item, open, timeZone, onClose, onDone }: MovementPanelProps) {
  const update = useUpdateExpense();
  const saveRule = useSaveRule();
  const setIgnored = useSetIgnored();
  const markReviewed = useMarkReviewed();
  const remove = useDeleteExpense();
  const busy = update.isPending || saveRule.isPending || setIgnored.isPending || markReviewed.isPending || remove.isPending;

  // Un error de la vez anterior no se arrastra al siguiente movimiento. Los `reset` de TanStack Query son estables.
  const { reset: resetUpdate } = update;
  const { reset: resetSetIgnored } = setIgnored;
  const { reset: resetMarkReviewed } = markReviewed;
  const { reset: resetRemove } = remove;
  useEffect(() => {
    if (!open) return;
    resetUpdate();
    resetSetIgnored();
    resetMarkReviewed();
    resetRemove();
  }, [open, item?.id, resetUpdate, resetSetIgnored, resetMarkReviewed, resetRemove]);

  // Primero se guarda el gasto y luego la regla; el fallo de la regla no deshace el gasto.
  const save = (changes: ExpenseChanges, rule: RuleInput | null) => {
    if (!item) return;
    update.mutate(
      { id: item.id, changes },
      {
        onSuccess: () => {
          if (!rule) {
            onDone('Gasto guardado');
            return;
          }
          saveRule.mutate(rule, {
            onSuccess: (result) => onDone(ruleNotice(result.appliedCount)),
            onError: () => onDone(RULE_SAVE_FAILED),
          });
        },
      },
    );
  };

  return (
    <SidePanel open={open} title="Este gasto" onClose={onClose} busy={busy}>
      {item && (
        <>
          <MovementForm
            key={item.id}
            item={item}
            timeZone={timeZone}
            saving={update.isPending || saveRule.isPending}
            failed={update.isError}
            busy={busy}
            onSave={save}
            onCancel={onClose}
          />
          <MovementActions
            item={item}
            busy={busy}
            failed={setIgnored.isError || markReviewed.isError || remove.isError}
            onToggleIgnored={() =>
              setIgnored.mutate(
                { id: item.id, ignored: !item.isIgnored },
                { onSuccess: () => onDone(item.isIgnored ? 'Este gasto vuelve a contar' : 'Este gasto ya no cuenta') },
              )
            }
            onReview={() => markReviewed.mutate(item.id, { onSuccess: () => onDone('Marcado como revisado') })}
            onDelete={() => remove.mutate(item.id, { onSuccess: () => onDone('Gasto borrado') })}
          />
        </>
      )}
    </SidePanel>
  );
}
