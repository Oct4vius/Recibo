import { describe, expect, it } from 'vitest';
import { flagValue, parseEnvLines, parseTarget } from '../../../scripts/lib/dev-target';

describe('dev-target', () => {
  it('defaults to local and accepts --target remote', () => {
    expect(parseTarget([])).toBe('local');
    expect(parseTarget(['--target', 'remote'])).toBe('remote');
    expect(parseTarget(['--target', 'local'])).toBe('local');
  });
  it('rejects an unknown target', () => {
    expect(() => parseTarget(['--target', 'prod'])).toThrow(/local|remote/);
  });
  it('reads a flag value, or null when missing or followed by another flag', () => {
    expect(flagValue(['--account', 'a@b.example', '--target', 'remote'], '--account')).toBe('a@b.example');
    expect(flagValue(['--target', 'remote'], '--account')).toBeNull();
    expect(flagValue(['--account', '--target', 'remote'], '--account')).toBeNull();
  });
  it('parses KEY=VALUE lines, quoted or not, skipping comments', () => {
    expect(parseEnvLines('# c\nAPI_URL="http://127.0.0.1:54321"\n\nSYNC_MAIL_SECRET=abc=def\n')).toEqual({
      API_URL: 'http://127.0.0.1:54321',
      SYNC_MAIL_SECRET: 'abc=def',
    });
  });
});
