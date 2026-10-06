import { describe, expect, it } from 'vitest';
import { ransomLetters } from '@/theme/ransom';

describe('ransomLetters', () => {
  it('is deterministic: the same text always gets the same styles', () => {
    expect(ransomLetters('ESTA SEMANA')).toEqual(ransomLetters('ESTA SEMANA'));
  });
  it('produces one glyph per character, including accented ones', () => {
    expect(ransomLetters('ÚLTIMOS')).toHaveLength(7);
  });
  it('turns spaces into space glyphs', () => {
    const glyphs = ransomLetters('A B');
    expect(glyphs[1]).toEqual({ kind: 'space' });
  });
  it('never paints a letter with the same color as its background', () => {
    for (const g of ransomLetters('PRESUPUESTO DE LA SEMANA')) {
      if (g.kind === 'letter') expect(g.color).not.toBe(g.background);
    }
  });
  it('never repeats the same look on two consecutive letters', () => {
    const letters = ransomLetters('MOVIMIENTOS').filter((g) => g.kind === 'letter');
    for (let i = 1; i < letters.length; i++) {
      const a = letters[i - 1];
      const b = letters[i];
      if (a.kind === 'letter' && b.kind === 'letter') {
        expect([a.background, a.color, a.bordered]).not.toEqual([b.background, b.color, b.bordered]);
      }
    }
  });
  it('keeps rotations within ±6 degrees', () => {
    for (const g of ransomLetters('HISTORIAL')) {
      if (g.kind === 'letter') expect(Math.abs(g.rotate)).toBeLessThanOrEqual(6);
    }
  });
  it('gives different texts different looks', () => {
    expect(ransomLetters('INICIO')).not.toEqual(ransomLetters('AJUSTE'));
  });
});
