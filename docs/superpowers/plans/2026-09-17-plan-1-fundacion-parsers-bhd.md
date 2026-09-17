# Plan 1 — Fundación del repo y parsers BHD

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar el repositorio inicializado con Bun, Vitest y Deno, y entregar los parsers de BHD (compra aprobada, reversa, transferencia) probados contra las cuatro fixtures reales, detrás de un registro de bancos que `sync-mail` consumirá en el Plan 3.

**Architecture:** Los parsers son funciones puras en TypeScript sin APIs de Deno ni Node, organizados como una plantilla por archivo registrada en un `BankParser` por banco y un registro global `parseEmail()`. Un normalizador único (`htmlToText`) convierte el HTML del banco en texto con una línea por fila y celdas separadas por ` | `; producción y tests comparten ese normalizador. Un script de Bun decodifica los `.eml` anonimizados de `fixtures-raw/` con `postal-mime` y genera fixtures JSON con la forma exacta de `RawEmail`.

**Tech Stack:** Bun 1.3 (package manager y scripts), TypeScript strict, Vitest (tests de scripts), Deno 2 (`deno test` para parsers), `postal-mime` (solo en el script de fixtures), `jsr:@std/assert`.

**Spec:** `docs/ALCANCE.md` (secciones 3.4, 5, 6) y `CLAUDE.md` (secciones "Parsers de correos bancarios", "Principios de diseño", "Testing").

## Global Constraints

- Package manager: **Bun**. Nunca `npm`, `yarn` ni `npx`. Usar `bun add`, `bun run`, `bunx`.
- Código, variables, nombres de archivo y mensajes de commit en **inglés**; textos de usuario y documentación en español.
- Parsers **sin** `Deno.*`, `fetch`, `Date.now()`, ni imports de `node:`. La fecha sale del correo.
- Contrato de parsers exactamente como en `CLAUDE.md`: `Template.parse(email): ParsedTransaction[]`, `[]` = no pudo extraer; política **todo o nada** por correo.
- Monto: número positivo con 2 decimales; el signo lo da `type`. Cálculo interno en centavos enteros.
- Fechas: `YYYY-MM-DDTHH:mm:00-04:00` (`America/Santo_Domingo`, sin DST).
- Nunca inventar mapeos no vistos: solo `Aprobada+Compra`, `Reversada+Compra` y la plantilla de transferencia. `Aprobada+Retiro` **no** se codifica en este plan.
- No incluir claves con valor `undefined` en los objetos `ParsedTransaction` (los tests comparan estructuralmente).
- SOLID/DRY según `CLAUDE.md`: sin ramas por banco fuera del registro; `parseAmount`, `parseLocalDate`, `htmlToText` son la única fuente para su regla.
- Cada commit termina con la línea `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Antes de marcar una tarea como hecha: `bun run check` en verde (typecheck + Vitest + Deno).

---

## Mapa de archivos

| Archivo | Responsabilidad |
|---------|-----------------|
| `package.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`, `.editorconfig` | Fundación del repo |
| `supabase/functions/_shared/parsers/types.ts` | Tipos del contrato: `RawEmail`, `ParsedTransaction`, `Template`, `BankParser`, `ParseResult`, `CandidateBank` |
| `supabase/functions/_shared/parsers/normalize.ts` | `decodeEntities`, `htmlToText`, `splitCells`, `parseAmount`, `currencyFromCode`, `parseLocalDate`, `cleanMerchant` |
| `supabase/functions/_shared/parsers/normalize.test.ts` | Tests unitarios del normalizador |
| `scripts/lib/eml.ts` | `emlToRawEmail(bytes)`: `.eml` → `RawEmail` usando `postal-mime` + `htmlToText` |
| `scripts/build-fixtures.ts` | CLI: recorre `fixtures-raw/<bank>/*.eml` y escribe `parsers/<bank>/fixtures/<name>.json` |
| `tests/unit/scripts/eml.test.ts` | Test Vitest de `emlToRawEmail` con una fixture real |
| `supabase/functions/_shared/parsers/bhd/transactions-table.ts` | Plantilla `bhd/transactions-table` |
| `supabase/functions/_shared/parsers/bhd/transactions-table.test.ts` | Tests con 3 fixtures reales + casos sintéticos |
| `supabase/functions/_shared/parsers/bhd/transfer.ts` | Plantilla `bhd/transfer` |
| `supabase/functions/_shared/parsers/bhd/transfer.test.ts` | Test con fixture real + casos sintéticos |
| `supabase/functions/_shared/parsers/bhd/index.ts` | `BankParser` de BHD (`code`, `senderDomains`, `templates`) |
| `supabase/functions/_shared/parsers/candidates.ts` | Bancos sin parser con dominios probables |
| `supabase/functions/_shared/parsers/index.ts` | Registro: `banks`, `senderDomain`, `findBank`, `parseEmail` |
| `supabase/functions/_shared/parsers/index.test.ts` | Tests del registro + test de contrato sobre todos los bancos |

---

### Task 1: Inicializar el repositorio y las herramientas

**Files:**
- Create: `.gitignore`, `.editorconfig`, `package.json`, `tsconfig.json`, `vitest.config.ts`
- Existing (se commitean tal cual): `CLAUDE.md`, `docs/**`, `fixtures-raw/bhd/*.eml`

**Interfaces:**
- Produces: scripts `bun run typecheck`, `bun run test`, `bun run test:deno`, `bun run lint`, `bun run check`, `bun run fixtures:build` (este último apunta a un archivo que se crea en Task 4).

- [ ] **Step 1: Inicializar git y verificar identidad**

Run:
```bash
cd "C:/Users/arman/Documents/Programación/notificaciones-bancarias"
git init -b main
git config user.name && git config user.email
```
Expected: imprime nombre y correo. Si alguno está vacío, configurarlo con `git config user.name "..."` y `git config user.email "..."` antes de seguir.

- [ ] **Step 2: Crear `.gitignore`**

```gitignore
# deps
node_modules/

# env
.env
.env.*
!.env.example

# build / cache
dist/
.expo/
coverage/
*.log
.DS_Store
Thumbs.db

# supabase local
supabase/.temp/
supabase/.branches/

# deno
.deno/
```
Nota: `fixtures-raw/` **sí** se versiona; los `.eml` ya están anonimizados.

- [ ] **Step 3: Crear `.editorconfig`**

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
```

- [ ] **Step 4: Crear `package.json`**

```json
{
  "name": "gastos-app",
  "private": true,
  "type": "module",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run --passWithNoTests",
    "test:deno": "deno test --allow-read supabase/functions/",
    "lint": "deno lint supabase/functions/",
    "check": "bun run typecheck && bun run test && bun run test:deno",
    "fixtures:build": "bun scripts/build-fixtures.ts"
  }
}
```

- [ ] **Step 5: Instalar dependencias de desarrollo**

Run:
```bash
bun add -d typescript vitest @types/node postal-mime
```
Expected: `bun.lock` creado, `package.json` con `devDependencies` para los cuatro paquetes.

- [ ] **Step 6: Crear `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["scripts", "tests", "supabase/functions/_shared/parsers"],
  "exclude": ["node_modules", "**/*.test.ts"]
}
```
Los `*.test.ts` de `supabase/` usan `Deno.*` y los revisa `deno test`; por eso se excluyen de `tsc`. El código fuente de parsers sí pasa por `tsc`, lo que garantiza que no usa APIs de Deno.

- [ ] **Step 7: Crear `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
  },
});
```

- [ ] **Step 8: Verificar que las tres herramientas corren en vacío**

Run (por separado, no encadenados: Deno sin módulos de test puede salir con error y eso aquí es aceptable):
```bash
bun run typecheck
bun run test
bun run test:deno
```
Expected: `tsc` sin errores (no hay archivos aún); Vitest imprime `No test files found, exiting with code 0`; Deno imprime `ok | 0 passed | 0 failed` o `error: No test modules found`. Solo se exige que `typecheck` y `test` salgan con código 0. `bun run check` (que sí encadena) se usa desde la Task 3 en adelante, cuando ya existen tests de Deno.

- [ ] **Step 9: Commit**

```bash
git add .gitignore .editorconfig package.json bun.lock tsconfig.json vitest.config.ts CLAUDE.md docs fixtures-raw
git commit -m "chore: initialize repo with bun, vitest and deno tooling" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Tipos del contrato de parsers

