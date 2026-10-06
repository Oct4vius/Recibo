import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BACKDROPS } from '@/theme/backdrops';
import { fadeInFor, useMotionPreference } from '@/theme/motion';
import { colors } from '@/theme/tokens';
import { RansomText } from './RansomText';

interface Props {
  title: string;
  /** Índice de la forma de fondo (0–4); una por pestaña. */
  backdrop: number;
  children?: ReactNode;
}

/** Contenedor de pantalla: fondo `void`, forma roja de la pestaña, título en nota de rescate. */
export function Screen({ title, backdrop, children }: Props) {
  const { reduced } = useMotionPreference();
  const shape = BACKDROPS[backdrop % BACKDROPS.length];
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.void }}>
      <Animated.View
        entering={fadeInFor(reduced)}
        pointerEvents="none"
        style={{ position: 'absolute', top: shape.top, right: shape.right, width: shape.width, height: shape.height }}
      >
        <View style={{ flex: 1, backgroundColor: colors.blood, transform: [{ rotate: `${shape.rotate}deg` }] }} />
      </Animated.View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <View style={{ marginTop: 12, marginBottom: 24 }}>
          <RansomText text={title} animate />
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
