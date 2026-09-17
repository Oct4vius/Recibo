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
