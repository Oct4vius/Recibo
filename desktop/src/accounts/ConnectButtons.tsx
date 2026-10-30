import type { MailProviderName } from '@/types/database';
import { Button } from '../ui/Button';

interface ConnectButtonsProps {
  gmailAvailable: boolean;
  /** Hay un inicio de sesión en marcha o enviándose: los dos botones quedan apagados. */
  busy: boolean;
  /** Esperando que la persona termine en el navegador. */
  waiting: boolean;
  onConnect: (provider: MailProviderName) => void;
  onCancel: () => void;
}

export function ConnectButtons({ gmailAvailable, busy, waiting, onConnect, onCancel }: ConnectButtonsProps) {
  return (
    <div className="connect">
      <div className="connect-buttons">
        {gmailAvailable && (
          <Button onClick={() => onConnect('gmail')} disabled={busy}>
            Conectar Gmail
          </Button>
        )}
        <Button onClick={() => onConnect('outlook')} disabled={busy}>
          Conectar Outlook
        </Button>
      </div>
      {waiting && (
        <div className="connect-waiting">
          <p>Termina de entrar en la ventana del navegador…</p>
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      )}
    </div>
  );
}
