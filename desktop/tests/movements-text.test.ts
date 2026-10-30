import { describe, expect, it } from 'vitest';
import { localDate } from '@/lib/dates';
import type { TransactionListItem } from '@/features/transactions/mapping';
import { defaultMovementsView, monthPeriod } from '@desktop/movements/movements-view';
import { dayHeading, emptyMovementsText, presentMovement } from '@desktop/movements/movements-text';

const oct = localDate(2026, 10, 1);
const item = (over: Partial<TransactionListItem>): TransactionListItem => ({
  id: 'a',
  amount: 100,
  currency: 'DOP',
  merchant: 'UBER',
  occurredAt: '2026-10-30T12:00:00Z',
  categoryId: null,
  categoryName: null,
  isIgnored: false,
  source: 'email',
  bankCode: 'bhd',
  type: 'card_purchase',
  counterpartyLast4: null,
  ignoredReason: null,
  reviewedAt: null,
  dopEquivalent: null,
  ...over,
});

describe('dayHeading', () => {
  it('names today and yesterday, else the full date', () => {
    expect(dayHeading(localDate(2026, 10, 30), 'today')).toBe('Hoy');
    expect(dayHeading(localDate(2026, 10, 29), 'yesterday')).toBe('Ayer');
    expect(dayHeading(localDate(2026, 10, 30), null)).toBe('Viernes 30 de octubre');
  });
});

describe('presentMovement', () => {
  it('uses no technical words', () => {
    expect(presentMovement(item({ type: 'card_reversal', merchant: null }))).toMatchObject({ title: 'Devolución', badge: 'Devolución' });
    expect(presentMovement(item({ isIgnored: true })).badge).toBe('No se cuenta');
    expect(presentMovement(item({ source: 'manual' })).badge).toBe('Agregado a mano');
    expect(presentMovement(item({})).badge).toBeUndefined();
  });
});

describe('emptyMovementsText', () => {
  it('says what limits the list', () => {
    const view = defaultMovementsView(oct);
    expect(emptyMovementsText(view, oct)).toBe('No hay movimientos en octubre.');
    expect(emptyMovementsText({ ...view, bankCode: 'bhd' }, oct)).toBe('No hay movimientos con estos filtros.');
    expect(emptyMovementsText({ ...view, scope: { kind: 'all' } }, oct)).toBe('Todavía no hay movimientos.');
  });
  it('a range scope names the period generically', () => {
    const scope = { kind: 'range' as const, period: monthPeriod(oct, 'America/Santo_Domingo') };
    expect(emptyMovementsText({ ...defaultMovementsView(oct), scope }, oct)).toBe('No hay movimientos en este período.');
  });
});
