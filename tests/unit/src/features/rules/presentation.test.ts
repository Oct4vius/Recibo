import { describe, expect, it } from 'vitest';
import { appliedRuleText, ruleErrorMessage, rulePatternError, ruleSubtitle, ruleTitle } from '@/features/rules/presentation';
import { SAVE_ERROR } from '@/features/transactions/messages';

describe('ruleTitle / ruleSubtitle', () => {
  it('shows pattern → category and how it matches', () => {
    expect(ruleTitle('UBER', 'Transporte')).toBe('UBER → Transporte');
    expect(ruleSubtitle('merchant')).toBe('Comercio contiene');
    expect(ruleSubtitle('counterparty_last4')).toBe('Cuenta destino termina en');
  });
});

describe('rulePatternError', () => {
  it('needs 1 to 80 characters for a merchant', () => {
    expect(rulePatternError('merchant', '  ')).toBe('Escribe el texto a buscar.');
    expect(rulePatternError('merchant', 'a'.repeat(81))).toBe('Máximo 80 caracteres.');
    expect(rulePatternError('merchant', 'UBER')).toBeNull();
  });
  it('needs exactly 4 digits for an account', () => {
    expect(rulePatternError('counterparty_last4', '99')).toBe('Escribe los últimos 4 dígitos de la cuenta.');
    expect(rulePatternError('counterparty_last4', 'ABCD')).toBe('Escribe los últimos 4 dígitos de la cuenta.');
    expect(rulePatternError('counterparty_last4', '0099')).toBeNull();
  });
});

describe('ruleErrorMessage', () => {
  it('maps duplicate patterns, bad accounts and anything else', () => {
    expect(ruleErrorMessage({ code: '23505' })).toBe('Ya tienes una regla con ese texto.');
    expect(ruleErrorMessage({ code: '23514' })).toBe('Escribe los últimos 4 dígitos de la cuenta.');
    expect(ruleErrorMessage(new Error('offline'))).toBe(SAVE_ERROR);
  });
});

describe('appliedRuleText', () => {
  it('counts the movements the rule categorized', () => {
    expect(appliedRuleText(0)).toBe('Regla guardada');
    expect(appliedRuleText(1)).toBe('Regla guardada · se aplicó a 1 movimiento');
    expect(appliedRuleText(4)).toBe('Regla guardada · se aplicó a 4 movimientos');
  });
});
