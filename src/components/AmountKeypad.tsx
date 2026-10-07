import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import type { AmountKey } from '@/features/transactions/amount-input';
import { tapFeedback } from '@/lib/haptics';
import { angles, colors, fonts, typeScale } from '@/theme/tokens';

const ROWS: readonly (readonly AmountKey[])[] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', 'backspace'],
];

const KEY_HEIGHT = 52;

function keyLabel(key: AmountKey): string {
  if (key === '.') return 'Punto decimal';
  if (key === 'backspace') return 'Borrar';
  return key;
}

/** Teclado numérico propio: teclas inclinadas que vibran al tocarlas. */
export function AmountKeypad({ onKey }: { onKey: (key: AmountKey) => void }) {
  return (
    <View style={{ marginTop: 8 }}>
      {ROWS.map((row) => (
        <View key={row.join('')} style={{ flexDirection: 'row' }}>
          {row.map((key) => (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={keyLabel(key)}
              onPress={() => {
                tapFeedback();
                onKey(key);
              }}
              style={{ flex: 1, height: KEY_HEIGHT, margin: 3 }}
            >
              <View
                style={{
                  flex: 1,
                  transform: [{ skewX: `${angles.row}deg` }],
                  backgroundColor: key === 'backspace' ? colors.void : colors.panel,
                  borderWidth: key === 'backspace' ? 2 : 0,
                  borderColor: colors.ash,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <View style={{ transform: [{ skewX: `${-angles.row}deg` }] }}>
                  {key === 'backspace' ? (
                    <Ionicons name="backspace-outline" size={24} color={colors.paper} />
                  ) : (
                    <Text style={{ fontFamily: fonts.amount, fontSize: typeScale.displayMd, color: colors.paper }}>{key}</Text>
                  )}
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}
