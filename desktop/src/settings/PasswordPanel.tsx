import { useEffect } from 'react';
import { useChangePassword } from '@/features/auth/hooks';
import { SAVE_ERROR } from '@/features/transactions/messages';
import '../expense/add-expense.css';
import { SidePanel } from '../ui/SidePanel';
import { PasswordForm } from './PasswordForm';

interface PasswordPanelProps {
  email: string;
  open: boolean;
  onClose: () => void;
  onDone: (notice: string) => void;
}

/** Panel para cambiar la contraseña. La mutación vive aquí, no en el formulario que se desmonta al cerrar. */
export function PasswordPanel({ email, open, onClose, onDone }: PasswordPanelProps) {
  const change = useChangePassword(email);
  const { reset } = change;
  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  // data = mensaje de error de la contraseña (p. ej. la actual no coincide); null = cambiada.
  const serverError = change.isError ? SAVE_ERROR : (change.data ?? null);

  return (
    <SidePanel open={open} title="Cambiar contraseña" onClose={onClose} busy={change.isPending}>
      <PasswordForm
        saving={change.isPending}
        serverError={serverError}
        onSave={(input) =>
          change.mutate(input, {
            onSuccess: (message) => {
              if (!message) onDone('Contraseña actualizada');
            },
          })
        }
        onCancel={onClose}
      />
    </SidePanel>
  );
}
