import { Pressable, Text, View } from 'react-native';
import { tapFeedback } from '@/lib/haptics';
import { angles, colors, fonts, MIN_TOUCH, typeScale } from '@/theme/tokens';

interface Props {
  label: string;
  selected?: boolean;
  onPress: () => void;
}

/** Chip inclinado: blanco con texto negro si está seleccionado; si no, solo borde. */
export function SkewChip({ label, selected = false, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      style={{ minHeight: MIN_TOUCH, justifyContent: 'center', marginRight: 8 }}
    >
      <View
        style={{
          transform: [{ skewX: `${angles.row}deg` }],
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderWidth: 2,
          borderColor: selected ? colors.paper : colors.ash,
          backgroundColor: selected ? colors.paper : colors.void,
        }}
      >
        <Text
          style={{
            transform: [{ skewX: `${-angles.row}deg` }],
            fontFamily: fonts.bodyStrong,
            fontSize: typeScale.caption,
            color: selected ? colors.void : colors.paper,
          }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
