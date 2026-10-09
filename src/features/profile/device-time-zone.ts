import { getCalendars } from 'expo-localization';

/** Zona IANA del teléfono; si Android no la informa, la de `Intl`. */
export function deviceTimeZone(): string {
  return getCalendars()[0]?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
}
