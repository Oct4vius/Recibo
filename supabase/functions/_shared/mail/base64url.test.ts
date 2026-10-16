import { assertEquals } from 'jsr:@std/assert@1';
import { decodeBase64Url } from './base64url.ts';

Deno.test('decodeBase64Url — url-safe alphabet with or without padding', () => {
  assertEquals([...decodeBase64Url('-_-_')], [251, 255, 191]);
  assertEquals(new TextDecoder().decode(decodeBase64Url('w7M')), 'ó');
  assertEquals(new TextDecoder().decode(decodeBase64Url('w7M=')), 'ó');
});
