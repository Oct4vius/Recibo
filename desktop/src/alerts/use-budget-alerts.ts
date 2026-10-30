import { useQueryClient } from '@tanstack/react-query';
import { listen } from '@tauri-apps/api/event';
import { useEffect, useRef } from 'react';
import { checkBudgetAlerts } from '@/features/notifications/flows';
import { historyKeys } from '@/features/history/keys';
import { summaryKeys } from '@/features/summary/keys';
import { transactionKeys } from '@/features/transactions/keys';
import { desktopPort } from './desktop-port';
import { shouldRunCheck } from './alert-timing';

/**
 * Revisa los avisos al montar, con el foco y con el pulso de 15 min de Rust (`alerts-tick`). Cada revisión refresca
 * lo que el sync pudo cambiar. El pulso siempre refresca; el resto respeta `MIN_CHECK_GAP_MS`. Los errores se
 * ignoran: la próxima revisión reintenta.
 */
export function useBudgetAlerts(): void {
  const queryClient = useQueryClient();
  const lastAt = useRef<number | null>(null);

  useEffect(() => {
    const run = (force: boolean) => {
      const now = Date.now();
      if (!force && !shouldRunCheck(lastAt.current, now)) return;
      lastAt.current = now;
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: summaryKeys.all }),
        queryClient.invalidateQueries({ queryKey: historyKeys.all }),
        queryClient.invalidateQueries({ queryKey: transactionKeys.all }),
      ]);
      checkBudgetAlerts(desktopPort).catch(() => undefined);
    };
    const onFocus = () => run(false);
    run(false);
    window.addEventListener('focus', onFocus);
    const unlisten = listen('alerts-tick', () => run(true));
    return () => {
      window.removeEventListener('focus', onFocus);
      void unlisten.then((off) => off());
    };
  }, [queryClient]);
}