**Files:**
- Create: `supabase/functions/_shared/parsers/types.ts`

**Interfaces:**
- Produces: `BankCode`, `TxType`, `Currency`, `RawEmail`, `ParsedTransaction`, `Template`, `BankParser`, `CandidateBank`, `ParseResult`. Todas las tareas siguientes importan de aquí.

- [ ] **Step 1: Escribir `types.ts`**

```ts
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
```

- [ ] **Step 2: Verificar que compila**

Run: `bun run typecheck`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/_shared/parsers/types.ts
git commit -m "feat(parsers): define parser contract types" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Normalizador — HTML a texto, montos, fechas

**Files:**
- Create: `supabase/functions/_shared/parsers/normalize.ts`
- Test: `supabase/functions/_shared/parsers/normalize.test.ts`

**Interfaces:**
- Consumes: `Currency` de `types.ts`.
- Produces:
  - `decodeEntities(s: string): string`
  - `htmlToText(html: string): string` — una línea por fila/bloque, celdas con ` | `, sin líneas vacías, sin pipe final.
  - `splitCells(line: string): string[]` — divide por `|` y recorta cada celda.
  - `parseAmount(raw: string): { amount: number; currency: Currency | null } | null`
  - `currencyFromCode(code: string): Currency | null`
  - `parseLocalDate(raw: string): string | null` — ISO con `-04:00`.
  - `cleanMerchant(raw: string): string | null`

- [ ] **Step 1: Escribir los tests que fallan**

`supabase/functions/_shared/parsers/normalize.test.ts`:
```ts
import { assertEquals } from 'jsr:@std/assert@1';
import {
  cleanMerchant,
  currencyFromCode,
  decodeEntities,
  htmlToText,
  parseAmount,
  parseLocalDate,
  splitCells,
} from './normalize.ts';

Deno.test('decodeEntities — named, numeric and hex entities', () => {
  assertEquals(decodeEntities('a&nbsp;b &amp; c &lt;d&gt; &quot;e&quot; &#39;f&#39;'), 'a\u00a0b & c <d> "e" \'f\'');
  assertEquals(decodeEntities('Ni&ntilde;o &#209; &#xf1;'), 'Niño Ñ ñ');
  assertEquals(decodeEntities('&unknown; stays'), '&unknown; stays');
});

Deno.test('htmlToText — table rows become pipe-separated lines', () => {
  const html = `
    <html><head><style>td{color:red}</style></head><body>
    <div class="titleA">BHD Notificaci&oacute;n</div>
    <table><thead><tr><td> Fecha </td><td>
      Moneda
    </td><td>Monto</td></tr></thead>
    <tbody><tr><td>16/09/2026 10:42 pm</td><td>RD</td><td>$275.72</td></tr></tbody></table>
    <p>Ahora, tus <b>Tarjetas</b> BHD.</p>
    </body></html>`;
  assertEquals(htmlToText(html), [
    'BHD Notificación',
    'Fecha | Moneda | Monto',
    '16/09/2026 10:42 pm | RD | $275.72',
    'Ahora, tus Tarjetas BHD.',
  ].join('\n'));
});

Deno.test('htmlToText — keeps empty cells in the middle of a row', () => {
  const html = '<table><tr><td>$434.22</td><td>  </td><td>Reversada</td></tr></table>';
  assertEquals(htmlToText(html), '$434.22 | | Reversada');
});

Deno.test('htmlToText — key/value row with empty value keeps the label only', () => {
  const html = '<table><tr><td>Descripci&oacute;n:</td><td></td></tr><tr><td>Monto:</td><td>RD$ 3,500.00</td></tr></table>';
  assertEquals(htmlToText(html), 'Descripción:\nMonto: | RD$ 3,500.00');
});

Deno.test('htmlToText — <br> and nbsp are handled', () => {
  assertEquals(htmlToText('<p>Estimado(a):&nbsp;JUAN PEREZ<br>Segunda l&iacute;nea</p>'), 'Estimado(a): JUAN PEREZ\nSegunda línea');
});

Deno.test('splitCells', () => {
  assertEquals(splitCells('a | b |  | d'), ['a', 'b', '', 'd']);
  assertEquals(splitCells('single'), ['single']);
});

Deno.test('parseAmount — plain dollar without currency', () => {
  assertEquals(parseAmount('$275.72'), { amount: 275.72, currency: null });
  assertEquals(parseAmount('$1,234.5'), { amount: 1234.5, currency: null });
  assertEquals(parseAmount('275'), { amount: 275, currency: null });
});

Deno.test('parseAmount — currency prefixes', () => {
  assertEquals(parseAmount('RD$ 3,500.00'), { amount: 3500, currency: 'DOP' });
  assertEquals(parseAmount('US$ 12.00'), { amount: 12, currency: 'USD' });
  assertEquals(parseAmount('DOP 10.10'), { amount: 10.1, currency: 'DOP' });
});

Deno.test('parseAmount — rejects garbage', () => {
  assertEquals(parseAmount(''), null);
  assertEquals(parseAmount('abc'), null);
  assertEquals(parseAmount('12.345'), null);
});

Deno.test('currencyFromCode', () => {
  assertEquals(currencyFromCode('RD'), 'DOP');
  assertEquals(currencyFromCode('rd$'), 'DOP');
  assertEquals(currencyFromCode('DOP'), 'DOP');
  assertEquals(currencyFromCode('US'), 'USD');
  assertEquals(currencyFromCode('USD'), 'USD');
  assertEquals(currencyFromCode('EUR'), null);
});

Deno.test('parseLocalDate — BHD table format (lowercase am/pm)', () => {
  assertEquals(parseLocalDate('16/09/2026 10:42 pm'), '2026-09-16T22:42:00-04:00');
  assertEquals(parseLocalDate('16/09/2026 09:31 pm'), '2026-09-16T21:31:00-04:00');
  assertEquals(parseLocalDate('01/01/2026 12:05 am'), '2026-01-01T00:05:00-04:00');
  assertEquals(parseLocalDate('01/01/2026 12:05 pm'), '2026-01-01T12:05:00-04:00');
});

Deno.test('parseLocalDate — BHD transfer format (dash, uppercase AM/PM, no leading zero)', () => {
  assertEquals(parseLocalDate('16/09/2026 - 9:53 AM'), '2026-09-16T09:53:00-04:00');
});

Deno.test('parseLocalDate — rejects invalid', () => {
  assertEquals(parseLocalDate('32/09/2026 10:42 pm'), null);
  assertEquals(parseLocalDate('16/13/2026 10:42 pm'), null);
  assertEquals(parseLocalDate('16/09/2026 13:42 pm'), null);
  assertEquals(parseLocalDate('sin fecha'), null);
});

Deno.test('cleanMerchant', () => {
  assertEquals(cleanMerchant('  UBER*RIDES  '), 'UBER*RIDES');
  assertEquals(cleanMerchant('GOMEZ   PEÑA,  MARIA'), 'GOMEZ PEÑA, MARIA');
  assertEquals(cleanMerchant('   '), null);
  assertEquals(cleanMerchant(''), null);
});
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `deno test --allow-read supabase/functions/_shared/parsers/normalize.test.ts`
Expected: error de módulo no encontrado `./normalize.ts`.

- [ ] **Step 3: Implementar `normalize.ts`**

```ts
import type { Currency } from './types.ts';

