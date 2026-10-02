// Comprobación EN COMPILACIÓN: los enums de Postgres deben ser idénticos a los tipos de los parsers.
// Si alguien agrega un banco o un tipo de movimiento en un lado y no en el otro, `deno test` no compila.
import type { Database } from '../database.types.ts';
import type { BankCode, Currency, TxType } from './types.ts';

type Equals<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

const bankCodeMatches: Equals<Database['public']['Enums']['bank_code'], BankCode> = true;
const txTypeMatches: Equals<Database['public']['Enums']['tx_type'], TxType> = true;
const currencyMatches: Equals<Database['public']['Enums']['currency_code'], Currency> = true;

Deno.test('postgres enums mirror parser types (compile-time)', () => {
  if (!bankCodeMatches || !txTypeMatches || !currencyMatches) {
    throw new Error('unreachable: type-level assertions failed');
  }
});
