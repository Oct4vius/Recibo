import type { TransactionListItem } from '@/features/transactions/mapping';
import { SAVE_ERROR } from '@/features/transactions/messages';
import { canToggleIgnored, needsReview } from '@/features/transactions/review';
import { Button } from '../ui/Button';
import { ConfirmButton } from '../ui/ConfirmButton';

interface MovementActionsProps {
  item: TransactionListItem;
  busy: boolean;
  deleting: boolean;
  failed: boolean;
  onToggleIgnored: () => void;
  onReview: () => void;
  onDelete: () => void;
}

/** Lo que se puede hacer con el movimiento además de editarlo. */
export function MovementActions({ item, busy, deleting, failed, onToggleIgnored, onReview, onDelete }: MovementActionsProps) {
  return (
    <div className="movement-actions">
      {needsReview(item) && (
        <div className="movement-action">
          <p>El banco devolvió este dinero, pero no encontramos la compra.</p>
          <Button variant="secondary" onClick={onReview} disabled={busy}>
            Ya lo revisé
          </Button>
        </div>
      )}
      {canToggleIgnored(item) && (
        <Button variant="secondary" onClick={onToggleIgnored} disabled={busy}>
          {item.isIgnored ? 'Volver a contar este gasto' : 'No contar este gasto'}
        </Button>
      )}
      {item.source === 'manual' && (
        <ConfirmButton
          label="Borrar este gasto"
          question="¿Borrar este gasto?"
          detail="No se puede deshacer."
          confirmLabel="Sí, borrar"
          pending={deleting}
          onConfirm={onDelete}
        />
      )}
      {failed && (
        <p className="form-error" role="alert">
          {SAVE_ERROR}
        </p>
      )}
    </div>
  );
}
