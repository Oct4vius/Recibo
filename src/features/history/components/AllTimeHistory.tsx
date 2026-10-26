import { router } from 'expo-router';
import { Text } from 'react-native';
import { PlaceholderRows } from '@/components/PlaceholderRows';
import { useTimeZone } from '@/features/profile/hooks';
import { colors, fonts, typeScale } from '@/theme/tokens';
import { movementParams } from '../categories';
import { useCategorySpending, useSpendingOverall } from '../hooks';
import { sinceLabel } from '../labels';
import { CategoryBreakdown } from './CategoryBreakdown';
import { PeriodHeader } from './PeriodHeader';

const LOAD_ERROR = 'No se pudo cargar tu historial. Tira hacia abajo para reintentar.';

/** Vista "Todo": total desde el primer gasto y su desglose por categoría. */
export function AllTimeHistory() {
  const timeZone = useTimeZone();
  const overall = useSpendingOverall();
  const categories = useCategorySpending(null);

  if (overall.isPending) return <PlaceholderRows count={4} />;
  if (overall.isError) {
    return <Text style={{ fontFamily: fonts.bodyStrong, fontSize: typeScale.body, color: colors.signal }}>{LOAD_ERROR}</Text>;
  }
  const { firstIso, totalDop, txCount } = overall.data;
  if (firstIso === null) {
    return <Text style={{ fontFamily: fonts.body, fontSize: typeScale.body, color: colors.ash }}>Aún no hay gastos.</Text>;
  }

  return (
    <>
      <PeriodHeader
        title={sinceLabel(firstIso)}
        current={false}
        totalDop={totalDop}
        txCount={txCount}
        onViewMovements={() => router.navigate({ pathname: '/transactions', params: movementParams('all', undefined, timeZone) })}
      />
      <CategoryBreakdown
        query={categories}
        total={totalDop}
        onPressCategory={(categoryId) =>
          router.navigate({ pathname: '/transactions', params: movementParams('all', categoryId, timeZone) })
        }
      />
    </>
  );
}
