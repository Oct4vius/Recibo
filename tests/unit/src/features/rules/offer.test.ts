import { describe, expect, it } from 'vitest';
import { RULE_SAVE_FAILED, ruleNotice, ruleOffer, ruleOfferLabel } from '@/features/rules/offer';

const base = { merchant: 'UBER*RIDES', counterpartyLast4: null, categoryId: 'transporte', originalCategoryId: null };

describe('ruleOffer', () => {
  it('offers the merchant when a category was picked', () => {
    expect(ruleOffer(base)).toEqual({ matchField: 'merchant', pattern: 'UBER*RIDES' });
  });
  it('prefers the destination account for transfers', () => {
    expect(ruleOffer({ ...base, merchant: 'GOMEZ PENA, MARIA', counterpartyLast4: '0099' })).toEqual({
      matchField: 'counterparty_last4',
      pattern: '0099',
    });
  });
  it('offers nothing without a category, without a change, or without a merchant', () => {
    expect(ruleOffer({ ...base, categoryId: null })).toBeNull();
    expect(ruleOffer({ ...base, originalCategoryId: 'transporte' })).toBeNull();
    expect(ruleOffer({ ...base, merchant: '   ' })).toBeNull();
  });
  it('trims and caps the proposed pattern at 80 characters', () => {
    expect(ruleOffer({ ...base, merchant: `  ${'A'.repeat(90)}  ` })?.pattern).toBe('A'.repeat(80));
  });
});

describe('ruleOfferLabel', () => {
  it('names the pattern or the account and the category', () => {
    expect(ruleOfferLabel({ matchField: 'merchant', pattern: 'UBER*RIDES' }, ' UBER ', 'Transporte')).toBe(
      'Siempre poner «UBER» en Transporte',
    );
    expect(ruleOfferLabel({ matchField: 'counterparty_last4', pattern: '0099' }, '0099', 'Transferencias propias')).toBe(
      'Siempre poner la cuenta …0099 en Transferencias propias',
    );
  });
});

describe('ruleNotice', () => {
  it('says how many other movements the rule categorized', () => {
    expect(ruleNotice(0)).toBe('Gasto guardado · regla creada.');
    expect(ruleNotice(1)).toBe('Gasto guardado · la regla se aplicó a 1 movimiento más.');
    expect(ruleNotice(4)).toBe('Gasto guardado · la regla se aplicó a 4 movimientos más.');
    expect(RULE_SAVE_FAILED).toBe('Se guardó el gasto, pero no la regla. Intenta desde Ajustes → Reglas.');
  });
});
