import palette from './colors.json';

/** `scrim` es el velo detrás de paneles modales; no se usa para texto ni superficies. */
export type ColorToken = 'void' | 'panel' | 'blood' | 'paper' | 'ash' | 'signal' | 'scrim';

/** Paleta de la app (solo modo oscuro). Fuente: `colors.json`, que también lee Tailwind. */
export const colors: Record<ColorToken, string> = palette;

export const fonts = {
  display: 'Anton_400Regular',
  amount: 'BarlowCondensed_500Medium',
  body: 'Barlow_400Regular',
  bodyStrong: 'Barlow_500Medium',
} as const;

export const typeScale = {
  displayLg: 32,
  displayMd: 24,
  displaySm: 18,
  amountHero: 52,
  amountLarge: 32,
  amountRow: 18,
  body: 15,
  caption: 13,
} as const;

/** Ángulos fijos en grados: pocos ángulos para que lo inclinado se lea como sistema. */
export const angles = { row: -8, backdrop: -14, title: -4 } as const;

/** Área táctil mínima en dp. */
export const MIN_TOUCH = 48;
