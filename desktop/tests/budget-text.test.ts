import { describe, expect, it } from 'vitest';
import { BUDGET_ORDER, BUDGET_TITLES, limitText, thresholdLabel } from '@desktop/budget/budget-text';

describe('budget text', () => {
  it('precarga el límite con dos decimales', () => {
    expect(limitText(5000)).toBe('5000.00');
    expect(limitText(1234.5)).toBe('1234.50');
    expect(limitText(null)).toBe('');
  });
  it('umbrales', () => {
    expect(thresholdLabel(80)).toBe('Avisarme al llegar al 80 %');
    expect(thresholdLabel(100)).toBe('Avisarme al llegar al 100 %');
  });
  it('títulos y orden', () => {
    expect(BUDGET_TITLES).toEqual({ month: 'Presupuesto del mes', week: 'Presupuesto de la semana' });
    expect(BUDGET_ORDER).toEqual(['month', 'week']);
  });
});
