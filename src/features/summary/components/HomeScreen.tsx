import { RefreshControl, View } from 'react-native';
import { AddFab } from '@/components/AddFab';
import { RansomText } from '@/components/RansomText';
import { Screen } from '@/components/Screen';
import { useTimeZone } from '@/features/profile/hooks';
import { ExpenseSheet } from '@/features/transactions/components/ExpenseSheet';
import { useExpenseSheet } from '@/features/transactions/hooks';
import { formatDayLabel, toLocalDate } from '@/lib/dates';
import { colors } from '@/theme/tokens';
import { useHomeRefresh } from '../hooks';
import { DayTag } from './DayTag';
import { RecentTransactions } from './RecentTransactions';
import { SummaryBlock } from './SummaryBlock';

/** Inicio: semana en grande, mes más chico, últimos movimientos y botón "+". */
export function HomeScreen() {
  const timeZone = useTimeZone();
  const { refreshing, refresh } = useHomeRefresh();
  const { openNew, openEdit, sheet } = useExpenseSheet();
  return (
    <>
      <Screen
        title="ESTA SEMANA"
        backdrop={0}
        aboveTitle={<DayTag label={formatDayLabel(toLocalDate(new Date(), timeZone))} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.blood]} progressBackgroundColor={colors.panel} />
        }
        floating={<AddFab onPress={openNew} />}
      >
        <SummaryBlock period="week" size="hero" />
        <View style={{ marginTop: 36, marginBottom: 16 }}>
          <RansomText text="ESTE MES" size="md" />
        </View>
        <SummaryBlock period="month" size="large" />
        <View style={{ marginTop: 36 }}>
          <RecentTransactions onPressItem={openEdit} />
        </View>
      </Screen>
      <ExpenseSheet {...sheet} />
    </>
  );
}
