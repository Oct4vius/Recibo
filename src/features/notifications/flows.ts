import type { ClaimedAlert } from './mapping';
import { shouldCheck, type PermissionState } from './state';

/** Todo lo nativo o remoto que necesitan los flujos; los tests pasan una implementación en memoria. */
export interface AlertsPort {
  hasSession(): Promise<boolean>;
  readEnabled(): Promise<boolean>;
  writeEnabled(on: boolean): Promise<void>;
  readPermission(): Promise<PermissionState>;
  /** Crea el canal antes de pedir el permiso (Android 13+). */
  requestPermission(): Promise<PermissionState>;
  claim(): Promise<ClaimedAlert[]>;
  silence(): Promise<void>;
  present(alert: ClaimedAlert): Promise<void>;
  registerTask(): Promise<void>;
  unregisterTask(): Promise<void>;
}

/**
 * Revisa y muestra los avisos pendientes. Nunca reclama sin sesión, preferencia y permiso: un teléfono con los
 * avisos apagados se "comería" el aviso que debía mostrar el otro teléfono del mismo usuario.
 * Devuelve cuántos avisos mostró.
 */
export async function checkBudgetAlerts(
  port: Pick<AlertsPort, 'hasSession' | 'readEnabled' | 'readPermission' | 'claim' | 'present'>,
): Promise<number> {
  if (!(await port.hasSession())) return 0;
  const [enabled, permission] = [await port.readEnabled(), await port.readPermission()];
  if (!shouldCheck(enabled, permission)) return 0;
  const alerts = await port.claim();
  for (const alert of alerts) await port.present(alert);
  return alerts.length;
}

/**
 * Enciende los avisos de este teléfono. Orden: permiso → silenciar lo ya cruzado → guardar la preferencia →
 * registrar la tarea. Si silenciar falla (sin conexión) no queda nada encendido.
 */
export async function enableDeviceAlerts(
  port: Pick<AlertsPort, 'requestPermission' | 'silence' | 'writeEnabled' | 'registerTask'>,
): Promise<PermissionState> {
  const permission = await port.requestPermission();
  if (permission !== 'granted') return permission;
  await port.silence();
  await port.writeEnabled(true);
  await port.registerTask();
  return permission;
}

export async function disableDeviceAlerts(port: Pick<AlertsPort, 'writeEnabled' | 'unregisterTask'>): Promise<void> {
  await port.writeEnabled(false);
  await port.unregisterTask();
}

/** Al abrir la app: la tarea está registrada solo con sesión, preferencia y permiso; si no, se cancela. */
export async function ensureTaskRegistered(
  port: Pick<AlertsPort, 'hasSession' | 'readEnabled' | 'readPermission' | 'registerTask' | 'unregisterTask'>,
): Promise<void> {
  const session = await port.hasSession();
  const [enabled, permission] = [await port.readEnabled(), await port.readPermission()];
  if (session && shouldCheck(enabled, permission)) await port.registerTask();
  else await port.unregisterTask();
}

/** La app arrancó sin sesión: la preferencia es de la sesión anterior, así quien entre después empieza apagado. */
export async function cleanupWithoutSession(
  hasSession: boolean,
  port: Pick<AlertsPort, 'writeEnabled' | 'unregisterTask'>,
): Promise<void> {
  if (!hasSession) await disableDeviceAlerts(port);
}

/**
 * Guarda los umbrales del perfil. Si se enciende uno, primero se silencia lo ya cruzado: así una revisión que caiga
 * entre medio no avisa de algo que el usuario acaba de ver.
 */
export async function saveAlertThresholds(
  deps: { silence(): Promise<void>; save(thresholds: number[]): Promise<void> },
  thresholds: number[],
  turnedOn: boolean,
): Promise<void> {
  if (turnedOn) await deps.silence();
  await deps.save(thresholds);
}
