import { useEffect, useState } from 'react';
import { useLinkAccount, useLinkedAccounts, useUnlinkAccount } from '@/features/accounts/hooks';
import type { LinkAccountInput } from '@/features/accounts/api';
import type { MailProviderName } from '@/types/database';
import { env } from '../lib/env';
import { ErrorLine } from '../ui/ErrorLine';
import { Notice } from '../ui/Notice';
import { Placeholder } from '../ui/Placeholder';
import { useNotice } from '../ui/use-notice';
import { AccountRow } from './AccountRow';
import { visibleAccounts } from './accounts-text';
import { ConnectButtons } from './ConnectButtons';
import { connectGmail, connectOutlook, loginErrorMessage } from './login-flow';
import { nativeLoginPort } from './native-login-port';
import './accounts.css';

const GMAIL_CLIENT_ID = env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

export function AccountsScreen() {
  const accounts = useLinkedAccounts();
  const link = useLinkAccount();
  const unlink = useUnlinkAccount();
  const { notice, show } = useNotice();
  const [waiting, setWaiting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);

  // Al salir de la pantalla se cierra la escucha del navegador, si quedaba una.
  useEffect(() => () => void nativeLoginPort.cancel().catch(() => {}), []);

  const connect = async (provider: MailProviderName) => {
    setConnectError(null);
    setWaiting(true);
    let input: LinkAccountInput;
    try {
      input =
        provider === 'gmail' && GMAIL_CLIENT_ID
          ? await connectGmail(nativeLoginPort, GMAIL_CLIENT_ID)
          : await connectOutlook(nativeLoginPort, env.EXPO_PUBLIC_MS_CLIENT_ID);
    } catch (error) {
      const message = loginErrorMessage(error);
      if (message) setConnectError(message);
      return;
    } finally {
      setWaiting(false);
    }
    // El mensaje del servidor se muestra tal cual.
    link.mutate(input, { onSuccess: () => show('Correo conectado'), onError: (error) => setConnectError(error.message) });
  };

  const disconnect = (id: string) => {
    setUnlinkingId(id);
    unlink.mutate(id, { onSuccess: () => show('Correo desconectado') });
  };

  const rows = accounts.data ? visibleAccounts(accounts.data) : [];

  return (
    <div className="ticket accounts-screen">
      <h1>Mis correos</h1>
      {accounts.isError && !accounts.data ? (
        <ErrorLine onRetry={() => void accounts.refetch()} retrying={accounts.isFetching} />
      ) : accounts.isPending ? (
        <div className="accounts-placeholders">
          <Placeholder width="100%" height={72} />
          <Placeholder width="100%" height={72} />
        </div>
      ) : rows.length === 0 ? (
        <p className="accounts-empty">Aún no hay ningún correo conectado.</p>
      ) : (
        <ul className="accounts-list">
          {rows.map((account) => (
            <AccountRow
              key={account.id}
              account={account}
              pending={unlink.isPending && unlinkingId === account.id}
              error={unlink.isError && unlinkingId === account.id ? unlink.error.message : null}
              onDisconnect={() => disconnect(account.id)}
            />
          ))}
        </ul>
      )}
      <ConnectButtons
        gmailAvailable={Boolean(GMAIL_CLIENT_ID)}
        busy={waiting || link.isPending}
        waiting={waiting}
        linking={link.isPending}
        onConnect={(provider) => void connect(provider)}
        onCancel={() => void nativeLoginPort.cancel().catch(() => {})}
      />
      {connectError && <p className="form-error">{connectError}</p>}
      <Notice message={notice} />
    </div>
  );
}
