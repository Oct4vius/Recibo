import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { BACKDROPS, type BackdropIndex } from '@/theme/backdrops';
import { fadeInFor, useMotionPreference } from '@/theme/motion';
import { colors } from '@/theme/tokens';

/** Forma roja de la pestaña: capa exterior con el fundido, capa interior con la rotación. */
export function ScreenBackdrop({ index }: { index: BackdropIndex }) {
  const { reduced } = useMotionPreference();
  const shape = BACKDROPS[index];
  return (
    <Animated.View
      entering={fadeInFor(reduced)}
      style={{ position: 'absolute', top: shape.top, right: shape.right, width: shape.width, height: shape.height, pointerEvents: 'none' }}
    >
      <View style={{ flex: 1, backgroundColor: colors.blood, transform: [{ rotate: `${shape.rotate}deg` }] }} />
    </Animated.View>
  );
}
