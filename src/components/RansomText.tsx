import { useMemo } from 'react';
import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { enteringFor, useMotionPreference } from '@/theme/motion';
import { ransomLetters } from '@/theme/ransom';
import { angles, colors, fonts, typeScale } from '@/theme/tokens';

const SIZE = { lg: typeScale.displayLg, md: typeScale.displayMd, sm: typeScale.displaySm } as const;

interface Props {
  text: string;
  size?: keyof typeof SIZE;
  /** Entra con `slam` al montarse (títulos de pantalla). */
  animate?: boolean;
}

/** Título en nota de rescate. El lector de pantalla lee la palabra completa, no letra por letra. */
export function RansomText({ text, size = 'lg', animate = false }: Props) {
  const { reduced } = useMotionPreference();
  const glyphs = useMemo(() => ransomLetters(text), [text]);
  const fontSize = SIZE[size];
  return (
    <Animated.View
      entering={animate ? enteringFor(reduced) : undefined}
      accessible
      accessibilityRole="header"
      accessibilityLabel={text}
      style={{ flexDirection: 'row', flexWrap: 'wrap', transform: [{ rotate: `${angles.title}deg` }] }}
    >
      {glyphs.map((g, i) =>
        g.kind === 'space' ? (
          <View key={i} style={{ width: fontSize * 0.35 }} />
        ) : (
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
        ),
      )}
    </Animated.View>
  );
}
