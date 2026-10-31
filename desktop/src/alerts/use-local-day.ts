import { useEffect, useState } from 'react';
import { toIsoDate, toLocalDate } from '@/lib/dates';

const CHECK_MS = 60_000;

function today(timeZone: string): string {
  return toIsoDate(toLocalDate(new Date(), timeZone));
}

/** Fecha local de hoy (YYYY-MM-DD) en la zona del perfil; se revisa con el foco y cada minuto. */
export function useLocalDay(timeZone: string): string {
  const [day, setDay] = useState(() => today(timeZone));

  useEffect(() => {
    const update = () => setDay(today(timeZone));
    update();
    const id = setInterval(update, CHECK_MS);
    window.addEventListener('focus', update);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', update);
    };
  }, [timeZone]);

  return day;
}
