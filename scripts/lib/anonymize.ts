import { decodeEntities } from '../../supabase/functions/_shared/parsers/normalize.ts';

/** Forma de `fixtures-raw/anonymize.local.json` (gitignored). */
export interface AnonymizeConfig {
  replacements: { find: string; replace: string }[];
  /** Términos que no deben aparecer y no tienen reemplazo (p. ej. el correo de la persona). */
  forbidden: string[];
}

export function parseAnonymizeConfig(json: unknown): AnonymizeConfig {
  const fail = (what: string): never => {
    throw new Error(`anonymize.local.json inválido: ${what}`);
  };
  if (typeof json !== 'object' || json === null) return fail('debe ser un objeto con "replacements" y "forbidden"');
  const { replacements, forbidden } = json as Record<string, unknown>;
  if (!Array.isArray(replacements)) return fail('falta el arreglo "replacements"');
  if (!Array.isArray(forbidden)) return fail('falta el arreglo "forbidden"');
  return {
    replacements: replacements.map((item) => {
      const { find, replace } = (item ?? {}) as Record<string, unknown>;
      if (typeof find !== 'string' || find.length === 0) return fail('cada "find" debe ser un texto no vacío');
      if (typeof replace !== 'string') return fail('cada "replace" debe ser un texto');
      return { find, replace };
    }),
    forbidden: forbidden.map((term) => (typeof term === 'string' && term.length > 0 ? term : fail('cada término de "forbidden" debe ser un texto no vacío'))),
  };
}

/**
 * Única definición de "coincide": texto literal, sin distinguir mayúsculas; un término de solo dígitos
 * coincide solo como número completo (nunca dentro de montos ni de números más largos).
 */
export function termPattern(term: string): RegExp {
  const literal = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return /^\d+$/.test(term) ? new RegExp(`(?<!\\d)${literal}(?!\\d)`, 'giu') : new RegExp(literal, 'giu');
}

export const LONG_NUMBER = /(?<!\d)\d{10,15}(?!\d)/g;

/** Solo las entidades que resultan en una letra (PE&Ntilde;A); las de marcado (&lt;) se dejan como están. */
function decodeLetterEntities(text: string): string {
  return text.replace(/&(?:#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match) => {
    const decoded = decodeEntities(match);
    return /^\p{L}$/u.test(decoded) ? decoded : match;
  });
}

export function anonymizeText(text: string, config: AnonymizeConfig): string {
  const ordered = [...config.replacements].sort((a, b) => b.find.length - a.find.length);
  const replaced = ordered.reduce((acc, { find, replace }) => acc.replace(termPattern(find), () => replace), decodeLetterEntities(text));
  return replaced.replace(LONG_NUMBER, (digits) => '1234567890'.repeat(2).slice(0, digits.length));
}

/** Términos de la config que siguen en algún texto, sin repetir: primero `replacements[].find`, luego `forbidden`. */
export function forbiddenTermsIn(texts: readonly string[], config: AnonymizeConfig): string[] {
  const terms = [...config.replacements.map((r) => r.find), ...config.forbidden];
  const surviving = terms.filter((term) => {
    const pattern = termPattern(term);
    return texts.some((text) => text.search(pattern) !== -1);
  });
  return [...new Set(surviving)];
}

/** .eml mínimo: solo los headers imprescindibles y el HTML en UTF-8 plano (nunca base64/QP: esconderían términos). */
export function buildMinimalEml(email: { from: string; subject: string; date: string; messageId: string; html: string }): string {
  const subject = `=?UTF-8?B?${Buffer.from(email.subject, 'utf8').toString('base64')}?=`;
  const headers = [
    `From: ${email.from}`,
    `Subject: ${subject}`,
    `Date: ${new Date(email.date).toUTCString()}`,
    `Message-ID: ${email.messageId}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: 8bit',
  ];
  return `${headers.join('\r\n')}\r\n\r\n${email.html}`;
}
