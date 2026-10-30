import type { LinkedAccount } from '@/features/accounts/mapping';
import { unlinkNote } from '@/features/accounts/provider-copy';
import { ConfirmButton } from '../ui/ConfirmButton';
import { accountHelpLine, accountStatusLine } from './accounts-text';

interface AccountRowProps {
  account: LinkedAccount;
  pending: boolean;
  error: string | null;
  onDisconnect: () => void;
}

export function AccountRow({ account, pending, error, onDisconnect }: AccountRowProps) {
  const help = accountHelpLine(account);
  return (
    <li className="account-row">
      <div className="account-info">
        <p className="account-email">{account.email}</p>
        <p className="account-status">{accountStatusLine(account)}</p>
        {help && <p className="account-help">{help}</p>}
        {error && <p className="form-error">{error}</p>}
      </div>
      <ConfirmButton
        label="Desconectar"
        question={`¿Desconectar ${account.email}?`}
        detail={`Los gastos ya importados se quedan. ${unlinkNote(account.provider)}`}
        confirmLabel="Sí, desconectar"
        pending={pending}
        onConfirm={onDisconnect}
      />
    </li>
  );
}
