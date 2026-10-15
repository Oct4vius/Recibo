import type { CandidateBank } from './types.ts';

/**
 * Bancos sin parser. Dominios PROBABLES, no verificados con correo real.
 * sync-mail solo pide al buzón las `senderAddresses`; un candidato sin dirección no se busca hasta que alguien
 * reporte el remitente real. Sus correos caen en unparsed_emails y sirven de muestra para escribir el parser.
 * Al verificar un dominio con un .eml real, moverlo al BankParser correspondiente.
 */
export const candidateBanks: CandidateBank[] = [
  {
    code: 'banreservas',
    senderDomains: ['banreservas.com', 'banreservas.com.do'],
    senderAddresses: [],
    status: 'candidate',
    note: 'Sin correo real. Dominios probables; sin dirección de remitente no se busca.',
  },
  {
    code: 'popular',
    senderDomains: ['bpd.com.do', 'popularenlinea.com'],
    senderAddresses: [],
    status: 'candidate',
    note: 'Sin correo real. Dominios probables; sin dirección de remitente no se busca.',
  },
  {
    code: 'apap',
    senderDomains: ['apap.com.do'],
    senderAddresses: ['noreply@apap.com.do'],
    status: 'candidate',
    note: 'Remitente visto en un buzón real (2026-10-15); sin .eml ni parser.',
  },
];
