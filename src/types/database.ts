import type { Enums } from '../../supabase/functions/_shared/database.types.ts';

// Única fuente: los tipos generados por `bun run db:types` (Plan 2). No escribir tipos de tablas a mano.
export type { Database, Enums, Tables, TablesInsert, TablesUpdate } from '../../supabase/functions/_shared/database.types.ts';

export type Currency = Enums<'currency_code'>;
