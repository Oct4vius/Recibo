import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { claimBudgetAlerts, silenceBudgetAlerts } from '@/features/notifications/api';
import type { AlertsPort } from '@/features/notifications/flows';
import type { PermissionState } from '@/features/notifications/state';
import { budgetAlertContent } from '@/features/notifications/text';
import { supabase } from '@/lib/supabase';
import { createAlertPreference } from './alert-preference';

const preference = createAlertPreference(window.localStorage);

/** Windows no distingue "no pedido" de "negado" en `isPermissionGranted`: sin permiso se trata como bloqueado. */
async function readPermission(): Promise<PermissionState> {
  return (await isPermissionGranted()) ? 'granted' : 'denied';
}

/** Implementación de escritorio del puerto: localStorage, avisos de Windows y las mismas RPC del teléfono. */
export const desktopPort: AlertsPort = {
  async hasSession() {
    const { data, error } = await supabase.auth.getSession();
    return error === null && data.session !== null;
  },
  readEnabled: preference.read,
  writeEnabled: preference.write,
  readPermission,
  async requestPermission() {
    if (await isPermissionGranted()) return 'granted';
    const result = await requestPermission();
    if (result === 'granted') return 'granted';
    return result === 'denied' ? 'denied' : 'undetermined';
  },
  claim: claimBudgetAlerts,
  silence: silenceBudgetAlerts,
  async present(alert) {
    const { title, body } = budgetAlertContent(alert);
    sendNotification({ title, body });
  },
  // El pulso de 15 min vive en Rust (`alerts-tick`): no hay tarea que registrar.
  async registerTask() {},
  async unregisterTask() {},
  async dismissAll() {},
};
