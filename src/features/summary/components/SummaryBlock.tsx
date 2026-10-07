import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Amount } from '@/components/Amount';
import { JaggedProgress } from '@/components/JaggedProgress';
import { PlaceholderRows } from '@/components/PlaceholderRows';
import { useActiveBudgets } from '@/features/budgets/hooks';
import { colors, fonts, MIN_TOUCH, typeScale } from '@/theme/tokens';
import type { BudgetPeriod } from '@/types/database';
import { comparisonText } from '../comparison';
import { useSpendingSummary } from '../hooks';

const LOAD_ERROR = 'No se pudieron cargar tus totales. Tira hacia abajo para reintentar.';
const DEFINE_BUDGET: Record<BudgetPeriod, string> = {
  week: 'Define un presupuesto semanal',
  month: 'Define un presupuesto mensual',
};

interface Props {
  period: BudgetPeriod;
  /** `hero` para la semana; `large` (más chico) para el mes. */
  size: 'hero' | 'large';
}

/** Total del período en DOP (de la RPC), comparación neutra con el anterior y barra del presupuesto activo. */
export function SummaryBlock({ period, size }: Props) {
  const summary = useSpendingSummary(period);
  const budgets = useActiveBudgets();
  if (summary.isPending) return <PlaceholderRows count={size === 'hero' ? 2 : 1} />;
  if (summary.isError) {
    return (
      <Text accessibilityLiveRegion="polite" style={{ fontFamily: fonts.bodyStrong, fontSize: typeScale.body, color: colors.signal }}>
        {LOAD_ERROR}
      </Text>
    );
  }
  const { totalDop, previousTotalDop } = summary.data;
  const limit = budgets.data?.[period] ?? null;
  return (
    <View>
      <Amount value={totalDop} currency="DOP" size={size} />
      <Text style={{ fontFamily: fonts.body, fontSize: typeScale.body, color: colors.ash, marginTop: 4, marginBottom: 12 }}>
        {comparisonText(totalDop, previousTotalDop, period)}
      </Text>
      {limit !== null && limit > 0 ? (
        <JaggedProgress spent={totalDop} limit={limit} currency="DOP" />
      ) : budgets.isSuccess ? (
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push('/budget')}
          style={{ minHeight: MIN_TOUCH, justifyContent: 'center', alignSelf: 'flex-start' }}
        >
          <Text style={{ fontFamily: fonts.bodyStrong, fontSize: typeScale.body, color: colors.paper, textDecorationLine: 'underline' }}>
            {DEFINE_BUDGET[period]}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
