import { Text, View } from 'react-native';
import { angles, colors, fonts, typeScale } from '@/theme/tokens';

/** Encabezado de grupo inclinado ("HOY", "CUENTA", "SEMANAL"): Anton 18, girado como los títulos. */
export function SectionHeader({ title }: { title: string }) {
  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel={title}
      style={{ alignSelf: 'flex-start', marginTop: 18, marginBottom: 6, transform: [{ rotate: `${angles.title}deg` }] }}
    >
      <Text style={{ fontFamily: fonts.display, fontSize: typeScale.displaySm, color: colors.paper }}>{title}</Text>
    </View>
  );
}
