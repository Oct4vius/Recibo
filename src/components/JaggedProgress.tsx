import { useEffect, useState } from 'react';
import { Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import Svg, { Polygon } from 'react-native-svg';
import { formatMoney } from '@/lib/money';
import { animateTo, useMotionPreference } from '@/theme/motion';
import { progressState } from '@/theme/progress';
import { jaggedRect, toSvgPoints } from '@/theme/shapes';
import { colors, fonts, typeScale } from '@/theme/tokens';
import type { Currency } from '@/types/database';

const HEIGHT = 28;

interface Props {
  spent: number;
  limit: number;
  currency: Currency;
}

/** Barra de presupuesto: roja; borde amarillo desde el 80 %; desde el 100 % el extremo se "rompe". */
export function JaggedProgress({ spent, limit, currency }: Props) {
  const { reduced } = useMotionPreference();
  const state = progressState(spent, limit);
  const [width, setWidth] = useState(0);
  const fill = useSharedValue(0);
  useEffect(() => {
    fill.value = animateTo(state.fill, 'snap', reduced);
  }, [fill, state.fill, reduced]);
  const fillStyle = useAnimatedStyle(() => ({ width: fill.value * width }));
  const label = `${state.percent}% de ${formatMoney(limit, currency)}`;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={`Presupuesto: ${label}`}
      accessibilityValue={{ min: 0, max: 100, now: Math.min(state.percent, 100) }}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      style={{ height: HEIGHT, backgroundColor: colors.panel, overflow: 'hidden' }}
    >
      <Animated.View
        style={[
          {
            height: HEIGHT,
            backgroundColor: colors.blood,
            borderRightWidth: state.tone === 'normal' ? 0 : 4,
            borderRightColor: colors.signal,
          },
          fillStyle,
        ]}
      />
      {state.tone === 'over' && width > 0 ? (
        <Svg width={36} height={HEIGHT} style={{ position: 'absolute', right: 0, top: 0 }}>
          <Polygon points={toSvgPoints(jaggedRect(36, HEIGHT, 4, 10))} fill={colors.paper} />
        </Svg>
      ) : null}
      <Text
        style={{
          position: 'absolute',
          left: 10,
          top: 4,
          fontFamily: fonts.amount,
          fontSize: typeScale.body,
          color: colors.paper,
          fontVariant: ['tabular-nums'],
        }}
      >
        {label}
      </Text>
    </View>
  );
}
