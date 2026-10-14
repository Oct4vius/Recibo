import type { LinkedAccount } from './mapping';

/** "hace 6 min", "hace 2 h", "ayer", "hace 4 días". */
export function syncedAgo(iso: string, now: Date): string {
  const minutes = Math.floor((now.getTime() - Date.parse(iso)) / 60_000);
  if (minutes < 1) return 'hace un momento';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'ayer' : `hace ${days} días`;
}

export function accountStatusText(account: LinkedAccount, now: Date): string {
  switch (account.status) {
    case 'active':
      return account.lastSyncAt ? `Activa · sincronizada ${syncedAgo(account.lastSyncAt, now)}` : 'Esperando la primera sincronización';
    case 'error':
      return `Error · ${account.lastError ?? 'Vuelve a vincular la cuenta.'}`;
    case 'revoked':
      return 'Desvinculada';
    case 'paused':
      return 'En pausa';
  }
}
