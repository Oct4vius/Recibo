import { assertEquals } from 'jsr:@std/assert@1';
import type { ParsedTransaction, RawEmail } from '../parsers/index.ts';
import { toIngestRows, toUnparsed } from './rows.ts';

const email: RawEmail = { messageId: 'AAk-1', from: 'Alertas@bhd.com.do', subject: 'Asunto', text: 'x'.repeat(600), receivedAt: '2026-09-16T02:43:15Z' };

Deno.test('toIngestRows — one row per parsed transaction with message_id <id>#<row>', () => {
  const tx: ParsedTransaction = {
    bankCode: 'bhd', type: 'card_purchase', amount: 275.72, currency: 'DOP', merchant: 'UBER*RIDES',
    occurredAt: '2026-09-16T22:42:00-04:00', cardLast4: '1234', rowIndex: 1, templateId: 'bhd/transactions-table',
  };
  assertEquals(toIngestRows(email, [tx]), [{
    message_id: 'AAk-1#1', bank_code: 'bhd', type: 'card_purchase', amount: 275.72, currency: 'DOP', merchant: 'UBER*RIDES',
    occurred_at: '2026-09-16T22:42:00-04:00', card_last4: '1234', reference: null, counterparty_last4: null, template_id: 'bhd/transactions-table',
  }]);
});

Deno.test('toUnparsed — keeps the subject and the first 500 characters', () => {
  const unparsed = toUnparsed(email, 'bhd');
  assertEquals(unparsed.message_id, 'AAk-1');
  assertEquals(unparsed.snippet.length, 500);
  assertEquals(unparsed.subject, 'Asunto');
});
