import { banks, candidateBanks } from '../parsers/index.ts';

/** Dominios de remitentes bancarios: los del registro de parsers y los candidatos (una sola fuente). */
export function bankSenderDomains(): string[] {
  return [...new Set([...banks, ...candidateBanks].flatMap((bank) => bank.senderDomains))].sort();
}

/** KQL para `$search`: correos de esos dominios recibidos desde el día de `since` (la ingesta no duplica). */
export function senderSearch(domains: readonly string[], since: string): string {
  const from = domains.map((domain) => `from:${domain}`).join(' OR ');
  return `(${from}) AND received>=${since.slice(0, 10)}`;
}