const NAMED_ENTITIES: Record<string, string> = {
  nbsp: '\u00a0', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', ntilde: 'ñ', uuml: 'ü',
  Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', Ntilde: 'Ñ', Uuml: 'Ü',
  iexcl: '¡', iquest: '¿',
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === '#') {
      const isHex = code[1] === 'x' || code[1] === 'X';
      const n = isHex ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : match;
    }
    return NAMED_ENTITIES[code] ?? match;
  });
}

/** Separador temporal de filas; \s no lo matchea, así que sobrevive al colapso de espacios. */
const ROW_BREAK = '\u0000';
const BLOCK_END = /<br\s*\/?>|<\/(?:tr|p|div|li|h[1-6]|table|thead|tbody|ul|ol)\s*>/gi;

/**
 * HTML del banco → texto estable para los parsers.
 * - Una línea por fila de tabla o bloque (tr, p, div, br, ...).
 * - Celdas (td/th) separadas por " | ". Celdas vacías intermedias se conservan;
 *   las celdas vacías AL FINAL de la fila se descartan (todos los pipes finales se quitan).
 * - Sin líneas vacías, sin espacios dobles.
 */
export function htmlToText(html: string): string {
  const withMarkers = html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<\/t[dh]\s*>/gi, ' | ')
    .replace(BLOCK_END, ROW_BREAK)
    .replace(/<[^>]+>/g, ' ');

  const decoded = decodeEntities(withMarkers).replace(/[\s\u00a0]+/g, ' ');

  return decoded
    .split(ROW_BREAK)
    .map((line) => line.trim().replace(/(\s*\|)+\s*$/, '').trim())
    .filter((line) => line.length > 0)
    .join('\n');
}

export function splitCells(line: string): string[] {
  return line.split('|').map((cell) => cell.trim());
}

export function currencyFromCode(code: string): Currency | null {
  const c = code.trim().toUpperCase().replace(/\$$/, '');
  if (c === 'RD' || c === 'DOP') return 'DOP';
  if (c === 'US' || c === 'USD') return 'USD';
  return null;
}

/**
 * "$275.72" → 275.72 (sin moneda); "RD$ 3,500.00" → 3500 DOP; "US$ 12.00" → 12 USD.
 * Máximo 2 decimales. Cálculo en centavos enteros.
 */
export function parseAmount(raw: string): { amount: number; currency: Currency | null } | null {
  const compact = raw.replace(/\s+/g, '');
  const m = compact.match(/^(RD\$|US\$|DOP|USD|\$)?(\d{1,3}(?:,\d{3})*|\d+)(?:\.(\d{1,2}))?$/i);
  if (!m) return null;
  const [, prefix, intPart, fracPart] = m;
  const cents = Number(intPart.replace(/,/g, '')) * 100 + Number((fracPart ?? '').padEnd(2, '0'));
  const currency = prefix && prefix !== '$' ? currencyFromCode(prefix) : null;
  return { amount: cents / 100, currency };
}

/**
 * Fecha local dominicana sin zona → ISO con -04:00.
 * Acepta "16/09/2026 10:42 pm" y "16/09/2026 - 9:53 AM".
 */
export function parseLocalDate(raw: string): string | null {
  const m = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s*-?\s*(\d{1,2}):(\d{2})\s*([ap])\.?\s*m\.?$/i);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  const hour12 = Number(m[4]);
  const minute = Number(m[5]);
  const isPm = m[6].toLowerCase() === 'p';
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour12 < 1 || hour12 > 12 || minute > 59) return null;
  const hour24 = (hour12 % 12) + (isPm ? 12 : 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour24)}:${pad(minute)}:00-04:00`;
}

export function cleanMerchant(raw: string): string | null {
  const cleaned = raw.replace(/\s+/g, ' ').trim();
  return cleaned.length > 0 ? cleaned : null;
}
```

- [ ] **Step 4: Correr los tests**

Run: `deno test --allow-read supabase/functions/_shared/parsers/normalize.test.ts`
Expected: `ok | 14 passed | 0 failed`.

- [ ] **Step 5: Typecheck y lint**

Run: `bun run typecheck && bun run lint`
Expected: sin errores. Si `deno lint` marca `no-control-regex` por `\u0000`, no aplica (es un string, no regex); si marca otra cosa, corregirla.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/_shared/parsers/normalize.ts supabase/functions/_shared/parsers/normalize.test.ts
git commit -m "feat(parsers): add html-to-text, amount and local date normalizers" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Script de fixtures — `.eml` → `RawEmail` JSON

**Files:**
- Create: `scripts/lib/eml.ts`, `scripts/build-fixtures.ts`
- Test: `tests/unit/scripts/eml.test.ts`
- Generates: `supabase/functions/_shared/parsers/bhd/fixtures/{card-purchase-approved,card-purchase-reversed,card-purchase-approved-near-reversal,transfer-out}.json`

**Interfaces:**
- Consumes: `htmlToText` de `normalize.ts`, `RawEmail` de `types.ts`, `PostalMime.parse` de `postal-mime`.
- Produces: `emlToRawEmail(bytes: Uint8Array): Promise<RawEmail>`; los 4 JSON que usan Tasks 5 y 6.

