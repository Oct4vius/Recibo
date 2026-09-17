export type BankCode = 'bhd' | 'banreservas' | 'popular' | 'apap';

export type TxType = 'card_purchase' | 'card_reversal' | 'atm_withdrawal' | 'transfer_out';

export type Currency = 'DOP' | 'USD';

/** Correo ya decodificado y normalizado. Lo produce el cliente de correo (o el script de fixtures). */
export interface RawEmail {
  /** Id del proveedor (Gmail/Graph) o Message-ID del .eml. Único por cuenta vinculada. */
  messageId: string;
  /** Dirección del remitente. Puede venir como "Nombre <correo>" o solo "correo". */
  from: string;
  subject: string;
  /** Salida de htmlToText(): una línea por bloque/fila, celdas separadas por " | ". */
  text: string;
  /** ISO 8601. Fallback si el cuerpo no trae fecha. */
  receivedAt: string;
}

export interface ParsedTransaction {
  bankCode: BankCode;
  type: TxType;
  /** Siempre positivo, 2 decimales. El signo lo da `type`. */
  amount: number;
  currency: Currency;
  /** null cuando el banco no lo envía (reversas BHD). */
  merchant: string | null;
  /** ISO 8601 con offset -04:00 (America/Santo_Domingo). */
  occurredAt: string;
  cardLast4?: string;
  /** Número de confirmación (transferencias). */
  reference?: string;
  /** Últimos 4 de la cuenta destino (transferencias). */
  counterpartyLast4?: string;
  /** Fila dentro del correo, 0-based. Parte del message_id único. */
  rowIndex: number;
  /** '<bank>/<template>' para trazabilidad. */
  templateId: string;
}

/** Una plantilla de correo = un archivo. */
export interface Template {
  id: string;
  matches(email: RawEmail): boolean;
  /** [] = no pudo extraer nada válido (→ unparsed_emails). Todo o nada. */
  parse(email: RawEmail): ParsedTransaction[];
}

export interface BankParser {
  code: BankCode;
  /** Dominios en minúsculas, sin '@'. Se aceptan subdominios. */
  senderDomains: string[];
  templates: Template[];
}

/** Banco sin parser: solo se capturan sus correos en unparsed_emails. */
export interface CandidateBank {
  code: BankCode;
  senderDomains: string[];
  status: 'candidate';
  /** Por qué es candidato y qué falta. */
  note: string;
}

export type ParseResult =
  | { kind: 'parsed'; bankCode: BankCode; transactions: ParsedTransaction[] }
  | { kind: 'unparsed'; bankCode: BankCode }
  | { kind: 'unknown_sender' };
