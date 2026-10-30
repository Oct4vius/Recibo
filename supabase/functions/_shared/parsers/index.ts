import type { BankParser, CandidateBank, ParseResult, RawEmail } from './types.ts';
import { bhd } from './bhd/index.ts';
import { candidateBanks } from './candidates.ts';

export type { BankCode, BankParser, CandidateBank, Currency, IgnoredEmail, ParsedTransaction, ParseResult, RawEmail, Template, TxType } from './types.ts';
export { candidateBanks };

/** Agregar un banco = crear su carpeta con un BankParser y sumarlo aquí. Nada más cambia. */
export const banks: BankParser[] = [bhd];

/**
 * Quita del header las partes que el remitente escribe libremente: frases entre comillas (con escapes \") y
 * comentarios entre paréntesis (anidables). Lo que queda es la dirección real (RFC 5322).
 */
function withoutDisplayText(from: string): string {
  let out = '';
  let inQuote = false;
  let depth = 0;
  for (let i = 0; i < from.length; i++) {
    const c = from[i];
    if (c === '\\' && (inQuote || depth > 0)) {
      i++;
      continue;
    }
    if (inQuote) {
      if (c === '"') inQuote = false;
      continue;
    }
    if (c === '(') {
      depth++;
      continue;
    }
    if (depth > 0) {
      if (c === ')') depth--;
      continue;
    }
    if (c === '"') {
      inQuote = true;
      continue;
    }
    out += c;
  }
  return out;
}

/**
 * "BHD <Alertas@bhd.com.do>" → "Alertas@bhd.com.do". Conserva las mayúsculas. Un "<...>" dentro del nombre visible
 * o de un comentario no cuenta: '"<alertas@bhd.com.do>" <x@evil.example>' es x@evil.example.
 * Solo se acepta UN buzón ("nombre <dirección>" o una dirección suelta); con varios, o malformado, devuelve "" y el
 * correo queda como remitente desconocido.
 */
export function senderAddress(from: string): string {
  const mailbox = withoutDisplayText(from).trim();
  if (mailbox.includes(',')) return '';
  const angled = mailbox.match(/^[^<>]*<([^<>]+)>\s*$/);
  if (angled) return angled[1].trim();
  return /^[^\s<>]+$/.test(mailbox) ? mailbox : '';
}

/** "BHD <Alertas@bhd.com.do>" → "bhd.com.do"; "a@b.c" → "b.c"; sin @ → null. */
export function senderDomain(from: string): string | null {
  const address = senderAddress(from);
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
  if (bank.ignored.some((rule) => rule.matches(email))) return { kind: 'ignored', bankCode: bank.code };
  const template = bank.templates.find((t) => t.matches(email));
  if (!template) return { kind: 'unparsed', bankCode: bank.code };

  const transactions = template.parse(email);
  if (transactions.length === 0) return { kind: 'unparsed', bankCode: bank.code };
  return { kind: 'parsed', bankCode: bank.code, transactions };
}
