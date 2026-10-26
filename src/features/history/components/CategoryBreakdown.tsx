import type { UseQueryResult } from '@tanstack/react-query';
import { Text } from 'react-native';
import { PlaceholderRows } from '@/components/PlaceholderRows';
import { colors, fonts, typeScale } from '@/theme/tokens';
import type { CategorySpending } from '../categories';
import { CategorySpendingRow } from './CategorySpendingRow';

const LOAD_ERROR = 'No se pudo cargar el desglose. Tira hacia abajo para reintentar.';

interface Props {
  query: UseQueryResult<CategorySpending[]>;
  /** Total del período, base de los porcentajes. */
  total: number;
  onPressCategory: (categoryId: string | null) => void;
}

/** Lista del desglose por categoría con sus estados de carga, error y vacío. */
export function CategoryBreakdown({ query, total, onPressCategory }: Props) {
  if (query.isPending) return <PlaceholderRows count={3} />;
  if (query.isError) {
    return (
      <Text accessibilityLiveRegion="polite" style={{ fontFamily: fonts.bodyStrong, fontSize: typeScale.body, color: colors.signal }}>
        {LOAD_ERROR}
      </Text>
    );
  }
  if (query.data.length === 0) {
    return <Text style={{ fontFamily: fonts.body, fontSize: typeScale.body, color: colors.ash }}>Sin gastos en este período.</Text>;
  }
  return (
    <>
      {query.data.map((item) => (
        <CategorySpendingRow key={item.categoryId ?? 'none'} item={item} total={total} onPress={() => onPressCategory(item.categoryId)} />
      ))}
    </>
  );
}
