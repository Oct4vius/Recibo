import type { BankParser, CandidateBank, ParseResult, RawEmail } from './types.ts';
import { bhd } from './bhd/index.ts';
import { candidateBanks } from './candidates.ts';

export type { BankCode, BankParser, CandidateBank, Currency, ParsedTransaction, ParseResult, RawEmail, Template, TxType } from './types.ts';
export { candidateBanks };

/** Agregar un banco = crear su carpeta con un BankParser y sumarlo aquí. Nada más cambia. */
export const banks: BankParser[] = [bhd];

/** "BHD <Alertas@bhd.com.do>" → "bhd.com.do"; "a@b.c" → "b.c"; sin @ → null. */
export function senderDomain(from: string): string | null {
  const address = from.match(/<([^>]+)>/)?.[1] ?? from;
  const at = address.lastIndexOf('@');
  if (at === -1) return null;
  const domain = address.slice(at + 1).trim().toLowerCase();
  return domain.length > 0 ? domain : null;
}

function domainMatches(domain: string, registered: string): boolean {
  return domain === registered || domain.endsWith(`.${registered}`);
}

export type BankLookup =
  | { kind: 'bank'; bank: BankParser }
  | { kind: 'candidate'; candidate: CandidateBank };

export function findBank(from: string): BankLookup | null {
  const domain = senderDomain(from);
  if (!domain) return null;
  const bank = banks.find((b) => b.senderDomains.some((d) => domainMatches(domain, d)));
  if (bank) return { kind: 'bank', bank };
  const candidate = candidateBanks.find((c) => c.senderDomains.some((d) => domainMatches(domain, d)));
  if (candidate) return { kind: 'candidate', candidate };
  return null;
}

/** Punto de entrada único para sync-mail. */
export function parseEmail(email: RawEmail): ParseResult {
  const lookup = findBank(email.from);
  if (!lookup) return { kind: 'unknown_sender' };
  if (lookup.kind === 'candidate') return { kind: 'unparsed', bankCode: lookup.candidate.code };

  const { bank } = lookup;
  const template = bank.templates.find((t) => t.matches(email));
  if (!template) return { kind: 'unparsed', bankCode: bank.code };

  const transactions = template.parse(email);
  if (transactions.length === 0) return { kind: 'unparsed', bankCode: bank.code };
  return { kind: 'parsed', bankCode: bank.code, transactions };
}
