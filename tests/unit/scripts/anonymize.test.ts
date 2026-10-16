import { describe, expect, it } from 'vitest';
import { htmlToText } from '../../../supabase/functions/_shared/parsers/normalize.ts';
import { anonymizeText, buildMinimalEml, checkAnonymized, forbiddenTermsIn, parseAnonymizeConfig } from '../../../scripts/lib/anonymize';
import { emlToRawEmail } from '../../../scripts/lib/eml';

const config = parseAnonymizeConfig({
  replacements: [
    { find: 'GOMEZ PEÑA, MARIA', replace: 'JUAN PEREZ' },
    { find: '5678', replace: '1234' },
  ],
  forbidden: ['pareja@gmail.example'],
});

describe('parseAnonymizeConfig', () => {
  it('rejects missing arrays and empty terms', () => {
    expect(() => parseAnonymizeConfig({ replacements: [] })).toThrow();
    expect(() => parseAnonymizeConfig({ replacements: [{ find: '', replace: 'x' }], forbidden: [] })).toThrow();
    expect(() => parseAnonymizeConfig({ replacements: [], forbidden: [''] })).toThrow();
  });
});

describe('anonymizeText', () => {
  it('replaces names case-insensitively, also behind letter entities, leaving markup entities alone', () => {
    expect(anonymizeText('<td>Gomez Peña, Maria</td>', config)).toBe('<td>JUAN PEREZ</td>');
    expect(anonymizeText('<td>GOMEZ PE&Ntilde;A, MARIA</td><td>&lt;b&gt;</td>', config)).toBe('<td>JUAN PEREZ</td><td>&lt;b&gt;</td>');
  });
  it('regression — a digit-only term matches whole numbers only, never inside amounts or longer numbers', () => {
    expect(anonymizeText('Visa Débito Intl # 5678', config)).toBe('Visa Débito Intl # 1234');
    expect(anonymizeText('XXXXXXX5678', config)).toBe('XXXXXXX1234');
    expect(anonymizeText('ref 956789 · RD$ 15,678.00 · 05678', config)).toBe('ref 956789 · RD$ 15,678.00 · 05678');
  });
  it('regression — masks every run of 10 or more digits (including IBAN bodies), not shorter ones', () => {
    expect(anonymizeText('Tel 8095551234567', config)).toBe('Tel 1234567890123');
    expect(anonymizeText('Conf 123456789', config)).toBe('Conf 123456789');
    expect(anonymizeText('x 9999999999999999', config)).toBe('x 1234567890123456');
    expect(anonymizeText('DO28 99999999999999999999', config)).toBe('DO28 12345678901234567890');
  });
});

describe('forbiddenTermsIn', () => {
  it('reports surviving terms once, case-insensitively, including forbidden-only terms', () => {
    expect(forbiddenTermsIn(['hola PAREJA@gmail.example', 'gomez peña, maria', 'GOMEZ PEÑA, MARIA'], config)).toEqual([
      'GOMEZ PEÑA, MARIA',
      'pareja@gmail.example',
    ]);
    expect(forbiddenTermsIn(['JUAN PEREZ 1234'], config)).toEqual([]);
  });
  it('catches a name split by tags once the HTML is normalized', () => {
    const html = '<td><b>GOMEZ</b> PEÑA, MARIA</td>';
    expect(forbiddenTermsIn([htmlToText(anonymizeText(html, { replacements: [], forbidden: [] }))], config)).toEqual(['GOMEZ PEÑA, MARIA']);
  });
});

describe('buildMinimalEml', () => {
  it('round-trips through emlToRawEmail with only the minimal headers and 8bit UTF-8 HTML', async () => {
    const eml = buildMinimalEml({
      from: 'Alertas@bhd.com.do',
      subject: 'BHD Notificación de Transacciones',
      date: '2026-09-17T02:43:15.000Z',
      messageId: '<abc@bhd.com.do>',
      html: '<table><tr><td>Fecha</td><td>Comercio</td></tr><tr><td>16/09/2026</td><td>PANADERÍA</td></tr></table>',
    });
    expect(eml).toContain('Content-Transfer-Encoding: 8bit');
    expect(eml).toContain('PANADERÍA');
    expect(eml).not.toMatch(/^To:/m);
    expect(await emlToRawEmail(new TextEncoder().encode(eml))).toEqual({
      messageId: '<abc@bhd.com.do>',
      from: 'Alertas@bhd.com.do',
      subject: 'BHD Notificación de Transacciones',
      text: 'Fecha | Comercio\n16/09/2026 | PANADERÍA',
      receivedAt: '2026-09-17T02:43:15.000Z',
    });
  });
});

describe('checkAnonymized', () => {
  it('accepts clean texts and refuses, listing the terms, while any survives', () => {
    expect(checkAnonymized(['JUAN PEREZ 1234'], config)).toEqual({ ok: true });
    expect(checkAnonymized(['hola pareja@gmail.example'], config)).toEqual({ ok: false, terms: ['pareja@gmail.example'] });
  });
});
