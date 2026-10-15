import { createHash, randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';

export const MS_AUTHORIZE_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
export const MS_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
export const MS_SCOPES = 'openid email offline_access Mail.Read';
export const LOOPBACK_PORT = 53682;
/** En cuentas personales Microsoft NO ignora el puerto: se registra `http://localhost:53682/callback` en Entra. */
export const LOOPBACK_REDIRECT = `http://localhost:${LOOPBACK_PORT}/callback`;

export function base64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function createPkce(): { verifier: string; challenge: string } {
  const verifier = base64Url(randomBytes(32));
  const challenge = base64Url(createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

export function authorizeUrl(clientId: string, challenge: string, state: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: LOOPBACK_REDIRECT,
    response_mode: 'query',
    scope: MS_SCOPES,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
    prompt: 'select_account',
  });
  return `${MS_AUTHORIZE_URL}?${params.toString()}`;
}

/** Espera el redirect en localhost y devuelve el código (valida `state`). */
export function waitForCode(state: string, timeoutMs = 300_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? '/', LOOPBACK_REDIRECT);
      if (url.pathname !== '/callback') {
        res.writeHead(404).end();
        return;
      }
      const code = url.searchParams.get('code');
      const ok = code !== null && url.searchParams.get('state') === state;
      res.writeHead(ok ? 200 : 400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(ok ? 'Listo. Puedes cerrar esta pestaña.' : 'Inicio de sesión cancelado o inválido.');
      clearTimeout(timer);
      server.close();
      if (ok) resolve(code);
      else reject(new Error(url.searchParams.get('error') ?? 'invalid_state'));
    });
    const timer = setTimeout(() => {
      server.close();
      reject(new Error('timeout'));
    }, timeoutMs);
    server.listen(LOOPBACK_PORT, 'localhost');
  });
}

/** Abre la URL en el navegador del sistema (Windows, macOS o Linux). */
export function openBrowser(url: string): void {
  const command =
    process.platform === 'win32'
      ? ['rundll32', ['url.dll,FileProtocolHandler', url]]
      : process.platform === 'darwin'
        ? ['open', [url]]
        : ['xdg-open', [url]];
  spawn(command[0] as string, command[1] as string[], { stdio: 'ignore', detached: true }).unref();
}
