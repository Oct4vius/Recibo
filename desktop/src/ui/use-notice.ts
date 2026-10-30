import { useCallback, useEffect, useState } from 'react';
import { NOTICE_MS } from '@/features/transactions/hooks';

/** Aviso breve: dura `NOTICE_MS` y cada aviso nuevo reinicia el tiempo. */
export function useNotice() {
  // El contador distingue dos avisos iguales seguidos: el segundo también reinicia el reloj.
  const [current, setCurrent] = useState<{ message: string; count: number } | null>(null);
  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(() => setCurrent(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [current]);
  const show = useCallback((message: string) => setCurrent((previous) => ({ message, count: (previous?.count ?? 0) + 1 })), []);
  return { notice: current?.message ?? null, show };
}
