import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useSession } from '@/features/auth/hooks';
import '../budget/budget.css';
import { signOutByUser } from '../session/sign-out';
import { Button } from '../ui/Button';
import { ConfirmButton } from '../ui/ConfirmButton';
import { PasswordPanel } from './PasswordPanel';

const SIGN_OUT_ERROR = 'No se pudo cerrar sesión. Revisa tu internet.';

export function AccountSection({ onNotice }: { onNotice: (message: string) => void }) {
  const { session } = useSession();
  const [open, setOpen] = useState(false);
  // Un cierre exitoso desmonta esta pantalla (SIGNED_OUT); si sigue montada, la sesión no se cerró.
  const signOut = useMutation({ mutationFn: signOutByUser });
  const signOutFailed = signOut.isError || signOut.isSuccess;

  return (
    <section className="settings-section" aria-labelledby="account-title">
      <h2 id="account-title">Cuenta</h2>
      <p className="settings-sub">Sesión iniciada como {session?.user.email ?? ''}</p>
      <div className="budget-actions">
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Cambiar contraseña
        </Button>
        <ConfirmButton
          label="Cerrar sesión"
          question="¿Cerrar sesión?"
          detail="Tendrás que escribir tu contraseña para volver a entrar."
          confirmLabel="Sí, cerrar sesión"
          pending={signOut.isPending}
          onConfirm={() => signOut.mutate()}
        />
      </div>
      {signOutFailed && (
        <p className="form-error" role="alert">
          {SIGN_OUT_ERROR}
        </p>
      )}
      <PasswordPanel
        email={session?.user.email ?? ''}
        open={open}
        onClose={() => setOpen(false)}
        onDone={(message) => {
          setOpen(false);
          onNotice(message);
        }}
      />
    </section>
  );
}
