import { defineConfig } from 'vitest/config';
import { aliases, dedupe } from './aliases.ts';

export default defineConfig({
  resolve: { alias: aliases, dedupe },
  test: { include: ['tests/**/*.test.ts'] },
});
