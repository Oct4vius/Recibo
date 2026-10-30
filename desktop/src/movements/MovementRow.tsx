import type { TransactionListItem } from '@/features/transactions/mapping';
import { formatApprox, formatMoney } from '@/lib/money';
import { presentMovement } from './movements-text';

interface MovementRowProps {
  item: TransactionListItem;
  onPress: (item: TransactionListItem) => void;
}

/** Una fila de la lista; el monto va en su moneda y, si es en dólares, con su equivalente en pesos. */
export function MovementRow({ item, onPress }: MovementRowProps) {
  const row = presentMovement(item);
  return (
    <button type="button" className={row.muted ? 'movement movement-muted' : 'movement'} onClick={() => onPress(item)}>
      <span className="movement-main">
        <span className="movement-title">{row.title}</span>
        <span className="movement-sub">
          {row.subtitle}
          {row.badge && <span className="movement-badge">{row.badge}</span>}
        </span>
      </span>
      <span className="movement-money">
        <span className="movement-amount">{formatMoney(row.amount, item.currency)}</span>
        {row.approxDop !== undefined && <span className="movement-approx">{formatApprox(row.approxDop, 'DOP')}</span>}
      </span>
    </button>
  );
}
