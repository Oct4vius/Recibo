import type { UseQueryResult } from '@tanstack/react-query';
import { Text } from 'react-native';
import { PlaceholderRows } from '@/components/PlaceholderRows';
import { colors, fonts, typeScale } from '@/theme/tokens';
import type { CategoryBreakdownData } from '../categories';
import { CategorySpendingRow } from './CategorySpendingRow';

const LOAD_ERROR = 'No se pudo cargar el desglose. Tira hacia abajo para reintentar.';

interface Props {
  query: UseQueryResult<CategoryBreakdownData>;
  onPressCategory: (categoryId: string | null) => void;
}

/** Lista del desglose por categoría con sus estados de carga, error y vacío. */
export function CategoryBreakdown({ query, onPressCategory }: Props) {
  if (query.isPending) return <PlaceholderRows count={3} />;
  if (query.isError) {
    return (
      <Text accessibilityLiveRegion="polite" style={{ fontFamily: fonts.bodyStrong, fontSize: typeScale.body, color: colors.signal }}>
        {LOAD_ERROR}
      </Text>
    );
  }
  if (query.data.items.length === 0) {
    return <Text style={{ fontFamily: fonts.body, fontSize: typeScale.body, color: colors.ash }}>Sin gastos en este período.</Text>;
  }
  return (
    <>
      {query.data.items.map((item) => (
        // Cada fila se mide contra el total de su propio conjunto: un desglose anterior (placeholder) nunca pasa del 100 %.
        <CategorySpendingRow key={item.categoryId ?? 'none'} item={item} total={query.data.total} onPress={() => onPressCategory(item.categoryId)} />
      ))}
    </>
  );
}
