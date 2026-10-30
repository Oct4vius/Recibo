import { describe, expect, it } from 'vitest';
import { SECTIONS } from '@desktop/shell/sections';

describe('SECTIONS', () => {
  it('keeps the exact labels and order', () => {
    expect(SECTIONS.map((s) => s.label)).toEqual([
      'Este mes', 'Movimientos', 'Meses anteriores', 'Presupuesto', 'Mis correos', 'Ajustes',
    ]);
  });
  it('opens on month', () => {
    expect(SECTIONS[0].id).toBe('month');
  });
});
