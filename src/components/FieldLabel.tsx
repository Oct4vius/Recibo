import { Text } from 'react-native';
import { colors, fonts, typeScale } from '@/theme/tokens';

interface Props {
  text: string;
  /** true si el control ya se anuncia con su propia etiqueta (p. ej. un TextInput). */
  decorative?: boolean;
}

/** Etiqueta pequeña sobre un campo o una fila de chips. */
export function FieldLabel({ text, decorative = false }: Props) {
  return (
    <Text
      importantForAccessibility={decorative ? 'no' : 'auto'}
      style={{ fontFamily: fonts.bodyStrong, fontSize: typeScale.caption, color: colors.ash, marginBottom: 6 }}
    >
      {text}
    </Text>
  );
}
