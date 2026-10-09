import { router } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, Text, View } from 'react-native';
import { PlaceholderRows } from '@/components/PlaceholderRows';
import { Screen } from '@/components/Screen';
import { SkewButton } from '@/components/SkewButton';
import { SkewChip } from '@/components/SkewChip';
import { SkewRow } from '@/components/SkewRow';
import { useTimeZone } from '@/features/profile/hooks';
import { toIsoDate, toLocalDate } from '@/lib/dates';
import { colors, fonts, typeScale } from '@/theme/tokens';
import { GRANULARITIES, type Granularity } from '../granularity';
import { useHistory } from '../hooks';
import { bucketLabel, expenseCountLabel, GRANULARITY_LABELS } from '../labels';
import { type HistorySelection, selectedStartFor, windowKeyOf } from '../selection';
import { bucketRange, periodStartOf } from '../window';
import { HistoryChart } from './HistoryChart';

const LOAD_HISTORY_ERROR = 'No se pudo cargar tu historial. Tira hacia abajo para reintentar.';

/** Historial: selector, barras de la ventana, navegación entre ventanas y la lista (de lo más nuevo a lo más viejo). */
export function HistoryScreen() {
  const [granularity, setGranularity] = useState<Granularity>('week');
  const [offset, setOffset] = useState(0);
  const [selection, setSelection] = useState<HistorySelection | null>(null);
  const [pulling, setPulling] = useState(false);
  const timeZone = useTimeZone();
  const { query } = useHistory(granularity, offset);
  // Granularidad de los datos mostrados: difiere de la elegida solo mientras llegan los nuevos (se ven los anteriores).
  const shown = query.data?.granularity ?? granularity;
  const currentIso = toIsoDate(periodStartOf(shown, toLocalDate(new Date(), timeZone)));
  const buckets = query.data?.buckets ?? [];
  // La barra elegida vale solo para los datos en pantalla: si llegan otros (misma fecha de inicio incluida), se descarta.
  const windowKey = windowKeyOf(shown, buckets[0]?.startIso);
  const selectedIso = selectedStartFor(selection, windowKey);
  const empty = buckets.every((bucket) => bucket.totalDop === 0);

  const choose = (next: Granularity) => {
    setGranularity(next);
    setOffset(0);
    setSelection(null);
  };
  const move = (delta: number) => {
    setOffset((current) => current + delta);
    setSelection(null);
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
          {[...buckets].reverse().map((bucket) => (
            <SkewRow
              key={bucket.startIso}
              title={bucketLabel(shown, bucket.start)}
              subtitle={expenseCountLabel(bucket.txCount)}
              badge={bucket.startIso === currentIso ? 'Actual' : undefined}
              amount={{ value: bucket.totalDop, currency: 'DOP' }}
              selected={bucket.startIso === selectedIso}
              onPress={() =>
                router.navigate({
                  pathname: '/transactions',
                  params: { ...bucketRange(shown, bucket.start, timeZone), label: bucketLabel(shown, bucket.start) },
                })
              }
            />
          ))}
        </>
      ) : null}
    </Screen>
  );
}
