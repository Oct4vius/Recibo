import { assertEquals, assertNotEquals } from 'jsr:@std/assert@1';
import type { RawEmail } from './types.ts';
import { banks, candidateBanks, findBank, parseEmail, senderDomain } from './index.ts';
import { loadFixture } from './test-helpers.ts';

const EMPTY: RawEmail = { messageId: '', from: '', subject: '', text: '', receivedAt: '' };

Deno.test('senderDomain — extracts the domain from bare or display-name addresses', () => {
  assertEquals(senderDomain('Alertas@bhd.com.do'), 'bhd.com.do');
  assertEquals(senderDomain('BHD <Alertas@bhd.com.do>'), 'bhd.com.do');
  assertEquals(senderDomain('"Alertas BHD" <alertas@mail.bhd.com.do>'), 'mail.bhd.com.do');
  assertEquals(senderDomain('sin arroba'), null);
});

Deno.test('findBank — exact domain and subdomain match a bank', () => {
  const exact = findBank('Alertas@bhd.com.do');
  const sub = findBank('x@mail.bhd.com.do');
  assertEquals(exact?.kind, 'bank');
  assertEquals(sub?.kind, 'bank');
  assertEquals(findBank('promo@notbhd.com.do'), null);
});

Deno.test('findBank — candidate banks are recognized but have no parser', () => {
  const result = findBank('alertas@banreservas.com');
  assertEquals(result?.kind, 'candidate');
  if (result?.kind === 'candidate') assertEquals(result.candidate.code, 'banreservas');
});

Deno.test('parseEmail — BHD purchase → parsed', () => {
  const result = parseEmail(loadFixture('bhd', 'card-purchase-approved'));
  assertEquals(result.kind, 'parsed');
  if (result.kind === 'parsed') {
    assertEquals(result.bankCode, 'bhd');
    assertEquals(result.transactions.length, 1);
    assertEquals(result.transactions[0].templateId, 'bhd/transactions-table');
  }
});

Deno.test('parseEmail — BHD transfer → parsed with the transfer template', () => {
  const result = parseEmail(loadFixture('bhd', 'transfer-out'));
  assertEquals(result.kind, 'parsed');
  if (result.kind === 'parsed') assertEquals(result.transactions[0].templateId, 'bhd/transfer');
});

Deno.test('parseEmail — known bank, unknown subject → unparsed', () => {
  assertEquals(parseEmail({ ...EMPTY, from: 'Alertas@bhd.com.do', subject: 'Estado de cuenta' }), { kind: 'unparsed', bankCode: 'bhd' });
});

Deno.test('parseEmail — known bank, matching subject but no rows → unparsed', () => {
  assertEquals(parseEmail({ ...EMPTY, from: 'Alertas@bhd.com.do', subject: 'BHD Notificación de Transacciones', text: 'nada' }), { kind: 'unparsed', bankCode: 'bhd' });
});

Deno.test('parseEmail — candidate bank → unparsed with its code', () => {
  assertEquals(parseEmail({ ...EMPTY, from: 'no-reply@apap.com.do', subject: 'Alerta' }), { kind: 'unparsed', bankCode: 'apap' });
});

Deno.test('parseEmail — unknown sender → unknown_sender', () => {
  assertEquals(parseEmail({ ...EMPTY, from: 'promo@amazon.com', subject: 'Oferta' }), { kind: 'unknown_sender' });
});

Deno.test('contract — every registered bank and template honors the interface', () => {
  const codes = banks.map((b) => b.code);
  assertEquals(new Set(codes).size, codes.length, 'bank codes must be unique');

  const allDomains = [...banks, ...candidateBanks].flatMap((b) => b.senderDomains);
  assertEquals(new Set(allDomains).size, allDomains.length, 'sender domains must not repeat across banks');

  for (const bank of banks) {
    assertNotEquals(bank.senderDomains.length, 0, `${bank.code} needs senderDomains`);
    for (const domain of bank.senderDomains) {
      assertEquals(domain, domain.toLowerCase(), 'domains in lowercase');
      assertEquals(domain.includes('@'), false, 'domains without @');
    }
    assertNotEquals(bank.templates.length, 0, `${bank.code} needs at least one template`);
    const ids = bank.templates.map((t) => t.id);
    assertEquals(new Set(ids).size, ids.length, `${bank.code} template ids must be unique`);
    for (const template of bank.templates) {
      assertEquals(template.id.startsWith(`${bank.code}/`), true, `${template.id} must be prefixed with ${bank.code}/`);
      assertEquals(template.parse(EMPTY), [], `${template.id} must return [] on empty input, never throw`);
    }
  }

  for (const candidate of candidateBanks) {
    assertEquals(candidate.status, 'candidate');
    assertEquals(codes.includes(candidate.code), false, `${candidate.code} cannot be both bank and candidate`);
  }
});

Deno.test('contract — every registered template has at least one real fixture that parses to a non-empty list', () => {
  for (const bank of banks) {
    const fixturesDir = new URL(`./${bank.code}/fixtures/`, import.meta.url);
    const fixtureNames = [...Deno.readDirSync(fixturesDir)]
      .filter((entry) => entry.isFile && entry.name.endsWith('.json'))
      .map((entry) => entry.name);
    assertNotEquals(fixtureNames.length, 0, `${bank.code} needs at least one fixture in <bank>/fixtures/`);

    const emails = fixtureNames.map((name) => JSON.parse(Deno.readTextFileSync(new URL(name, fixturesDir))) as RawEmail);

    for (const template of bank.templates) {
      const parsedByFixture = emails.map((email) => template.parse(email));
      const nonEmpty = parsedByFixture.find((txs) => txs.length > 0);
      assertNotEquals(nonEmpty, undefined, `${template.id} has no fixture in <bank>/fixtures/ that parses to a non-empty list`);
      for (const tx of nonEmpty ?? []) assertEquals(tx.bankCode, bank.code);
    }
  }
});

Deno.test('contract — parser source files never use Deno APIs, node: imports, fetch or Date.now', () => {
  const FORBIDDEN = /\bDeno\.|from ['"]node:|\bfetch\(|Date\.now\(/;
  const offenders: string[] = [];

  function walk(dirUrl: URL, relPath: string): void {
    for (const entry of Deno.readDirSync(dirUrl)) {
      const entryRel = relPath ? `${relPath}/${entry.name}` : entry.name;
      if (entry.isDirectory) {
        walk(new URL(`${entry.name}/`, dirUrl), entryRel);
        continue;
      }
      if (!entry.name.endsWith('.ts')) continue;
      if (entry.name.endsWith('.test.ts') || entry.name === 'test-helpers.ts') continue;
      const content = Deno.readTextFileSync(new URL(entry.name, dirUrl));
      if (FORBIDDEN.test(content)) offenders.push(entryRel);
    }
  }

  walk(new URL('./', import.meta.url), '');
  assertEquals(offenders, [], `parser source files must stay pure: ${offenders.join(', ')}`);
});
