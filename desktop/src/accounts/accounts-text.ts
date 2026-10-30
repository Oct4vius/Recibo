import type { LinkedAccount } from '@/features/accounts/mapping';

/** Los desconectados no se muestran. */
export function visibleAccounts(accounts: readonly LinkedAccount[]): LinkedAccount[] {
  return accounts.filter((a) => a.status !== 'revoked');
}

export function accountStatusLine(account: LinkedAccount): string {
  if (account.status === 'error') return 'Dejó de funcionar';
  if (account.status === 'active') return 'Funcionando';
  return 'En pausa';
}

export function accountHelpLine(account: LinkedAccount): string | null {
  return account.status === 'error' ? 'Este correo dejó de conectarse. Pide ayuda para volver a conectarlo.' : null;
}
