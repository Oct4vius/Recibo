import { useEffect } from 'react';
import { useCreateExpense } from '@/features/transactions/hooks';
import { SidePanel } from '../ui/SidePanel';
import { AddExpenseForm } from './AddExpenseForm';

interface AddExpensePanelProps {
  open: boolean;
  timeZone: string;
  onClose: () => void;
  onSaved: () => void;
}

export function AddExpensePanel({ open, timeZone, onClose, onSaved }: AddExpensePanelProps) {
  // El guardado vive aquí, no en el formulario: así su aviso llega aunque el panel se cierre, y `busy` impide cerrarlo a medias.
  const create = useCreateExpense();
  const { reset } = create;
  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  return (
    <SidePanel open={open} title="Agregar gasto" onClose={onClose} busy={create.isPending}>
      <AddExpenseForm
        timeZone={timeZone}
        saving={create.isPending}
        failed={create.isError}
        onSave={(expense) => create.mutate(expense, { onSuccess: onSaved })}
        onCancel={onClose}
      />
    </SidePanel>
  );
}
