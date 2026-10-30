import { useEffect, useState } from 'react';
import { budgetLine } from './month-text';

/** Ya se llenó una vez en esta sesión: al volver al mes actual la barra aparece llena, sin animar de nuevo. */
let played = false;

/** Barra del presupuesto mensual: se llena una sola vez por sesión de la app. */
export function BudgetBar({ spentDop, limitDop }: { spentDop: number; limitDop: number | null }) {
  const { text, fill, over } = budgetLine(spentDop, limitDop);
  const [armed, setArmed] = useState(played);
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      played = true;
      setArmed(true);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="budget">
      {limitDop !== null && limitDop > 0 && (
        <div className="budget-track">
          <div
            className={over ? 'budget-fill budget-fill-over' : 'budget-fill'}
            style={{ transform: `scaleX(${armed ? fill : 0})` }}
          />
        </div>
      )}
      <p className="budget-text">{text}</p>
    </div>
  );
}
