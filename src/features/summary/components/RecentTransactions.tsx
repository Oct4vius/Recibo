import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { PlaceholderRows } from '@/components/PlaceholderRows';
import { RansomText } from '@/components/RansomText';
import { TransactionRow } from '@/features/transactions/components/TransactionRow';
import { useRecentTransactions } from '@/features/transactions/hooks';
import type { TransactionListItem } from '@/features/transactions/mapping';
import { LOAD_TRANSACTIONS_ERROR, NO_TRANSACTIONS } from '@/features/transactions/messages';
import { colors, fonts, MIN_TOUCH, typeScale } from '@/theme/tokens';

interface Props {
  onPressItem: (item: TransactionListItem) => void;
}

/** "ÚLTIMOS MOVIMIENTOS": los 5 más recientes y el enlace "Ver todos" a Movimientos. */
export function RecentTransactions({ onPressItem }: Props) {
  const recent = useRecentTransactions();
  const message = (text: string, error = false) => (
    <Text style={{ fontFamily: fonts.body, fontSize: typeScale.body, color: error ? colors.signal : colors.ash }}>{text}</Text>
  );
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <View style={{ flexShrink: 1 }}>
          <RansomText text="ÚLTIMOS MOVIMIENTOS" size="sm" />
        </View>
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push('/transactions')}
          style={{ minHeight: MIN_TOUCH, justifyContent: 'center', paddingLeft: 12 }}
        >
          <Text style={{ fontFamily: fonts.bodyStrong, fontSize: typeScale.body, color: colors.paper, textDecorationLine: 'underline' }}>
            Ver todos
          </Text>
        </Pressable>
      </View>
      {recent.isPending
        ? <PlaceholderRows count={3} />
        : recent.isError
          ? message(LOAD_TRANSACTIONS_ERROR, true)
          : recent.data.length === 0
            ? message(NO_TRANSACTIONS)
            : recent.data.map((item) => <TransactionRow key={item.id} item={item} onPress={onPressItem} />)}
    </View>
  );
}
