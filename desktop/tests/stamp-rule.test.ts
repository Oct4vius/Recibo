import { describe, expect, it } from 'vitest';
import { showsStamp } from '../src/ui/stamp-rule';

describe('showsStamp', () => {
  it('sella al guardar un gasto, también con regla', () => {
    expect(showsStamp('Gasto guardado')).toBe(true);
    expect(showsStamp('Gasto guardado · regla guardada.')).toBe(true);
  });

  it('no sella otros avisos ni la ausencia de aviso', () => {
    expect(showsStamp('Gasto borrado')).toBe(false);
    expect(showsStamp(null)).toBe(false);
  });
});