- [ ] **Step 1: Escribir el test que falla**

`tests/unit/scripts/eml.test.ts`:
```ts
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { emlToRawEmail } from '../../../scripts/lib/eml.ts';

describe('emlToRawEmail', () => {
  it('decodes a real BHD .eml into a normalized RawEmail', async () => {
    const bytes = await readFile('fixtures-raw/bhd/card-purchase-approved.eml');
    const email = await emlToRawEmail(new Uint8Array(bytes));

    expect(email.messageId).toBe('<6a7c5000-b764-0f60-1899-3acb831f0358@bhd.com.do>');
    expect(email.from).toBe('Alertas@bhd.com.do');
    expect(email.subject).toBe('BHD Notificación de Transacciones');
    expect(email.receivedAt).toBe('2026-09-17T02:43:15.000Z');
    expect(email.text).toContain('Visa Débito Intl # 1234');
    expect(email.text).toContain('Fecha | Moneda | Monto | Comercio | Estado | Tipo');
    expect(email.text).toContain('16/09/2026 10:42 pm | RD | $275.72 | UBER*RIDES | Aprobada | Compra');
  });

  it('keeps the empty merchant cell of a reversed purchase', async () => {
    const bytes = await readFile('fixtures-raw/bhd/card-purchase-reversed.eml');
    const email = await emlToRawEmail(new Uint8Array(bytes));
    expect(email.text).toContain('16/09/2026 09:31 pm | RD | $434.22 | | Reversada | Compra');
  });
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `bun run test`
Expected: FAIL, no encuentra `scripts/lib/eml.ts`.

- [ ] **Step 3: Implementar `scripts/lib/eml.ts`**

```ts
import PostalMime from 'postal-mime';
import { htmlToText } from '../../supabase/functions/_shared/parsers/normalize.ts';
import type { RawEmail } from '../../supabase/functions/_shared/parsers/types.ts';

/**
 * Convierte un .eml crudo en el RawEmail que reciben los parsers.
 * Solo se usa en desarrollo (fixtures). En producción Gmail/Graph entregan el HTML ya decodificado.
 */
export async function emlToRawEmail(bytes: Uint8Array): Promise<RawEmail> {
  const parsed = await PostalMime.parse(bytes);
  const html = parsed.html ?? '';
  if (!html) throw new Error('El .eml no tiene parte text/html');
  return {
    messageId: parsed.messageId ?? '',
    from: parsed.from?.address ?? '',
    subject: parsed.subject ?? '',
    text: htmlToText(html),
    receivedAt: parsed.date ?? '',
  };
}
```

- [ ] **Step 4: Correr el test**

Run: `bun run test`
Expected: 2 tests PASS. Dos valores dependen de cómo `postal-mime` devuelve los headers y se verifican aquí, no se adivinan: si `receivedAt` difiere en formato, ajustar el test al ISO exacto que devuelve (debe ser `2026-09-17T02:43:15.000Z` porque el header es `Thu, 17 Sep 2026 02:43:15 +0000`); si `messageId` viene sin los `<>` exteriores, ajustar el test a `6a7c5000-b764-0f60-1899-3acb831f0358@bhd.com.do`. Cualquiera de las dos formas es válida: el Plan 3 solo exige que el id sea estable por correo.

- [ ] **Step 5: Implementar el CLI `scripts/build-fixtures.ts`**

```ts
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { emlToRawEmail } from './lib/eml.ts';

const RAW_DIR = 'fixtures-raw';
const PARSERS_DIR = join('supabase', 'functions', '_shared', 'parsers');

