// Anonimiza un .eml real para usarlo como fixture. Uso: bun run eml:anonymize <entrada.eml> <salida.eml>
// Lee fixtures-raw/anonymize.local.json (gitignored). Ver docs/agregar-banco.md.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import PostalMime from 'postal-mime';
import { anonymizeText, buildMinimalEml, checkAnonymized, parseAnonymizeConfig } from './lib/anonymize';
import { emlToRawEmail } from './lib/eml';

const CONFIG_PATH = 'fixtures-raw/anonymize.local.json';

async function main(): Promise<void> {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) throw new Error('Uso: bun run eml:anonymize <entrada.eml> <salida.eml>');
  if (!existsSync(CONFIG_PATH)) {
    throw new Error(
      `Falta ${CONFIG_PATH}. Forma: { "replacements": [{ "find": "NOMBRE REAL", "replace": "JUAN PEREZ" }], "forbidden": ["correo@real.example"] }. Ver docs/agregar-banco.md.`,
    );
  }
  const config = parseAnonymizeConfig(JSON.parse(readFileSync(CONFIG_PATH, 'utf8')));

  const parsed = await PostalMime.parse(readFileSync(input));
  if (!parsed.html) throw new Error('El .eml no tiene parte text/html');
  if (!parsed.from?.address) throw new Error('El .eml no tiene remitente');
  if (!parsed.messageId || !parsed.date) throw new Error('El .eml no tiene Message-ID o Date');

  const eml = buildMinimalEml({
    from: parsed.from.address,
    subject: anonymizeText(parsed.subject ?? '', config),
    date: parsed.date,
    messageId: parsed.messageId,
    html: anonymizeText(parsed.html, config),
  });
  const raw = await emlToRawEmail(new TextEncoder().encode(eml));
  const verdict = checkAnonymized([eml, raw.subject, raw.text], config);
  if (!verdict.ok) {
    console.error(`Quedan términos prohibidos: ${verdict.terms.join(', ')}. No se escribió ${output}.`);
    process.exit(1);
  }
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, eml, 'utf8');
  console.log(`Escrito ${output}. Revisa a ojo el texto normalizado:\n\n${raw.text}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
