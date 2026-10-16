/** Decodifica base64url (alfabeto `-`/`_`), con o sin relleno `=`. Sin APIs de Deno: lo importan scripts de Bun. */
export function decodeBase64Url(data: string): Uint8Array {
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '');
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
