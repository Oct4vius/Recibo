import { useMemo } from 'react';
import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { enteringFor, useMotionPreference } from '@/theme/motion';
import { ransomLetters, type RansomGlyph } from '@/theme/ransom';
import { angles, colors, fonts, typeScale } from '@/theme/tokens';

const SIZE = { lg: typeScale.displayLg, md: typeScale.displayMd, sm: typeScale.displaySm } as const;

type Letter = Extract<RansomGlyph, { kind: 'letter' }>;

interface Props {
  text: string;
  size?: keyof typeof SIZE;
  /** Entra con `slam` al montarse (títulos de pantalla). */
  animate?: boolean;
}

/** Agrupa las letras por palabra (los espacios separan grupos) para que el salto de línea no parta palabras. */
function groupWords(glyphs: RansomGlyph[]): Letter[][] {
  const words: Letter[][] = [[]];
  for (const g of glyphs) {
    if (g.kind === 'space') words.push([]);
    else words[words.length - 1].push(g);
  }
  return words.filter((w) => w.length > 0);
}

/** Título en nota de rescate. El lector de pantalla lee la palabra completa, no letra por letra. */
export function RansomText({ text, size = 'lg', animate = false }: Props) {
  const { reduced } = useMotionPreference();
  const words = useMemo(() => groupWords(ransomLetters(text)), [text]);
  const fontSize = SIZE[size];
  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel={text}
      style={{ transform: [{ rotate: `${angles.title}deg` }] }}
    >
      <Animated.View
        entering={animate ? enteringFor(reduced) : undefined}
        style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: fontSize * 0.35 }}
      >
        {words.map((word, w) => (
          <View key={w} style={{ flexDirection: 'row' }}>
            {word.map((g, i) => (
              <Text
                key={i}
                importantForAccessibility="no"
                style={{
                  fontFamily: fonts.display,
                  fontSize,
                  lineHeight: fontSize * 1.2,
                  color: colors[g.color],
                  backgroundColor: colors[g.background],
                  borderWidth: g.bordered ? 2 : 0,
                  borderColor: colors.paper,
                  paddingHorizontal: 4,
                  marginHorizontal: 1,
                  transform: [{ rotate: `${g.rotate}deg` }],
                }}
              >
                {g.char}
              </Text>
            ))}
          </View>
        ))}
      </Animated.View>
    </View>
  );
}
