import type { ReactNode } from 'react';
import { Modal, Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { enteringFor, useMotionPreference } from '@/theme/motion';
import { colors } from '@/theme/tokens';
import { RansomText } from './RansomText';

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/** Panel para formularios: entra en diagonal (`slam`) sobre un velo negro; tocar el velo lo cierra. */
export function SlamSheet({ visible, onClose, title, children }: Props) {
  const { reduced } = useMotionPreference();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
          onPress={onClose}
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.scrim }}
        />
        {visible ? (
          <Animated.View
            entering={enteringFor(reduced)}
            style={{
              backgroundColor: colors.panel,
              borderTopWidth: 4,
              borderTopColor: colors.blood,
              paddingHorizontal: 20,
              paddingTop: 24,
              paddingBottom: 24 + insets.bottom,
            }}
          >
            <View style={{ marginBottom: 20 }}>
              <RansomText text={title} size="md" />
            </View>
            {children}
          </Animated.View>
        ) : null}
      </View>
    </Modal>
  );
}
