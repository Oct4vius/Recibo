import { assertEquals } from 'jsr:@std/assert@1';
import { transferIn } from './transfer-in.ts';
import { loadFixture } from '../test-helpers.ts';

Deno.test('bhd/transfer-in — matches an incoming transfer', () => {
  assertEquals(transferIn.matches(loadFixture('bhd', 'transfer-in')), true);
});

Deno.test('bhd/transfer-in — does not match an outgoing transfer or other subjects', () => {
  assertEquals(transferIn.matches(loadFixture('bhd', 'transfer-out')), false);
  assertEquals(transferIn.matches(loadFixture('bhd', 'card-purchase-approved')), false);
});
