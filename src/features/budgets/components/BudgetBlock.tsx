import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { JaggedProgress } from '@/components/JaggedProgress';
import { PlaceholderRows } from '@/components/PlaceholderRows';
import { SectionHeader } from '@/components/SectionHeader';
import { SkewButton } from '@/components/SkewButton';
import { useTimeZone } from '@/features/profile/hooks';
import { useSpendingSummary } from '@/features/summary/hooks';
import { toLocalDate } from '@/lib/dates';
import { tapFeedback } from '@/lib/haptics';
import { budgetBalance } from '@/theme/progress';
import { colors, fonts, typeScale } from '@/theme/tokens';
import { usePressNudge } from '@/theme/use-press-nudge';
import type { BudgetPeriod } from '@/types/database';
import { useActiveBudgets } from '../hooks';
import { balanceText, DEFINE_LIMIT, daysLeft, LOAD_BUDGET_ERROR, PERIOD_TITLE, spentOfLimitText } from '../text';

interface Props {
  period: BudgetPeriod;
  onEdit: () => void;
}

/** Un presupuesto: barra, gastado de límite y lo que queda; tocarlo abre el panel del límite. */
export function BudgetBlock({ period, onEdit }: Props) {
  const summary = useSpendingSummary(period);
  const budgets = useActiveBudgets();
  const timeZone = useTimeZone();
  const { pressed, onPressIn, onPressOut } = usePressNudge();
  const nudge = useAnimatedStyle(() => ({ transform: [{ translateX: pressed.value * 6 }] }));
  const header = <SectionHeader title={PERIOD_TITLE[period]} />;

  if (summary.isPending || budgets.isPending) {
    return (
      <View>
        {header}
        <PlaceholderRows count={2} />
      </View>
    );
  }
  if (summary.isError || budgets.isError) {
    return (
      <View>
        {header}
        <Text style={{ fontFamily: fonts.bodyStrong, fontSize: typeScale.body, color: colors.signal }}>{LOAD_BUDGET_ERROR}</Text>
      </View>
    );
  }
  const limit = budgets.data[period];
  if (limit === null) {
    return (
      <View>
        {header}
        <SkewButton label={DEFINE_LIMIT[period]} variant="ghost" onPress={onEdit} />
      </View>
    );
  }
  const { totalDop, periodEnd } = summary.data;
  const balance = budgetBalance(totalDop, limit);
  const days = periodEnd ? daysLeft(periodEnd, toLocalDate(new Date(), timeZone)) : null;
  return (
    <View>
      {header}
      <Pressable
        accessibilityRole="button"
        accessibilityHint="Edita el límite"
        onPress={() => {
          tapFeedback();
          onEdit();
        }}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      >
        <Animated.View style={nudge}>
          <JaggedProgress spent={totalDop} limit={limit} currency="DOP" />
          <Text style={{ fontFamily: fonts.bodyStrong, fontSize: typeScale.body, color: colors.paper, marginTop: 8 }}>
            {spentOfLimitText(totalDop, limit)}
          </Text>
          {days !== null ? (
            <Text style={{ fontFamily: fonts.body, fontSize: typeScale.body, color: balance.kind === 'over' ? colors.paper : colors.ash }}>
              {balanceText(balance, days)}
            </Text>
          ) : null}
        </Animated.View>
      </Pressable>
    </View>
  );
}
