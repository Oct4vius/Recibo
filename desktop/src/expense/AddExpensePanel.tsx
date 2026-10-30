import { AddExpenseForm } from './AddExpenseForm';
import { SidePanel } from './SidePanel';

interface AddExpensePanelProps {
  open: boolean;
  timeZone: string;
  onClose: () => void;
  onSaved: () => void;
}

export function AddExpensePanel({ open, timeZone, onClose, onSaved }: AddExpensePanelProps) {
  return (
    <SidePanel open={open} title="Agregar gasto" onClose={onClose}>
      <AddExpenseForm timeZone={timeZone} onSaved={onSaved} onCancel={onClose} />
    </SidePanel>
  );
}
