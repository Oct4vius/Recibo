import type { BankParser } from '../types.ts';
import { transactionsTable } from './transactions-table.ts';
import { transfer } from './transfer.ts';

export const bhd: BankParser = {
  code: 'bhd',
  senderDomains: ['bhd.com.do'],
  templates: [transactionsTable, transfer],
};
