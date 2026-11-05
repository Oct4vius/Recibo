import { Placeholder } from '@desktop/ui/Placeholder';
import './report-sheet.css';

/** Hoja gris mientras llegan los datos del reporte. */
export function SheetPlaceholder() {
  return (
    <article className="report-sheet" aria-busy="true" aria-label="Cargando reporte">
      <Placeholder width="60%" height={24} />
      <div className="sheet-placeholder-rows">
        <Placeholder width="100%" height={18} />
        <Placeholder width="100%" height={18} />
        <Placeholder width="100%" height={18} />
        <Placeholder width="100%" height={18} />
      </div>
    </article>
  );
}
