import { memo, useEffect, useState } from 'react';
import { Pressable, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { Amount } from '@/components/Amount';
import { tapFeedback } from '@/lib/haptics';
import { animateTo, useMotionPreference } from '@/theme/motion';
import { angles, colors, fonts, MIN_TOUCH, typeScale } from '@/theme/tokens';
import { usePressNudge } from '@/theme/use-press-nudge';
import { shareOf, type CategorySpending } from '../categories';
import { categoryAccessibilityLabel, expenseCountLabel, shareLabel } from '../labels';

const BAR_HEIGHT = 5;

interface Props {
  item: CategorySpending;
  /** Total del período: base del porcentaje y de la barrita. */
  total: number;
  onPress: () => void;
}

/** Tira inclinada de una categoría: nombre, monto, barrita de proporción y conteo. El contenido va derecho. */
export const CategorySpendingRow = memo(function CategorySpendingRow({ item, total, onPress }: Props) {
  const { pressed, onPressIn, onPressOut } = usePressNudge();
  const { reduced } = useMotionPreference();
  const [width, setWidth] = useState(0);
  const target = shareOf(item.totalDop, total);
  const fill = useSharedValue(0);
  useEffect(() => {
    fill.value = animateTo(target, 'snap', reduced);
  }, [fill, target, reduced]);
  const fillStyle = useAnimatedStyle(() => ({ width: Math.max(0, fill.value * width) }));
  const stripStyle = useAnimatedStyle(() => ({
    transform: [{ skewX: `${angles.row}deg` }, { translateX: pressed.value * 6 }],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={categoryAccessibilityLabel(item, total)}
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
      <Animated.View
        style={[
          { minHeight: MIN_TOUCH, marginVertical: 3, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: colors.panel },
          stripStyle,
        ]}
      >
        <View style={{ transform: [{ skewX: `${-angles.row}deg` }] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: fonts.bodyStrong, fontSize: typeScale.body, color: colors.paper }}>
              {item.name}
            </Text>
            <View style={{ marginLeft: 12, flexShrink: 0 }}>
              <Amount value={item.totalDop} currency="DOP" />
            </View>
          </View>
          <View
            onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
            style={{ height: BAR_HEIGHT, marginVertical: 6, backgroundColor: colors.void, overflow: 'hidden' }}
          >
            <Animated.View
              style={[{ height: BAR_HEIGHT, backgroundColor: item.categoryId === null ? colors.ash : colors.blood }, fillStyle]}
            />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontFamily: fonts.body, fontSize: typeScale.caption, color: colors.ash }}>{shareLabel(item.totalDop, total)}</Text>
            <Text style={{ fontFamily: fonts.body, fontSize: typeScale.caption, color: colors.ash }}>{expenseCountLabel(item.txCount)}</Text>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
});
