import { Constants, type Enums } from '../../supabase/functions/_shared/database.types.ts';

// Única fuente: los tipos generados por `bun run db:types` (Plan 2). No escribir tipos de tablas a mano.
export type { Database, Enums, Tables, TablesInsert, TablesUpdate } from '../../supabase/functions/_shared/database.types.ts';

export type Currency = Enums<'currency_code'>;
export type BankCode = Enums<'bank_code'>;
export type BudgetPeriod = Enums<'budget_period'>;
export type TxSource = Enums<'tx_source'>;

export const CURRENCIES: readonly Currency[] = Constants.public.Enums.currency_code;
export const BANK_CODES: readonly BankCode[] = Constants.public.Enums.bank_code;
export const BUDGET_PERIODS: readonly BudgetPeriod[] = Constants.public.Enums.budget_period;