async function main(): Promise<void> {
  const banks = (await readdir(RAW_DIR, { withFileTypes: true })).filter((d) => d.isDirectory());
  let written = 0;
  for (const bank of banks) {
    const rawBankDir = join(RAW_DIR, bank.name);
    const outDir = join(PARSERS_DIR, bank.name, 'fixtures');
    await mkdir(outDir, { recursive: true });
    const emls = (await readdir(rawBankDir)).filter((f) => f.toLowerCase().endsWith('.eml'));
    for (const file of emls) {
      const bytes = await readFile(join(rawBankDir, file));
      const email = await emlToRawEmail(new Uint8Array(bytes));
      const outPath = join(outDir, `${basename(file, '.eml')}.json`);
      await writeFile(outPath, JSON.stringify(email, null, 2) + '\n', 'utf8');
      console.log(`✓ ${outPath}`);
      written++;
    }
  }
  console.log(`${written} fixture(s) generadas`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 6: Generar las fixtures y revisarlas**

Run:
```bash
bun run fixtures:build
ls supabase/functions/_shared/parsers/bhd/fixtures/
cat supabase/functions/_shared/parsers/bhd/fixtures/transfer-out.json
```
Expected: 4 archivos JSON. En `transfer-out.json`, el campo `text` debe contener líneas como `Monto: | RD$ 3,500.00`, `Beneficiario: | GOMEZ PEÑA, MARIA`, `Número de confirmación: | M12-0000-1111-2222-3`, `Fecha y hora de la transacción: | 16/09/2026 - 9:53 AM`, `Producto destino: | DO82BCBH000000000XXXXXXX0077`. Si alguna etiqueta y su valor quedaron en líneas separadas (porque el HTML anida tablas), anotar la forma exacta: la Task 6 usa `kv()` que tolera ambos casos.

- [ ] **Step 7: Verificar que no quedó dato personal en las fixtures**

Run:
```bash
grep -ril "NOMBRE_REAL|APELLIDO_REAL|ULTIMOS4_REALES" supabase/functions/_shared/parsers/bhd/fixtures/ || echo "limpio"
```
Expected: `limpio`.

- [ ] **Step 8: Typecheck y commit**

Run: `bun run typecheck && bun run test`
Expected: sin errores; 2 tests PASS.

```bash
git add scripts tests supabase/functions/_shared/parsers/bhd/fixtures
git commit -m "feat(fixtures): add eml-to-RawEmail converter and fixture build script" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Plantilla BHD `transactions-table` (compra aprobada y reversa)

**Files:**
- Create: `supabase/functions/_shared/parsers/bhd/transactions-table.ts`
- Test: `supabase/functions/_shared/parsers/bhd/transactions-table.test.ts`
- Uses: fixtures `card-purchase-approved.json`, `card-purchase-reversed.json`, `card-purchase-approved-near-reversal.json`

**Interfaces:**
- Consumes: `Template`, `RawEmail`, `ParsedTransaction`, `TxType` de `../types.ts`; `splitCells`, `parseAmount`, `currencyFromCode`, `parseLocalDate`, `cleanMerchant` de `../normalize.ts`.
- Produces: `export const transactionsTable: Template` con `id = 'bhd/transactions-table'`.

- [ ] **Step 1: Escribir los tests que fallan**

`supabase/functions/_shared/parsers/bhd/transactions-table.test.ts`:
```ts
import { assertEquals } from 'jsr:@std/assert@1';
import type { RawEmail } from '../types.ts';
import { transactionsTable } from './transactions-table.ts';

function fixture(name: string): RawEmail {
  return JSON.parse(Deno.readTextFileSync(new URL(`./fixtures/${name}.json`, import.meta.url)));
}

function synthetic(rows: string[]): RawEmail {
  return {
    messageId: '<synthetic@bhd.com.do>',
    from: 'Alertas@bhd.com.do',
    subject: 'BHD Notificación de Transacciones',
    receivedAt: '2026-09-17T02:43:15.000Z',
    text: [
      'BHD Notificación de Transacciones',
      'Visa Débito Intl # 1234',
      'Detalle de Criterios',
      'Te notificamos la transacción realizada con tu Tarjeta Visa Débito Intl # 1234',
      'Detalle de Transacciones',
      'Fecha | Moneda | Monto | Comercio | Estado | Tipo',
      ...rows,
      'Ahora, tus Tarjetas BHD cuentan con un nuevo sistema de seguridad.',
    ].join('\n'),
  };
}

Deno.test('bhd/transactions-table — matches only its subject', () => {
  assertEquals(transactionsTable.matches(fixture('card-purchase-approved')), true);
  assertEquals(transactionsTable.matches({ ...fixture('card-purchase-approved'), subject: 'Estado de cuenta' }), false);
});

Deno.test('bhd/transactions-table — approved purchase (real fixture)', () => {
  assertEquals(transactionsTable.parse(fixture('card-purchase-approved')), [{
    bankCode: 'bhd',
    type: 'card_purchase',
    amount: 275.72,
    currency: 'DOP',
    merchant: 'UBER*RIDES',
    occurredAt: '2026-09-16T22:42:00-04:00',
    cardLast4: '1234',
    rowIndex: 0,
    templateId: 'bhd/transactions-table',
  }]);
});

Deno.test('bhd/transactions-table — reversed purchase has null merchant (real fixture)', () => {
  assertEquals(transactionsTable.parse(fixture('card-purchase-reversed')), [{
    bankCode: 'bhd',
    type: 'card_reversal',
    amount: 434.22,
    currency: 'DOP',
    merchant: null,
    occurredAt: '2026-09-16T21:31:00-04:00',
    cardLast4: '1234',
    rowIndex: 0,
    templateId: 'bhd/transactions-table',
  }]);
});

Deno.test('regression — approved purchase in the same minute as a reversal keeps its own amount', () => {
  // Real case: Aprobada $438.42 y Reversada $434.22 a las 9:31 pm. No son la misma transacción.
  const approved = transactionsTable.parse(fixture('card-purchase-approved-near-reversal'));
  const reversed = transactionsTable.parse(fixture('card-purchase-reversed'));
  assertEquals(approved[0].amount, 438.42);
  assertEquals(approved[0].type, 'card_purchase');
  assertEquals(approved[0].merchant, 'UBER*RIDES');
  assertEquals(reversed[0].amount, 434.22);
  assertEquals(approved[0].occurredAt, reversed[0].occurredAt);
});

Deno.test('bhd/transactions-table — multiple rows produce one transaction each with rowIndex', () => {
  const email = synthetic([
    '16/09/2026 10:42 pm | RD | $275.72 | UBER*RIDES | Aprobada | Compra',
    '16/09/2026 10:50 pm | US | $12.00 | NETFLIX.COM | Aprobada | Compra',
  ]);
  const result = transactionsTable.parse(email);
  assertEquals(result.length, 2);
  assertEquals(result[0].rowIndex, 0);
  assertEquals(result[1].rowIndex, 1);
  assertEquals(result[1].currency, 'USD');
  assertEquals(result[1].amount, 12);
  assertEquals(result[1].merchant, 'NETFLIX.COM');
  assertEquals(result[1].occurredAt, '2026-09-16T22:50:00-04:00');
});

Deno.test('bhd/transactions-table — unknown status makes the whole email unparsed (all or nothing)', () => {
  const email = synthetic([
    '16/09/2026 10:42 pm | RD | $275.72 | UBER*RIDES | Aprobada | Compra',
    '16/09/2026 10:50 pm | RD | $50.00 | FARMACIA | Declinada | Compra',
  ]);
  assertEquals(transactionsTable.parse(email), []);
});

Deno.test('bhd/transactions-table — "Retiro" is not mapped yet (no real fixture)', () => {
  const email = synthetic(['16/09/2026 10:42 pm | RD | $2,000.00 | CAJERO BHD | Aprobada | Retiro']);
  assertEquals(transactionsTable.parse(email), []);
});

Deno.test('bhd/transactions-table — invalid amount or date → []', () => {
  assertEquals(transactionsTable.parse(synthetic(['16/09/2026 10:42 pm | RD | N/A | X | Aprobada | Compra'])), []);
  assertEquals(transactionsTable.parse(synthetic(['ayer | RD | $1.00 | X | Aprobada | Compra'])), []);
  assertEquals(transactionsTable.parse(synthetic(['16/09/2026 10:42 pm | EUR | $1.00 | X | Aprobada | Compra'])), []);
});

Deno.test('bhd/transactions-table — no header row → []', () => {
  assertEquals(transactionsTable.parse({ ...synthetic([]), text: 'Correo sin tabla' }), []);
});

Deno.test('bhd/transactions-table — missing card header still parses, without cardLast4', () => {
  const email = synthetic(['16/09/2026 10:42 pm | RD | $275.72 | UBER*RIDES | Aprobada | Compra']);
  email.text = email.text.replace(/# 1234/g, '');
  const [tx] = transactionsTable.parse(email);
  assertEquals('cardLast4' in tx, false);
});
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `deno test --allow-read supabase/functions/_shared/parsers/bhd/transactions-table.test.ts`
Expected: módulo `./transactions-table.ts` no encontrado.

- [ ] **Step 3: Implementar la plantilla**

`supabase/functions/_shared/parsers/bhd/transactions-table.ts`:
```ts
import type { ParsedTransaction, RawEmail, Template, TxType } from '../types.ts';
import { cleanMerchant, currencyFromCode, parseAmount, parseLocalDate, splitCells } from '../normalize.ts';

const TEMPLATE_ID = 'bhd/transactions-table';
const SUBJECT = /^BHD Notificaci[oó]n de Transacciones$/i;
const HEADER_ROW = /^Fecha \| Moneda \| Monto \| Comercio \| Estado \| Tipo$/i;
const CARD_LAST4 = /#\s*(\d{4})\b/;
const COLUMNS = 6;

/** Solo combinaciones vistas en correos reales. Cualquier otra → null → correo completo a unparsed_emails. */
function mapType(status: string, kind: string): TxType | null {
  const s = status.toLowerCase();
  const k = kind.toLowerCase();
  if (k === 'compra' && s === 'aprobada') return 'card_purchase';
  if (k === 'compra' && s === 'reversada') return 'card_reversal';
  return null;
}

function parseRow(cells: string[], rowIndex: number, cardLast4: string | undefined): ParsedTransaction | null {
  const [dateRaw, currencyRaw, amountRaw, merchantRaw, statusRaw, kindRaw] = cells;
  const type = mapType(statusRaw, kindRaw);
  const occurredAt = parseLocalDate(dateRaw);
  const currency = currencyFromCode(currencyRaw);
  const money = parseAmount(amountRaw);
  if (!type || !occurredAt || !currency || !money) return null;

  return {
    bankCode: 'bhd',
    type,
    amount: money.amount,
    currency,
    merchant: cleanMerchant(merchantRaw),
    occurredAt,
    ...(cardLast4 ? { cardLast4 } : {}),
    rowIndex,
    templateId: TEMPLATE_ID,
  };
}

export const transactionsTable: Template = {
  id: TEMPLATE_ID,

  matches(email: RawEmail): boolean {
    return SUBJECT.test(email.subject.trim());
  },

  parse(email: RawEmail): ParsedTransaction[] {
    const lines = email.text.split('\n');
    const headerIndex = lines.findIndex((line) => HEADER_ROW.test(line));
    if (headerIndex === -1) return [];

    const cardLast4 = lines.slice(0, headerIndex).join(' ').match(CARD_LAST4)?.[1];

    const transactions: ParsedTransaction[] = [];
    for (const line of lines.slice(headerIndex + 1)) {
      const cells = splitCells(line);
      if (cells.length !== COLUMNS) break; // fin de la tabla
      const tx = parseRow(cells, transactions.length, cardLast4);
      if (!tx) return []; // todo o nada
      transactions.push(tx);
    }
    return transactions;
  },
};
```

- [ ] **Step 4: Correr los tests**

Run: `deno test --allow-read supabase/functions/_shared/parsers/bhd/transactions-table.test.ts`
Expected: `ok | 10 passed | 0 failed`. Si el test de la fixture real falla por el texto exacto (por ejemplo, la fila real no tiene 6 celdas por un `<table>` anidado), abrir el JSON, mirar la línea de la fila y corregir **el normalizador o el parser**, nunca la fixture.

- [ ] **Step 5: Check completo y commit**

Run: `bun run check && bun run lint`
Expected: todo en verde.

```bash
git add supabase/functions/_shared/parsers/bhd/transactions-table.ts supabase/functions/_shared/parsers/bhd/transactions-table.test.ts
git commit -m "feat(parsers): add BHD transactions-table template (purchase, reversal)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Plantilla BHD `transfer` (transferencia enviada)

**Files:**
- Create: `supabase/functions/_shared/parsers/bhd/transfer.ts`
- Test: `supabase/functions/_shared/parsers/bhd/transfer.test.ts`
- Uses: fixture `transfer-out.json`

**Interfaces:**
- Consumes: `Template`, `RawEmail`, `ParsedTransaction` de `../types.ts`; `parseAmount`, `parseLocalDate`, `cleanMerchant` de `../normalize.ts`.
- Produces: `export const transfer: Template` con `id = 'bhd/transfer'`.

- [ ] **Step 1: Escribir los tests que fallan**

`supabase/functions/_shared/parsers/bhd/transfer.test.ts`:
```ts
import { assertEquals } from 'jsr:@std/assert@1';
import type { RawEmail } from '../types.ts';
import { transfer } from './transfer.ts';

function fixture(name: string): RawEmail {
  return JSON.parse(Deno.readTextFileSync(new URL(`./fixtures/${name}.json`, import.meta.url)));
}

function synthetic(overrides: Partial<Record<'monto' | 'beneficiario' | 'confirmacion' | 'fecha' | 'destino', string>> = {}): RawEmail {
  const v = {
    monto: 'RD$ 3,500.00',
    beneficiario: 'GOMEZ PEÑA, MARIA',
    confirmacion: 'M12-0000-1111-2222-3',
    fecha: '16/09/2026 - 9:53 AM',
    destino: 'DO82BCBH000000000XXXXXXX0077',
    ...overrides,
  };
  return {
    messageId: '<synthetic-transfer@bhd.com.do>',
    from: 'Alertas@bhd.com.do',
    subject: 'Transacciones entre productos BHD y a otros Bancos',
    receivedAt: '2026-09-16T13:53:21.000Z',
    text: [
      'Estimado(a): JUAN PEREZ',
      'A continuación la información relacionada a tu transacción:',
      'Producto origen: | DO09BCBH000000000XXXXXXX0099',
      `Producto destino: | ${v.destino}`,
      'Descripción:',
      `Monto: | ${v.monto}`,
      `Beneficiario: | ${v.beneficiario}`,
      `Número de confirmación: | ${v.confirmacion}`,
      `Fecha y hora de la transacción: | ${v.fecha}`,
      'Tipo de transacción: | Transacciones entre productos BHD y a otros Bancos',
      'Nota: Este correo electrónico es generado de manera automática.',
    ].join('\n'),
  };
}

const EXPECTED = {
  bankCode: 'bhd',
  type: 'transfer_out',
  amount: 3500,
  currency: 'DOP',
  merchant: 'GOMEZ PEÑA, MARIA',
  occurredAt: '2026-09-16T09:53:00-04:00',
  reference: 'M12-0000-1111-2222-3',
  counterpartyLast4: '0077',
  rowIndex: 0,
  templateId: 'bhd/transfer',
};

Deno.test('bhd/transfer — matches only its subject', () => {
  assertEquals(transfer.matches(fixture('transfer-out')), true);
  assertEquals(transfer.matches({ ...fixture('transfer-out'), subject: 'BHD Notificación de Transacciones' }), false);
});

Deno.test('bhd/transfer — real fixture', () => {
  assertEquals(transfer.parse(fixture('transfer-out')), [EXPECTED]);
});

Deno.test('bhd/transfer — synthetic mirrors the real fixture', () => {
  assertEquals(transfer.parse(synthetic()), [EXPECTED]);
});

Deno.test('bhd/transfer — USD amount', () => {
  const [tx] = transfer.parse(synthetic({ monto: 'US$ 120.50' }));
  assertEquals(tx.amount, 120.5);
  assertEquals(tx.currency, 'USD');
});

Deno.test('bhd/transfer — amount without currency prefix → [] (never guess currency)', () => {
  assertEquals(transfer.parse(synthetic({ monto: '$3,500.00' })), []);
});

Deno.test('bhd/transfer — missing amount or date → []', () => {
  assertEquals(transfer.parse({ ...synthetic(), text: synthetic().text.replace(/^Monto:.*$/m, 'Monto:') }), []);
  assertEquals(transfer.parse(synthetic({ fecha: 'ayer' })), []);
});

Deno.test('bhd/transfer — missing beneficiary → merchant null; missing confirmation → no reference key', () => {
  const noBeneficiary = { ...synthetic(), text: synthetic().text.replace(/^Beneficiario:.*$/m, 'Beneficiario:') };
  assertEquals(transfer.parse(noBeneficiary)[0].merchant, null);

  const noRef = { ...synthetic(), text: synthetic().text.replace(/^Número de confirmación:.*$/m, 'Número de confirmación:') };
  assertEquals('reference' in transfer.parse(noRef)[0], false);
});

Deno.test('bhd/transfer — destination without trailing digits → no counterpartyLast4 key', () => {
  const [tx] = transfer.parse(synthetic({ destino: 'CUENTA EXTERNA' }));
  assertEquals('counterpartyLast4' in tx, false);
});
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `deno test --allow-read supabase/functions/_shared/parsers/bhd/transfer.test.ts`
Expected: módulo `./transfer.ts` no encontrado.

- [ ] **Step 3: Implementar la plantilla**

`supabase/functions/_shared/parsers/bhd/transfer.ts`:
```ts
import type { ParsedTransaction, RawEmail, Template } from '../types.ts';
import { cleanMerchant, parseAmount, parseLocalDate } from '../normalize.ts';

const TEMPLATE_ID = 'bhd/transfer';
const SUBJECT = /^Transacciones entre productos BHD y a otros Bancos$/i;

const LABELS = {
  amount: /^Monto:/i,
  beneficiary: /^Beneficiario:/i,
  reference: /^N[uú]mero de confirmaci[oó]n:/i,
  date: /^Fecha y hora de la transacci[oó]n:/i,
  destination: /^Producto destino:/i,
};

/**
 * Valor de una fila clave-valor. Tolera dos formas que produce htmlToText:
 *   "Monto: | RD$ 3,500.00"   → "RD$ 3,500.00"
 *   "Monto:"  (valor vacío)   → ""
 *   "Monto:" seguido del valor en la línea siguiente (tabla anidada) → esa línea
 */
function kv(lines: string[], label: RegExp): string | null {
  const index = lines.findIndex((line) => label.test(line));
  if (index === -1) return null;
  const line = lines[index];
  const pipe = line.indexOf('|');
  if (pipe !== -1) return line.slice(pipe + 1).trim();
  const inline = line.replace(label, '').trim();
  if (inline.length > 0) return inline;
  const next = lines[index + 1] ?? '';
  const nextIsLabel = Object.values(LABELS).some((re) => re.test(next)) || /^[^|]+:$/.test(next);
  return nextIsLabel ? '' : next.trim();
}

export const transfer: Template = {
  id: TEMPLATE_ID,

  matches(email: RawEmail): boolean {
    return SUBJECT.test(email.subject.trim());
  },

  parse(email: RawEmail): ParsedTransaction[] {
    const lines = email.text.split('\n');

    const money = parseAmount(kv(lines, LABELS.amount) ?? '');
    const occurredAt = parseLocalDate(kv(lines, LABELS.date) ?? '');
    if (!money || !money.currency || !occurredAt) return [];

    const merchant = cleanMerchant(kv(lines, LABELS.beneficiary) ?? '');
    const reference = (kv(lines, LABELS.reference) ?? '').trim();
    const counterpartyLast4 = (kv(lines, LABELS.destination) ?? '').match(/(\d{4})\s*$/)?.[1];

    return [{
      bankCode: 'bhd',
      type: 'transfer_out',
      amount: money.amount,
      currency: money.currency,
      merchant,
      occurredAt,
      ...(reference ? { reference } : {}),
      ...(counterpartyLast4 ? { counterpartyLast4 } : {}),
      rowIndex: 0,
      templateId: TEMPLATE_ID,
    }];
  },
};
```

- [ ] **Step 4: Correr los tests**

Run: `deno test --allow-read supabase/functions/_shared/parsers/bhd/transfer.test.ts`
Expected: `ok | 8 passed | 0 failed`. Si el test de la fixture real falla, comparar el `text` del JSON con el `synthetic()`: la diferencia dice qué forma produce `htmlToText` para el HTML real, y `kv()` debe cubrirla. Corregir parser o normalizador, no la fixture.

- [ ] **Step 5: Check completo y commit**

Run: `bun run check && bun run lint`
Expected: todo en verde.

```bash
git add supabase/functions/_shared/parsers/bhd/transfer.ts supabase/functions/_shared/parsers/bhd/transfer.test.ts
git commit -m "feat(parsers): add BHD transfer template" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Registro de bancos, candidatos y `parseEmail`

**Files:**
- Create: `supabase/functions/_shared/parsers/bhd/index.ts`, `supabase/functions/_shared/parsers/candidates.ts`, `supabase/functions/_shared/parsers/index.ts`
- Test: `supabase/functions/_shared/parsers/index.test.ts`

**Interfaces:**
- Consumes: `transactionsTable`, `transfer` (Tasks 5 y 6); tipos de `types.ts`.
- Produces (lo que `sync-mail` importará en el Plan 3):
  - `banks: BankParser[]`
  - `candidateBanks: CandidateBank[]`
  - `senderDomain(from: string): string | null`
  - `findBank(from: string): { kind: 'bank'; bank: BankParser } | { kind: 'candidate'; candidate: CandidateBank } | null`
  - `parseEmail(email: RawEmail): ParseResult`

- [ ] **Step 1: Escribir los tests que fallan**

`supabase/functions/_shared/parsers/index.test.ts`:
```ts
import { assertEquals, assertNotEquals } from 'jsr:@std/assert@1';
import type { RawEmail } from './types.ts';
import { banks, candidateBanks, findBank, parseEmail, senderDomain } from './index.ts';

function fixture(bank: string, name: string): RawEmail {
  return JSON.parse(Deno.readTextFileSync(new URL(`./${bank}/fixtures/${name}.json`, import.meta.url)));
}

const EMPTY: RawEmail = { messageId: '', from: '', subject: '', text: '', receivedAt: '' };

Deno.test('senderDomain — extracts the domain from bare or display-name addresses', () => {
  assertEquals(senderDomain('Alertas@bhd.com.do'), 'bhd.com.do');
  assertEquals(senderDomain('BHD <Alertas@bhd.com.do>'), 'bhd.com.do');
  assertEquals(senderDomain('"Alertas BHD" <alertas@mail.bhd.com.do>'), 'mail.bhd.com.do');
  assertEquals(senderDomain('sin arroba'), null);
});

Deno.test('findBank — exact domain and subdomain match a bank', () => {
  const exact = findBank('Alertas@bhd.com.do');
  const sub = findBank('x@mail.bhd.com.do');
  assertEquals(exact?.kind, 'bank');
  assertEquals(sub?.kind, 'bank');
  assertEquals(findBank('promo@notbhd.com.do'), null);
});

Deno.test('findBank — candidate banks are recognized but have no parser', () => {
  const result = findBank('alertas@banreservas.com');
  assertEquals(result?.kind, 'candidate');
  if (result?.kind === 'candidate') assertEquals(result.candidate.code, 'banreservas');
});

Deno.test('parseEmail — BHD purchase → parsed', () => {
  const result = parseEmail(fixture('bhd', 'card-purchase-approved'));
  assertEquals(result.kind, 'parsed');
  if (result.kind === 'parsed') {
    assertEquals(result.bankCode, 'bhd');
    assertEquals(result.transactions.length, 1);
    assertEquals(result.transactions[0].templateId, 'bhd/transactions-table');
  }
});

Deno.test('parseEmail — BHD transfer → parsed with the transfer template', () => {
  const result = parseEmail(fixture('bhd', 'transfer-out'));
  assertEquals(result.kind, 'parsed');
  if (result.kind === 'parsed') assertEquals(result.transactions[0].templateId, 'bhd/transfer');
});

Deno.test('parseEmail — known bank, unknown subject → unparsed', () => {
  assertEquals(parseEmail({ ...EMPTY, from: 'Alertas@bhd.com.do', subject: 'Estado de cuenta' }), { kind: 'unparsed', bankCode: 'bhd' });
});

Deno.test('parseEmail — known bank, matching subject but no rows → unparsed', () => {
  assertEquals(parseEmail({ ...EMPTY, from: 'Alertas@bhd.com.do', subject: 'BHD Notificación de Transacciones', text: 'nada' }), { kind: 'unparsed', bankCode: 'bhd' });
});

Deno.test('parseEmail — candidate bank → unparsed with its code', () => {
  assertEquals(parseEmail({ ...EMPTY, from: 'no-reply@apap.com.do', subject: 'Alerta' }), { kind: 'unparsed', bankCode: 'apap' });
});

Deno.test('parseEmail — unknown sender → unknown_sender', () => {
  assertEquals(parseEmail({ ...EMPTY, from: 'promo@amazon.com', subject: 'Oferta' }), { kind: 'unknown_sender' });
});

Deno.test('contract — every registered bank and template honors the interface', () => {
  const codes = banks.map((b) => b.code);
  assertEquals(new Set(codes).size, codes.length, 'bank codes must be unique');

  const allDomains = [...banks, ...candidateBanks].flatMap((b) => b.senderDomains);
  assertEquals(new Set(allDomains).size, allDomains.length, 'sender domains must not repeat across banks');

  for (const bank of banks) {
    assertNotEquals(bank.senderDomains.length, 0, `${bank.code} needs senderDomains`);
    for (const domain of bank.senderDomains) {
      assertEquals(domain, domain.toLowerCase(), 'domains in lowercase');
      assertEquals(domain.includes('@'), false, 'domains without @');
    }
    assertNotEquals(bank.templates.length, 0, `${bank.code} needs at least one template`);
    const ids = bank.templates.map((t) => t.id);
    assertEquals(new Set(ids).size, ids.length, `${bank.code} template ids must be unique`);
    for (const template of bank.templates) {
      assertEquals(template.id.startsWith(`${bank.code}/`), true, `${template.id} must be prefixed with ${bank.code}/`);
      assertEquals(template.parse(EMPTY), [], `${template.id} must return [] on empty input, never throw`);
      for (const tx of template.parse({ ...EMPTY, subject: 'x' })) assertEquals(tx.bankCode, bank.code);
    }
  }

  for (const candidate of candidateBanks) {
    assertEquals(candidate.status, 'candidate');
    assertEquals(codes.includes(candidate.code), false, `${candidate.code} cannot be both bank and candidate`);
  }
});
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `deno test --allow-read supabase/functions/_shared/parsers/index.test.ts`
Expected: módulo `./index.ts` no encontrado.

- [ ] **Step 3: Crear `bhd/index.ts`**

```ts
import type { BankParser } from '../types.ts';
import { transactionsTable } from './transactions-table.ts';
import { transfer } from './transfer.ts';

export const bhd: BankParser = {
  code: 'bhd',
  senderDomains: ['bhd.com.do'],
  templates: [transactionsTable, transfer],
};
```

- [ ] **Step 4: Crear `candidates.ts`**

```ts
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
```

- [ ] **Step 5: Crear el registro `index.ts`**

```ts
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
  const domain = address.slice(at + 1).trim().toLowerCase().replace(/[>\s]+$/, '');
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
```

- [ ] **Step 6: Correr todos los tests de parsers**

Run: `bun run test:deno`
Expected: todos los tests de `normalize`, `transactions-table`, `transfer` e `index` en verde (`0 failed`).

- [ ] **Step 7: Check completo, lint y commit**

Run: `bun run check && bun run lint`
Expected: todo en verde.

```bash
git add supabase/functions/_shared/parsers
git commit -m "feat(parsers): add bank registry, candidate banks and parseEmail entry point" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: Cierre — documentación alineada y verificación final

**Files:**
- Modify: `CLAUDE.md` (sección "Comandos"), `docs/superpowers/plans/2026-09-17-roadmap.md` (estado del Plan 1)

- [ ] **Step 1: Alinear la sección "Comandos" de `CLAUDE.md`**

Reemplazar el bloque de comandos actual por el que refleja los scripts reales de este plan. Los comandos de Supabase y Expo quedan comentados como "desde Plan 2/4":

```bash
bun install
bun run typecheck                  # tsc --noEmit (scripts, tests y código fuente de parsers)
bun run test                       # Vitest (tests/unit)
bun run test:deno                  # deno test --allow-read supabase/functions/
bun run lint                       # deno lint (Plan 4 agrega ESLint de Expo)
bun run check                      # typecheck + test + test:deno — obligatorio antes de done
bun run fixtures:build             # fixtures-raw/**/*.eml → parsers/<bank>/fixtures/*.json
# Desde Plan 2: supabase start | supabase db reset | supabase functions serve
# Desde Plan 4: bunx expo start
```

- [ ] **Step 2: Marcar el Plan 1 como ejecutado en el roadmap**

En la tabla del roadmap, cambiar el estado del Plan 1 de `Escrito` a `Ejecutado`.

- [ ] **Step 3: Verificación final completa**

Run:
```bash
bun run check && bun run lint && git status --short
```
Expected: todo en verde y `git status` muestra solo `CLAUDE.md` y el roadmap modificados.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md docs/superpowers/plans/2026-09-17-roadmap.md
git commit -m "docs: align commands with plan 1 tooling and mark plan 1 done" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Criterio de éxito del Plan 1

- `bun run check` en verde desde un clon limpio (`bun install` + `bun run fixtures:build` no necesario porque las fixtures JSON están versionadas).
- `parseEmail()` devuelve la lista correcta para las 4 fixtures reales de BHD y `unknown_sender` / `unparsed` para lo demás.
- Ningún archivo bajo `parsers/` (excepto `*.test.ts`) importa `Deno`, `node:` ni `postal-mime`.
- Agregar una plantilla nueva no toca `index.ts` de la raíz; agregar un banco solo suma una línea a `banks`.

## Fuera de este plan (van a Planes 2–4 o esperan fixture)

- `Aprobada + Retiro` (esperando `.eml` real de retiro).
- Parsers de Banreservas, Popular y APAP (esperando correos reales).
- Emparejamiento de reversas: es lógica de `sync-mail` sobre la base de datos → Plan 3.
- Clientes Gmail / Graph, Vault, cron → Plan 3.
