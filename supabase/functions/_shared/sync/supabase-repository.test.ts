import { assertInstanceOf, assertThrows } from 'jsr:@std/assert@1';
import { DataRejectedError } from './repository.ts';
import { fail } from './supabase-repository.ts';

Deno.test('fail — row-level data rejections become DataRejectedError', () => {
  for (const code of ['23514', '22001', '22003', '22007', '22008', '22021', '22P05']) {
    const error = assertThrows(() => fail({ message: 'm', code }));
    assertInstanceOf(error, DataRejectedError);
  }
});

Deno.test('regression — page-wide or transient errors are not treated as one bad email', () => {
  for (const code of ['22P02', '23502', '23503', '40P01', '57014', 'PGRST301', undefined]) {
    const error = assertThrows(() => fail({ message: 'm', code }));
    if (error instanceof DataRejectedError) throw new Error(`${code} must not be a DataRejectedError`);
  }
});
