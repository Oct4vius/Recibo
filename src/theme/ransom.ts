import type { ColorToken } from './tokens';

export type RansomGlyph =
  | { kind: 'space' }
  | { kind: 'letter'; char: string; background: ColorToken; color: ColorToken; bordered: boolean; rotate: number };

interface Look {
  background: ColorToken;
  color: ColorToken;
  bordered: boolean;
}

const LOOKS: readonly Look[] = [
  { background: 'paper', color: 'void', bordered: false },
  { background: 'void', color: 'paper', bordered: true },
  { background: 'paper', color: 'blood', bordered: false },
  { background: 'void', color: 'paper', bordered: false },
  { background: 'blood', color: 'paper', bordered: false },
];

const ROTATIONS = [-6, -3, 0, 0, 3, 6] as const;

/** FNV-1a de 32 bits: semilla estable derivada del texto. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32: PRNG determinista. */
function random(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Estilo por letra de un título en nota de rescate. El mismo texto siempre produce el mismo resultado. */
export function ransomLetters(text: string): RansomGlyph[] {
  const next = random(hash(text));
  let previous = -1;
  return [...text].map((char): RansomGlyph => {
    if (char === ' ') return { kind: 'space' };
    let look = Math.floor(next() * LOOKS.length);
    if (look === previous) look = (look + 1) % LOOKS.length;
    previous = look;
    const rotate = ROTATIONS[Math.floor(next() * ROTATIONS.length)];
    return { kind: 'letter', char, ...LOOKS[look], rotate };
  });
}
