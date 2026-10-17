import type { BankParser } from '../types.ts';
import { transactionsTable } from './transactions-table.ts';
import { servicePayment } from './service-payment.ts';
import { transfer } from './transfer.ts';
import { transferIn } from './transfer-in.ts';
import { purchaseCode } from './purchase-code.ts';

export const bhd: BankParser = {
  code: 'bhd',
  senderDomains: ['bhd.com.do'],
  senderAddresses: ['alertas@bhd.com.do'],
  templates: [transactionsTable, transfer, servicePayment],
  ignored: [transferIn, purchaseCode],
};
