export type PermissionState = 'granted' | 'denied' | 'undetermined';

export interface DeviceAlertsView {
  on: boolean;
  blocked: boolean;
}

/** Lo que muestra el interruptor: encendido solo con preferencia y permiso; bloqueado si Android lo negó. */
export function deviceAlertsView(enabled: boolean, permission: PermissionState): DeviceAlertsView {
  return { on: enabled && permission === 'granted', blocked: permission === 'denied' };
}

/** Única condición para reclamar avisos: sin ella otro teléfono del mismo usuario perdería el suyo. */
export function shouldCheck(enabled: boolean, permission: PermissionState): boolean {
  return enabled && permission === 'granted';
}

/**
 * Android 13+ informa `denied` antes de la primera solicitud. Solo cuenta como rechazo si ya se pidió el permiso
 * desde esta app (no se usa `canAskAgain` solo: tampoco distingue ese caso).
 */
export function resolvePermission(raw: PermissionState, asked: boolean): PermissionState {
  return raw === 'denied' && !asked ? 'undetermined' : raw;
}
