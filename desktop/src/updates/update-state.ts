export const UPDATE_CHECK_GAP_MS = 6 * 60 * 60_000;

/** Revisa al abrir y, después, como mucho una vez cada 6 horas. */
export function shouldCheckUpdate(lastAt: number | null, now: number): boolean {
  return lastAt === null || now - lastAt >= UPDATE_CHECK_GAP_MS;
}
