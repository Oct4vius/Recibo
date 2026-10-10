import type { BottomTabBarProps } from 'expo-router/tabs';
import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tapFeedback } from '@/lib/haptics';
import { animateTo, useMotionPreference } from '@/theme/motion';
import { angles, colors, MIN_TOUCH } from '@/theme/tokens';

const ROW_PADDING_TOP = 6;
const HIGHLIGHT_HEIGHT = 40;
const HIGHLIGHT_TOP = ROW_PADDING_TOP + (MIN_TOUCH - HIGHLIGHT_HEIGHT) / 2;

/** Barra de pestañas: un bloque rojo inclinado salta a la pestaña elegida con `snap`. */
export function SlamTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { reduced } = useMotionPreference();
  const [width, setWidth] = useState(0);
  const slot = width / state.routes.length;
  const x = useSharedValue(0);
  const placed = useRef(false);
  useEffect(() => {
    if (slot === 0) return;
    if (!placed.current) {
      // Primera medición: colocar el bloque sin animar para que no cruce la barra desde 0.
      placed.current = true;
      x.value = state.index * slot;
      return;
    }
    x.value = animateTo(state.index * slot, 'snap', reduced);
  }, [x, state.index, slot, reduced]);
  const highlight = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { skewX: `${angles.backdrop}deg` }, { rotate: `${angles.title}deg` }],
  }));
  return (
    <View
      accessibilityRole="tablist"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{
        flexDirection: 'row',
        backgroundColor: colors.void,
        borderTopWidth: 3,
        borderTopColor: colors.blood,
        paddingTop: ROW_PADDING_TOP,
        paddingBottom: ROW_PADDING_TOP + insets.bottom,
      }}
    >
      {width > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            { position: 'absolute', top: HIGHLIGHT_TOP, left: slot * 0.15, width: slot * 0.7, height: HIGHLIGHT_HEIGHT, backgroundColor: colors.blood },
            highlight,
          ]}
        />
      ) : null}
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const focused = state.index === index;
        const onPress = () => {
          tapFeedback();
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        };
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={options.title}
            onPress={onPress}
            style={{ flex: 1, minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' }}
          >
            {options.tabBarIcon?.({ focused, color: focused ? colors.paper : colors.ash, size: 22 })}
          </Pressable>
        );
      })}
    </View>
  );
}
