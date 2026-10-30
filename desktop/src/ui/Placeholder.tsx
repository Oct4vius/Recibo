/** Bloque gris con la forma de lo que va a llegar; sin brillo animado. */
export function Placeholder({ width, height }: { width: number | string; height: number | string }) {
  return <div className="placeholder" style={{ width, height }} aria-hidden="true" />;
}
