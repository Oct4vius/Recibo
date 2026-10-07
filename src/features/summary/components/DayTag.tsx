import { Text, View } from 'react-native';
import { angles, colors, fonts, typeScale } from '@/theme/tokens';

/** Fecha de hoy en una etiqueta blanca inclinada, sobre el título. */
export function DayTag({ label }: { label: string }) {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        marginTop: 8,
        paddingHorizontal: 12,
        paddingVertical: 4,
        backgroundColor: colors.paper,
        transform: [{ skewX: `${angles.row}deg` }],
      }}
    >
      <Text
        style={{
          fontFamily: fonts.bodyStrong,
          fontSize: typeScale.caption,
          color: colors.void,
          transform: [{ skewX: `${-angles.row}deg` }],
        }}
      >
        {label}
      </Text>
    </View>
  );
}
