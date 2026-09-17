import type { CandidateBank } from './types.ts';

/**
 * Bancos sin parser. Dominios PROBABLES, no verificados con correo real.
 * Sus correos caen en unparsed_emails y sirven de muestra para escribir el parser.
 * Al verificar un dominio con un .eml real, moverlo al BankParser correspondiente.
 */
export const candidateBanks: CandidateBank[] = [
  {
    code: 'banreservas',
    senderDomains: ['banreservas.com', 'banreservas.com.do'],
    status: 'candidate',
    note: 'Sin correo real. Dominios probables.',
  },
  {
    code: 'popular',
    senderDomains: ['bpd.com.do', 'popularenlinea.com'],
    status: 'candidate',
    note: 'Sin correo real. Dominios probables.',
  },
  {
    code: 'apap',
    senderDomains: ['apap.com.do'],
    status: 'candidate',
    note: 'Sin correo real. Dominio probable.',
  },
];
