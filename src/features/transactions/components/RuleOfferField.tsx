import Animated from 'react-native-reanimated';
import { SkewToggle } from '@/components/SkewToggle';
import { TextField } from '@/components/TextField';
import { MAX_RULE_PATTERN } from '@/features/rules/presentation';
import { fadeInQuick } from '@/theme/motion';

interface Props {
  label: string;
  on: boolean;
  onToggle: (on: boolean) => void;
  /** null = sin campo (regla por cuenta destino: los 4 dígitos no se editan). */
  pattern: string | null;
  onPatternChange: (pattern: string) => void;
  /** Avisa si se está escribiendo (el panel oculta su teclado numérico mientras tanto). */
  onTyping: (typing: boolean) => void;
}

/** "Siempre poner «UBER» en Transporte": aparece con un fundido corto; al encenderlo muestra el texto a buscar. */
export function RuleOfferField({ label, on, onToggle, pattern, onPatternChange, onTyping }: Props) {
  return (
    <Animated.View entering={fadeInQuick}>
      <SkewToggle label={label} value={on} onChange={onToggle} />
      {on && pattern !== null ? (
        <Animated.View entering={fadeInQuick}>
          <TextField
            label="Texto a buscar"
            value={pattern}
            onChangeText={onPatternChange}
            maxLength={MAX_RULE_PATTERN}
            autoCapitalize="characters"
            onFocus={() => onTyping(true)}
            onBlur={() => onTyping(false)}
          />
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}
