import { banks, candidateBanks } from '../parsers/index.ts';

/** Direcciones de remitente que se piden al buzón: las del registro de parsers y los candidatos (una sola fuente). */
export function bankSenderAddresses(): string[] {
  return [...new Set([...banks, ...candidateBanks].flatMap((bank) => bank.senderAddresses))].sort();
}

/**
 * `$filter` de Graph: correos de esas direcciones exactas recibidos desde `since` (sin milisegundos, truncado).
 * `receivedDateTime` va primero porque Graph exige que las propiedades de `$orderby` aparezcan al inicio del
 * `$filter` (si no, responde `InefficientFilter`).
 */
export function senderFilter(addresses: readonly string[], since: string): string {
  if (addresses.length === 0) throw new Error('no sender addresses');
  const from = new Date(Date.parse(since)).toISOString().replace(/\.\d+Z$/, 'Z');
  const senders = addresses.map((address) => `from/emailAddress/address eq '${address.replaceAll("'", "''")}'`).join(' or ');
  return `receivedDateTime ge ${from} and (${senders})`;
}

/** `q` de Gmail: remitentes exactos y recibidos desde `since` (segundos epoch, truncado; `after:` es exacto en segundos). */
export function gmailQuery(addresses: readonly string[], since: string): string {
  if (addresses.length === 0) throw new Error('no sender addresses');
  return `from:(${addresses.join(' OR ')}) after:${Math.floor(Date.parse(since) / 1000)}`;
}
