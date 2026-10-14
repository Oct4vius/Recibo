import { banks, candidateBanks } from '../parsers/index.ts';

/** Dominios de remitentes bancarios: los del registro de parsers y los candidatos (una sola fuente). */
export function bankSenderDomains(): string[] {
  return [...new Set([...banks, ...candidateBanks].flatMap((bank) => bank.senderDomains))].sort();
}

const DAY_MS = 24 * 60 * 60_000;

/**
 * KQL para `$search`: correos de esos dominios recibidos desde el día ANTERIOR a la fecha UTC de `since`.
 * Graph puede leer la fecha KQL en la zona del buzón: con la fecha UTC, el correo de 20:00 a 24:00 en Santo Domingo
 * quedaría fuera para siempre. Los repetidos los absorbe la ingesta.
 */
export function senderSearch(domains: readonly string[], since: string): string {
  const from = domains.map((domain) => `from:${domain}`).join(' OR ');
  const day = new Date(Date.parse(since) - DAY_MS).toISOString().slice(0, 10);
  return `(${from}) AND received>=${day}`;
}
