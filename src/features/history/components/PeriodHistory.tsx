import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { PlaceholderRows } from '@/components/PlaceholderRows';
import { SectionHeader } from '@/components/SectionHeader';
import { SkewButton } from '@/components/SkewButton';
import { SkewRow } from '@/components/SkewRow';
import { useTimeZone } from '@/features/profile/hooks';
import { toIsoDate, toLocalDate } from '@/lib/dates';
import { colors, fonts, typeScale } from '@/theme/tokens';
import { breakdownRange, movementParams } from '../categories';
import type { Granularity } from '../granularity';
import { useCategorySpending, useHistory } from '../hooks';
import { bucketLabel, expenseCountLabel } from '../labels';
import { defaultSelectedIso, type HistorySelection, selectedStartFor, windowKeyOf } from '../selection';
import { periodStartOf } from '../window';
import { CategoryBreakdown } from './CategoryBreakdown';
import { HistoryChart } from './HistoryChart';
import { PeriodHeader } from './PeriodHeader';

const LOAD_HISTORY_ERROR = 'No se pudo cargar tu historial. Tira hacia abajo para reintentar.';

const LIST_TITLES: Record<Granularity, string> = { week: 'Semanas', month: 'Meses', year: 'Años' };

/** Barras de la ventana, período elegido con su desglose por categoría, navegación entre ventanas y la lista de períodos. */
export function PeriodHistory({ granularity }: { granularity: Granularity }) {
  const [offset, setOffset] = useState(0);
  const [selection, setSelection] = useState<HistorySelection | null>(null);
  const timeZone = useTimeZone();
  const { query } = useHistory(granularity, offset);
  // Granularidad de los datos mostrados: difiere de la pedida solo mientras llegan los nuevos (se ven los anteriores).
  const shown = query.data?.granularity ?? granularity;
  const currentIso = toIsoDate(periodStartOf(shown, toLocalDate(new Date(), timeZone)));
  const buckets = query.data?.buckets ?? [];
  // La barra elegida vale solo para los datos en pantalla: si llegan otros (misma fecha de inicio incluida), se descarta.
  const windowKey = windowKeyOf(shown, buckets[0]?.startIso);
  const selectedIso = selectedStartFor(selection, windowKey) ?? defaultSelectedIso(buckets, currentIso);
  const selectedBucket = buckets.find((bucket) => bucket.startIso === selectedIso);
  const categories = useCategorySpending(selectedIso === null ? null : breakdownRange(shown, selectedIso));
  const empty = buckets.every((bucket) => bucket.totalDop === 0);

  const move = (delta: number) => {
    setOffset((current) => current + delta);
    setSelection(null);
  };
  const openMovements = (bucket: NonNullable<typeof selectedBucket>, categoryId: string | null | undefined) =>
    router.navigate({
      pathname: '/transactions',
      params: movementParams({ granularity: shown, start: bucket.start, label: bucketLabel(shown, bucket.start) }, categoryId, timeZone),
    });

  return (
    <>
      {query.isPending ? <PlaceholderRows count={4} /> : null}
      {query.isError ? (
        <Text style={{ fontFamily: fonts.bodyStrong, fontSize: typeScale.body, color: colors.signal }}>{LOAD_HISTORY_ERROR}</Text>
      ) : null}
      {query.isSuccess ? (
        <>
          <HistoryChart
            granularity={shown}
            buckets={buckets}
            currentIso={currentIso}
            selectedIso={selectedIso}
            onSelect={(startIso) => setSelection({ windowKey, startIso })}
          />
          {empty ? (
            <Text style={{ fontFamily: fonts.body, fontSize: typeScale.body, color: colors.ash, marginBottom: 8 }}>
              Aún no hay gastos en estos períodos.
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <SkewButton label="‹ Anteriores" variant="ghost" onPress={() => move(1)} />
            {offset > 0 ? <SkewButton label="Siguientes ›" variant="ghost" onPress={() => move(-1)} /> : null}
          </View>
          {selectedBucket ? (
            <>
              <PeriodHeader
                title={bucketLabel(shown, selectedBucket.start)}
                current={selectedBucket.startIso === currentIso}
                totalDop={selectedBucket.totalDop}
                txCount={selectedBucket.txCount}
                onViewMovements={() => openMovements(selectedBucket, undefined)}
              />
              <CategoryBreakdown
                query={categories}
                onPressCategory={(categoryId) => openMovements(selectedBucket, categoryId)}
              />
            </>
          ) : null}
          <SectionHeader title={LIST_TITLES[shown]} />
          {[...buckets].reverse().map((bucket) => (
            <SkewRow
              key={bucket.startIso}
              title={bucketLabel(shown, bucket.start)}
              subtitle={expenseCountLabel(bucket.txCount)}
              badge={bucket.startIso === currentIso ? 'Actual' : undefined}
              amount={{ value: bucket.totalDop, currency: 'DOP' }}
              selected={bucket.startIso === selectedIso}
              onPress={() => setSelection({ windowKey, startIso: bucket.startIso })}
            />
          ))}
        </>
      ) : null}
    </>
  );
}
