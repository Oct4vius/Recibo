import { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { budgetLine } from './month-text';

/** Ya se llenó una vez en esta sesión: al volver al mes actual la barra aparece llena, sin animar de nuevo. */
let played = false;

interface BudgetBarProps {
  spentDop: number;
  limitDop: number | null;
  /** Lleva a Presupuesto desde el aviso de "sin presupuesto". */
  onOpenBudget: () => void;
}

/** Barra del presupuesto mensual: se llena una sola vez por sesión de la app. */
export function BudgetBar({ spentDop, limitDop, onOpenBudget }: BudgetBarProps) {
  const { text, fill, over } = budgetLine(spentDop, limitDop);
  const hasLimit = limitDop !== null && limitDop > 0;
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
      {hasLimit && (
        <div className="budget-track">
          <div
            className={over ? 'budget-fill budget-fill-over' : 'budget-fill'}
            style={{ transform: `scaleX(${armed ? fill : 0})` }}
          />
        </div>
      )}
      <p className="budget-text">{text}</p>
      {!hasLimit && (
        <Button variant="secondary" className="budget-set" onClick={onOpenBudget}>
          Poner un presupuesto
        </Button>
      )}
    </div>
  );
}
