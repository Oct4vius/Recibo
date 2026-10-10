import { memo } from 'react';
import { SkewRow } from '@/components/SkewRow';
import { presentRow, type TransactionListItem } from '../mapping';

interface Props {
  item: TransactionListItem;
  onPress: (item: TransactionListItem) => void;
}

/** Fila de un movimiento (monto en su moneda original); tocarla abre el panel de edición. */
export const TransactionRow = memo(function TransactionRow({ item, onPress }: Props) {
  const row = presentRow(item);
  return (
    <SkewRow
      title={row.title}
      subtitle={row.subtitle}
      badge={row.badge}
      muted={row.muted}
      amount={{ value: item.amount, currency: item.currency }}
      onPress={() => onPress(item)}
    />
  );
});
