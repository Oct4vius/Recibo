import { Text, View } from 'react-native';
import { Amount } from '@/components/Amount';
import { colors, fonts, typeScale } from '@/theme/tokens';
import type { Granularity } from '../granularity';
import { axisLabels, bucketAccessibilityLabel, bucketLabel } from '../labels';
import type { HistoryBucket } from '../mapping';
import { barRatios } from '../scale';
import { HistoryBar } from './HistoryBar';

const CHART_HEIGHT = 140;

interface Props {
  granularity: Granularity;
  /** Del más viejo al más nuevo. */
  buckets: readonly HistoryBucket[];
  /** Período actual (en rojo). */
  currentIso: string;
  /** Barra elegida por el usuario (en blanco); null = ninguna. */
  selectedIso: string | null;
  onSelect: (startIso: string) => void;
}

/** Barras de una sola serie: grises, la actual en rojo, la elegida en blanco. Arriba, el monto de la elegida (o la actual). */
export function HistoryChart({ granularity, buckets, currentIso, selectedIso, onSelect }: Props) {
  const ratios = barRatios(buckets.map((bucket) => bucket.totalDop));
  const axis = axisLabels(granularity, buckets.map((bucket) => bucket.start));
  const featured =
    buckets.find((bucket) => bucket.startIso === selectedIso) ??
    buckets.find((bucket) => bucket.startIso === currentIso) ??
    buckets[buckets.length - 1];
  const caption = { fontFamily: fonts.body, fontSize: typeScale.caption, color: colors.ash } as const;
  return (
    <View style={{ marginBottom: 8 }}>
      {featured ? (
        <View style={{ marginBottom: 8 }}>
          <Text style={caption}>{bucketLabel(granularity, featured.start)}</Text>
          <Amount value={featured.totalDop} currency="DOP" size="large" />
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: CHART_HEIGHT, borderBottomWidth: 2, borderBottomColor: colors.ash }}>
        {buckets.map((bucket, i) => (
          // Clave por posición: la barra persiste al cambiar de ventana y anima a su nueva altura.
          <HistoryBar
            key={i}
            ratio={ratios[i]}
            tone={bucket.startIso === selectedIso ? 'paper' : bucket.startIso === currentIso ? 'blood' : 'ash'}
            label={bucketAccessibilityLabel(granularity, bucket.start, bucket.totalDop)}
            selected={bucket.startIso === selectedIso}
            onPress={() => onSelect(bucket.startIso)}
          />
        ))}
      </View>
      <View style={{ flexDirection: 'row', marginTop: 4 }} importantForAccessibility="no-hide-descendants">
        {axis.map((label, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={caption}>{label.top}</Text>
            <Text style={caption}>{label.bottom}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
