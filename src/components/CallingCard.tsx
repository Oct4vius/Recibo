import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { enteringFor, useMotionPreference } from '@/theme/motion';
import { angles, colors, fonts, typeScale } from '@/theme/tokens';
import { RansomText } from './RansomText';
import { SkewButton } from './SkewButton';

interface Props {
  title: string;
  message: string;
  /** `blood` para el 100 % y anuncios; `signal` solo para el aviso del 80 %. */
  tone?: 'blood' | 'signal';
  onDismiss: () => void;
}

/** Tarjeta de anuncio grande: entra con `slam` y queda girada -4°, con una esquina en el color del tono. */
export function CallingCard({ title, message, tone = 'blood', onDismiss }: Props) {
  const { reduced } = useMotionPreference();
  return (
    <Animated.View
      entering={enteringFor(reduced)}
      accessibilityRole="alert"
      style={{
        backgroundColor: colors.void,
        borderWidth: 4,
        borderColor: colors[tone],
        padding: 20,
        transform: [{ rotate: `${angles.title}deg` }],
      }}
    >
      <View
        style={{
          position: 'absolute',
          top: -12,
          right: -12,
          width: 64,
          height: 64,
          backgroundColor: colors[tone],
          transform: [{ rotate: `${angles.backdrop}deg` }],
        }}
      />
      <RansomText text={title} size="md" />
      <Text
        style={{
          fontFamily: fonts.body,
          fontSize: typeScale.body,
          color: colors.paper,
          marginTop: 16,
          marginBottom: 20,
          lineHeight: typeScale.body * 1.4,
        }}
      >
        {message}
      </Text>
      <SkewButton label="Entendido" onPress={onDismiss} variant="ghost" />
    </Animated.View>
  );
}
