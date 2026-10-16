import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { downloadPath, rawMessageBytes, rawMessageRequest } from '../../../scripts/lib/raw-mail';

describe('rawMessageRequest', () => {
  it('asks Graph for the MIME value with immutable ids and Gmail for the raw format', () => {
    expect(rawMessageRequest('outlook', 'AAk/x+y=')).toEqual({
      url: 'https://graph.microsoft.com/v1.0/me/messages/AAk%2Fx%2By%3D/$value',
      headers: { Prefer: 'IdType="ImmutableId"' },
    });
    expect(rawMessageRequest('gmail', '18f2a')).toEqual({ url: 'https://gmail.googleapis.com/gmail/v1/users/me/messages/18f2a?format=raw', headers: {} });
  });
});

describe('rawMessageBytes', () => {
  it('decodes the Gmail raw field and passes the Graph body through', async () => {
    expect(new TextDecoder().decode(await rawMessageBytes('gmail', new Response(JSON.stringify({ raw: 'RnJvbTogeA' }))))).toBe('From: x');
    expect(new TextDecoder().decode(await rawMessageBytes('outlook', new Response('From: y')))).toBe('From: y');
    await expect(rawMessageBytes('gmail', new Response('{}'))).rejects.toThrow();
  });
});

describe('downloadPath', () => {
  it('files by bank under _downloaded with a date and a hash, never the raw id', () => {
    const hash = createHash('sha256').update('AAk/x+y=').digest('hex').slice(0, 12);
    expect(downloadPath('apap', '2026-09-16T02:43:15+00:00', 'AAk/x+y=')).toBe(join('fixtures-raw', 'apap', '_downloaded', `2026-09-16T02-43-15-${hash}.eml`));
    expect(downloadPath(null, null, 'id')).toMatch(/_unknown[\\/]_downloaded[\\/]sin-fecha-[0-9a-f]{12}\.eml$/);
  });
});
