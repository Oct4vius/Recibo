import { useState, type ReactNode } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import { jaggedRect, slantedRect, slantOffset, toSvgPoints } from '@/theme/shapes';
import { angles, colors, type ColorToken } from '@/theme/tokens';

interface Props {
  children?: ReactNode;
  color?: ColorToken;
  /** Inclinación en grados; por defecto la de las tiras (-8). */
  skew?: number;
  /** Borde inferior dentado en vez de inclinado. */
  jagged?: boolean;
  padding?: number;
  style?: StyleProp<ViewStyle>;
}

/** Fondo de polígono inclinado o dentado; el contenido queda derecho. */
export function SlantPanel({ children, color = 'panel', skew = angles.row, jagged = false, padding = 16, style }: Props) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  };
  const points =
    size.width > 0
      ? toSvgPoints(jagged ? jaggedRect(size.width, size.height, 14, 8) : slantedRect(size.width, size.height, skew))
      : '';
  // El contenido se queda dentro del borde inclinado: padding horizontal extra igual al desplazamiento.
  const horizontal = jagged ? padding : padding + slantOffset(size.width, size.height, skew);
  return (
    <View onLayout={onLayout} style={[{ paddingVertical: padding, paddingHorizontal: horizontal }, style]}>
      {size.width > 0 && (
        <Svg width={size.width} height={size.height} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Polygon points={points} fill={colors[color]} />
        </Svg>
      )}
      {children}
    </View>
  );
}
