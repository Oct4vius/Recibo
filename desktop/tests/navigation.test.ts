import { describe, expect, it } from 'vitest';
import { localDate } from '@/lib/dates';
import { openMovements, selectSection, START_ROUTE } from '@desktop/shell/navigation';
import { defaultMovementsView } from '@desktop/movements/movements-view';

const view = { ...defaultMovementsView(localDate(2026, 10, 1)), bankCode: 'bhd' as const };

describe('shell navigation', () => {
  it('starts on this month', () => {
    expect(START_ROUTE).toEqual({ section: 'month', movements: null, visit: 0 });
  });
  it('the sidebar always opens Movimientos without filters', () => {
    const filtered = openMovements(START_ROUTE, view);
    expect(selectSection(filtered, 'movements')).toMatchObject({ section: 'movements', movements: null, visit: 2 });
  });
  it('opening from a category keeps the filters', () => {
    expect(openMovements(START_ROUTE, view)).toMatchObject({ section: 'movements', movements: view, visit: 1 });
  });
});
