export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

export function bearerToken(request: Request): string | null {
  const match = /^Bearer\s+(.+)$/i.exec(request.headers.get('Authorization') ?? '');
  return match ? match[1].trim() : null;
}

export async function readJsonObject(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const value: unknown = await request.json();
    return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export const UNAUTHORIZED = { error: 'No autorizado' };
export const BAD_REQUEST = { error: 'Solicitud inválida' };
