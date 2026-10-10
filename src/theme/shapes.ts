export type Point = readonly [number, number];

/** Desplazamiento horizontal del borde inclinado en una caja `width × height` (máximo la mitad del ancho). */
export function slantOffset(width: number, height: number, skewDeg: number): number {
  return Math.min(Math.abs(Math.tan((skewDeg * Math.PI) / 180) * height), width / 2);
}

/** Paralelogramo inclinado `skewDeg` grados dentro de una caja `width × height`. */
export function slantedRect(width: number, height: number, skewDeg: number): Point[] {
  const offset = slantOffset(width, height, skewDeg);
  if (offset === 0) return [[0, 0], [width, 0], [width, height], [0, height]];
  return skewDeg < 0
    ? [[offset, 0], [width, 0], [width - offset, height], [0, height]]
    : [[0, 0], [width - offset, 0], [width, height], [offset, height]];
}

/** Rectángulo con el borde inferior dentado: `teeth` dientes de profundidad `depth`. */
export function jaggedRect(width: number, height: number, teeth: number, depth: number): Point[] {
  const step = width / teeth;
  const base = height - Math.min(depth, height);
  const points: Point[] = [[0, 0], [width, 0]];
  for (let i = teeth; i > 0; i--) {
    points.push([i * step, height]);
    points.push([i * step - step / 2, base]);
  }
  points.push([0, height]);
  return points;
}

export function toSvgPoints(points: readonly Point[]): string {
  return points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
}
