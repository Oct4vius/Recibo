import { useEffect, useState } from 'react';
import { budgetLine } from './month-text';

/** Barra del presupuesto mensual: se llena una sola vez al montarse. */
export function BudgetBar({ spentDop, limitDop }: { spentDop: number; limitDop: number | null }) {
  const { text, fill, over } = budgetLine(spentDop, limitDop);
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setArmed(true));
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
