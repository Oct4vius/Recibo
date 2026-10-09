import { router } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, Text, View } from 'react-native';
import { PlaceholderRows } from '@/components/PlaceholderRows';
import { Screen } from '@/components/Screen';
import { SkewButton } from '@/components/SkewButton';
import { SkewChip } from '@/components/SkewChip';
import { SkewRow } from '@/components/SkewRow';
import { useTimeZone } from '@/features/profile/hooks';
import { countLabel } from '@/features/transactions/filters';
import { toIsoDate, toLocalDate } from '@/lib/dates';
import { colors, fonts, typeScale } from '@/theme/tokens';
import { GRANULARITIES, type Granularity } from '../granularity';
import { useHistory } from '../hooks';
import { bucketLabel, GRANULARITY_LABELS } from '../labels';
import { bucketRange, periodStartOf } from '../window';
import { HistoryChart } from './HistoryChart';

const LOAD_HISTORY_ERROR = 'No se pudo cargar tu historial. Tira hacia abajo para reintentar.';

/** Historial: selector, barras de la ventana, navegación entre ventanas y la lista (de lo más nuevo a lo más viejo). */
export function HistoryScreen() {
  const [granularity, setGranularity] = useState<Granularity>('week');
  const [offset, setOffset] = useState(0);
  const [selectedIso, setSelectedIso] = useState<string | null>(null);
  const [pulling, setPulling] = useState(false);
  const timeZone = useTimeZone();
  const { query } = useHistory(granularity, offset);
  const currentIso = toIsoDate(periodStartOf(granularity, toLocalDate(new Date(), timeZone)));
  const buckets = query.data ?? [];
  const empty = buckets.every((bucket) => bucket.totalDop === 0);

  const choose = (next: Granularity) => {
    setGranularity(next);
    setOffset(0);
    setSelectedIso(null);
  };
  const move = (delta: number) => {
    setOffset((current) => current + delta);
    setSelectedIso(null);
  };
  const refresh = () => {
    setPulling(true);
    query.refetch().finally(() => setPulling(false));
  };

  return (
    <Screen
      title="HISTORIAL"
      backdrop={2}
      refreshControl={<RefreshControl refreshing={pulling} onRefresh={refresh} colors={[colors.blood]} progressBackgroundColor={colors.panel} />}
    >
      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
        {GRANULARITIES.map((option) => (
          <SkewChip key={option} label={GRANULARITY_LABELS[option]} selected={granularity === option} onPress={() => choose(option)} />
        ))}
      </View>
      {query.isPending ? <PlaceholderRows count={4} /> : null}
      {query.isError ? (
        <Text style={{ fontFamily: fonts.bodyStrong, fontSize: typeScale.body, color: colors.signal }}>{LOAD_HISTORY_ERROR}</Text>
      ) : null}
      {query.isSuccess ? (
        <>
          <HistoryChart
            granularity={granularity}
            buckets={buckets}
            currentIso={currentIso}
            selectedIso={selectedIso}
            onSelect={setSelectedIso}
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
          {[...buckets].reverse().map((bucket) => (
            <SkewRow
              key={bucket.startIso}
              title={bucketLabel(granularity, bucket.start)}
              subtitle={countLabel(bucket.txCount)}
              badge={bucket.startIso === currentIso ? 'Actual' : undefined}
              amount={{ value: bucket.totalDop, currency: 'DOP' }}
              selected={bucket.startIso === selectedIso}
              onPress={() =>
                router.navigate({
                  pathname: '/transactions',
                  params: { ...bucketRange(granularity, bucket.start, timeZone), label: bucketLabel(granularity, bucket.start) },
                })
              }
            />
          ))}
        </>
      ) : null}
    </Screen>
  );
}
