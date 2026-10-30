import { describe, expect, it, vi } from 'vitest';
import { connectGmail, connectOutlook, loginErrorMessage, type LoginPort } from '@desktop/accounts/login-flow';

function okPort(code: string): LoginPort {
  return { newState: () => 's1', listen: async () => {}, openUrl: async () => {}, waitCode: async () => code, cancel: async () => {} };
}

describe('login flow', () => {
  it('escucha antes de abrir el navegador', async () => {
    const calls: string[] = [];
    const port: LoginPort = {
      newState: () => 's1',
      listen: async () => { calls.push('listen'); },
      openUrl: async () => { calls.push('open'); },
      waitCode: async () => { calls.push('wait'); return 'c1'; },
      cancel: async () => { calls.push('cancel'); },
    };
    await connectGmail(port, 'id');
    expect(calls).toEqual(['listen', 'open', 'wait']);
  });
  it('con el puerto ocupado no abre el navegador', async () => {
    const openUrl = vi.fn();
    const port: LoginPort = { newState: () => 's', listen: () => Promise.reject('port-busy'), openUrl, waitCode: vi.fn(), cancel: vi.fn() };
    await expect(connectGmail(port, 'id')).rejects.toBe('port-busy');
    expect(openUrl).not.toHaveBeenCalled();
  });
  it('si el navegador no abre, cierra la escucha y relanza el error', async () => {
    const cancel = vi.fn(async () => {});
    const waitCode = vi.fn();
    const port: LoginPort = { newState: () => 's', listen: async () => {}, openUrl: () => Promise.reject(new Error('no browser')), waitCode, cancel };
    await expect(connectGmail(port, 'id')).rejects.toThrow('no browser');
    await expect(connectOutlook(port, 'id')).rejects.toThrow('no browser');
    expect(cancel).toHaveBeenCalledTimes(2);
    expect(waitCode).not.toHaveBeenCalled();
  });
  it('Gmail manda code y redirectUri', async () => {
    expect(await connectGmail(okPort('c1'), 'id')).toEqual({ provider: 'gmail', code: 'c1', redirectUri: 'http://localhost:53682/callback' });
  });
  it('Outlook manda además el verifier', async () => {
    expect(await connectOutlook(okPort('c1'), 'id')).toMatchObject({
      provider: 'outlook', code: 'c1', redirectUri: 'http://localhost:53682/callback', codeVerifier: expect.any(String),
    });
  });
  it('mensajes', () => {
    expect(loginErrorMessage('cancelled')).toBeNull();
    expect(loginErrorMessage('port-busy')).toBe('No se pudo abrir la conexión con el navegador. Reinicia la computadora y vuelve a intentarlo.');
    expect(loginErrorMessage('timeout')).toBe('Se acabó el tiempo. Vuelve a intentarlo.');
    expect(loginErrorMessage('denied')).toBe('No se dio permiso para leer el correo. Vuelve a intentarlo.');
  });
});
