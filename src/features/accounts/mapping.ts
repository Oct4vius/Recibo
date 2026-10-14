import type { AccountStatus, MailProviderName, Tables } from '@/types/database';

export interface LinkedAccount {
  id: string;
  provider: MailProviderName;
  email: string;
  status: AccountStatus;
  lastSyncAt: string | null;
  lastError: string | null;
}

export type LinkedAccountRow = Pick<Tables<'linked_accounts'>, 'id' | 'provider' | 'email' | 'status' | 'last_sync_at' | 'last_error'>;

export function toLinkedAccount(row: LinkedAccountRow): LinkedAccount {
  return {
    id: row.id,
    provider: row.provider,
    email: row.email,
    status: row.status,
    lastSyncAt: row.last_sync_at,
    lastError: row.last_error,
  };
}
