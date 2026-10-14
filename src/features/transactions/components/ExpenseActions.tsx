import { Alert, View } from 'react-native';
import { SkewButton } from '@/components/SkewButton';
import { useDeleteExpense, useMarkReviewed, useSetIgnored } from '../hooks';
import type { TransactionListItem } from '../mapping';
import { SAVE_ERROR } from '../messages';
import { canToggleIgnored, needsReview } from '../review';

interface Props {
  item: TransactionListItem;
  onDone: () => void;
  onError: (message: string) => void;
}

/** Acciones de edición: ignorar/contar (cualquier movimiento) y borrar (solo manuales, con confirmación). */
export function ExpenseActions({ item, onDone, onError }: Props) {
  const setIgnored = useSetIgnored();
  const markReviewed = useMarkReviewed();
  const remove = useDeleteExpense();
  const callbacks = { onSuccess: () => onDone(), onError: () => onError(SAVE_ERROR) };
  const confirmDelete = () =>
    Alert.alert('¿Borrar este gasto?', 'No se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Borrar', style: 'destructive', onPress: () => remove.mutate(item.id, callbacks) },
    ]);
  return (
    <View style={{ marginTop: 16 }}>
      {needsReview(item) ? (
        <SkewButton
          variant="ghost"
          label="Marcar como revisado"
          loading={markReviewed.isPending}
          onPress={() => markReviewed.mutate(item.id, callbacks)}
        />
      ) : null}
      {canToggleIgnored(item) ? (
        <SkewButton
          variant="ghost"
          label={item.isIgnored ? 'Contar este gasto' : 'Ignorar este gasto'}
          loading={setIgnored.isPending}
          onPress={() => setIgnored.mutate({ id: item.id, ignored: !item.isIgnored }, callbacks)}
        />
      ) : null}
      {item.source === 'manual' ? (
        <View style={{ marginTop: 12 }}>
          <SkewButton variant="ghost" label="Borrar" loading={remove.isPending} onPress={confirmDelete} />
        </View>
      ) : null}
    </View>
  );
}
