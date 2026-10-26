import { Text, View } from 'react-native';
import { Amount } from '@/components/Amount';
import { SkewButton } from '@/components/SkewButton';
import { colors, fonts, typeScale } from '@/theme/tokens';
import { expenseCountLabel } from '../labels';

interface Props {
  title: string;
  current: boolean;
  totalDop: number;
  txCount: number;
  onViewMovements: () => void;
}

/** Encabezado del período elegido: etiqueta (con insignia "Actual"), total grande, conteo y salto a Movimientos. */
export function PeriodHeader({ title, current, totalDop, txCount, onViewMovements }: Props) {
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text accessibilityRole="header" style={{ fontFamily: fonts.display, fontSize: typeScale.displaySm, color: colors.paper }}>
          {title}
        </Text>
        {current ? (
          <Text
            style={{
              marginLeft: 8,
              paddingHorizontal: 6,
              borderWidth: 1,
              borderColor: colors.ash,
              fontFamily: fonts.bodyStrong,
              fontSize: typeScale.caption,
              color: colors.ash,
            }}
          >
            Actual
          </Text>
        ) : null}
      </View>
      <Amount value={totalDop} currency="DOP" size="large" />
      <Text style={{ fontFamily: fonts.body, fontSize: typeScale.body, color: colors.ash, marginTop: 4, marginBottom: 8 }}>
        {expenseCountLabel(txCount)}
      </Text>
      <SkewButton variant="ghost" label="Ver movimientos ›" onPress={onViewMovements} />
    </View>
  );
}
