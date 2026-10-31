/** Entre dos revisiones de avisos debe pasar al menos esto (el foco y el pulso pueden coincidir). */
export const MIN_CHECK_GAP_MS = 60_000;

export function shouldRunCheck(lastAt: number | null, now: number): boolean {
  return lastAt === null || now - lastAt >= MIN_CHECK_GAP_MS;
}
