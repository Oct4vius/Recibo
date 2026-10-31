import { focusManager, type QueryClient } from '@tanstack/react-query';

/**
 * Ajustes de TanStack solo del escritorio (el teléfono comparte queryClient.ts y no cambia).
 * - networkMode 'always': el evento `offline` de WebView2 no debe dejar mutaciones ni consultas en pausa.
 * - refetchOnReconnect explícito: 'always' lo apaga por defecto.
 * - Foco: una ventana detrás de otra app puede no disparar visibilitychange; también se escucha `focus`.
 */
export function setupQueryClient(queryClient: QueryClient): void {
  const defaults = queryClient.getDefaultOptions();
  queryClient.setDefaultOptions({
    queries: { ...defaults.queries, networkMode: 'always', refetchOnReconnect: true },
    mutations: { networkMode: 'always' },
  });
  focusManager.setEventListener((handleFocus) => {
    const onChange = () => handleFocus();
    window.addEventListener('visibilitychange', onChange);
    window.addEventListener('focus', onChange);
    return () => {
      window.removeEventListener('visibilitychange', onChange);
      window.removeEventListener('focus', onChange);
    };
  });
}
