import { useState } from 'react';
import { RefreshControl } from 'react-native';
import { Screen } from '@/components/Screen';
import { useHomeRefresh } from '@/features/summary/hooks';
import { colors } from '@/theme/tokens';
import { BUDGET_PERIODS, type BudgetPeriod } from '@/types/database';
import { BudgetBlock } from './BudgetBlock';
import { BudgetLimitSheet } from './BudgetLimitSheet';

/** Presupuesto: bloques SEMANAL y MENSUAL; tocar uno abre su límite. */
export function BudgetScreen() {
  const { refreshing, refresh } = useHomeRefresh();
  const [editing, setEditing] = useState<BudgetPeriod | null>(null);
  return (
    <>
      <Screen
        title="PRESUPUESTO"
        backdrop={3}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.blood]} progressBackgroundColor={colors.panel} />
        }
      >
        {BUDGET_PERIODS.map((period) => (
          <BudgetBlock key={period} period={period} onEdit={() => setEditing(period)} />
        ))}
      </Screen>
      <BudgetLimitSheet period={editing} onClose={() => setEditing(null)} />
    </>
  );
}
