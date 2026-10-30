import { Notice } from '../ui/Notice';
import { useNotice } from '../ui/use-notice';
import { AlertThresholds } from './AlertThresholds';
import { BudgetBlock } from './BudgetBlock';
import { BUDGET_ORDER } from './budget-text';
import './budget.css';

export function BudgetScreen() {
  const { notice, show } = useNotice();
  return (
    <div className="budget-screen">
      <h1>Presupuesto</h1>
      {BUDGET_ORDER.map((period) => (
        <BudgetBlock key={period} period={period} onNotice={show} />
      ))}
      <AlertThresholds />
      <Notice message={notice} />
    </div>
  );
}
