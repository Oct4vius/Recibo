import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { checkAnonymized, parseAnonymizeConfig } from './lib/anonymize.ts';
import { emlToRawEmail } from './lib/eml.ts';

const RAW_DIR = 'fixtures-raw';
const ANONYMIZE_CONFIG = join(RAW_DIR, 'anonymize.local.json');
const PARSERS_DIR = join('supabase', 'functions', '_shared', 'parsers');

async function main(): Promise<void> {
  const banks = (await readdir(RAW_DIR, { withFileTypes: true })).filter((d) => d.isDirectory() && !d.name.startsWith('_'));
  // Red de seguridad: si hay config local, ningún término prohibido puede llegar a una fixture versionada.
  const config = existsSync(ANONYMIZE_CONFIG) ? parseAnonymizeConfig(JSON.parse(readFileSync(ANONYMIZE_CONFIG, 'utf8'))) : null;
  let written = 0;
  for (const bank of banks) {
    const rawBankDir = join(RAW_DIR, bank.name);
    const outDir = join(PARSERS_DIR, bank.name, 'fixtures');
    await mkdir(outDir, { recursive: true });
    const emls = (await readdir(rawBankDir)).filter((f) => f.toLowerCase().endsWith('.eml'));
    for (const file of emls) {
      const bytes = await readFile(join(rawBankDir, file));
      const email = await emlToRawEmail(new Uint8Array(bytes));
      if (config) {
        const verdict = checkAnonymized([new TextDecoder().decode(bytes), email.subject, email.text, email.from], config);
        if (!verdict.ok) {
          console.error(`${join(rawBankDir, file)}: quedan términos prohibidos (${verdict.terms.join(', ')}). No se escribió la fixture.`);
          process.exit(1);
        }
      }
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
