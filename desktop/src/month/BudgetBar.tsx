import { Button } from '../ui/Button';
import { useFillOnce } from '../ui/use-fill-once';
import { budgetLine } from './month-text';

interface BudgetBarProps {
  spentDop: number;
  limitDop: number | null;
  /** Lleva a Presupuesto desde el aviso de "sin presupuesto". */
  onOpenBudget: () => void;
  /** Cada barra se llena una vez por clave; Presupuesto pasa una por período. */
  fillKey?: string;
}

/** Barra del presupuesto mensual: se llena una sola vez por sesión de la app. */
export function BudgetBar({ spentDop, limitDop, onOpenBudget, fillKey = 'budget-month' }: BudgetBarProps) {
  const { text, fill, over } = budgetLine(spentDop, limitDop);
  const hasLimit = limitDop !== null && limitDop > 0;
  // Con enabled = hasLimit, un presupuesto puesto después sí se anima.
  const armed = useFillOnce(fillKey, hasLimit);

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
