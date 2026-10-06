/** Forma roja de fondo por pestaña (reemplaza las poses de personaje del juego). Orden = orden de pestañas. */
export interface Backdrop {
  top: number;
  right: number;
  width: number;
  height: number;
  rotate: number;
}

export const BACKDROPS: readonly Backdrop[] = [
  { top: -40, right: -60, width: 260, height: 200, rotate: -14 },
  { top: -20, right: -120, width: 300, height: 140, rotate: -10 },
  { top: 40, right: -80, width: 220, height: 260, rotate: -18 },
  { top: -60, right: -20, width: 200, height: 180, rotate: -8 },
  { top: 10, right: -140, width: 320, height: 120, rotate: -14 },
];
