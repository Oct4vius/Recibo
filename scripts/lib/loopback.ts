import { createServer } from 'node:http';
import { spawn } from 'node:child_process';

import { LOOPBACK_PORT, LOOPBACK_REDIRECT } from '../../src/features/accounts/loopback-login';

export { LOOPBACK_PORT, LOOPBACK_REDIRECT };

/** Espera el redirect en localhost y devuelve el código (valida `state`). Nunca lo imprime. */
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
