import { SlamSheet } from '@/components/SlamSheet';
import type { TransactionListItem } from '../mapping';
import { ExpenseForm } from './ExpenseForm';

interface Props {
  visible: boolean;
  /** null = gasto nuevo. */
  item: TransactionListItem | null;
  onClose: (notice?: string) => void;
}

/** Panel de gasto. `SlamSheet` desmonta el contenido al cerrarse, así que cada apertura empieza limpia. */
export function ExpenseSheet({ visible, item, onClose }: Props) {
  return (
    <SlamSheet visible={visible} onClose={() => onClose()} title={item ? 'EDITAR GASTO' : 'NUEVO GASTO'}>
      <ExpenseForm key={item?.id ?? 'new'} item={item ?? undefined} onDone={onClose} />
    </SlamSheet>
  );
}
