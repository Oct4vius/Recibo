import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundTask from 'expo-background-task';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Linking } from 'react-native';
import { supabase } from '@/lib/supabase';
import { claimBudgetAlerts, silenceBudgetAlerts } from './api';
import type { AlertsPort } from './flows';
import type { PermissionState } from './state';
import { BUDGET_ALERTS_TASK, BUDGET_CHANNEL_ID } from './task-name';
import { budgetAlertContent } from './text';

/** Preferencia por teléfono: '1' encendida, sin clave apagada. */
const PREFERENCE_KEY = 'recibo:device-alerts';
/** Mínimo que admite Android (WorkManager), en minutos. */
const TASK_INTERVAL_MINUTES = 15;

function toPermissionState(status: Notifications.PermissionStatus): PermissionState {
  if (status === Notifications.PermissionStatus.GRANTED) return 'granted';
  if (status === Notifications.PermissionStatus.DENIED) return 'denied';
  return 'undetermined';
}

function ensureChannel(): Promise<unknown> {
  return Notifications.setNotificationChannelAsync(BUDGET_CHANNEL_ID, {
    name: 'Presupuesto',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/** Implementación nativa del puerto: AsyncStorage, expo-notifications, expo-background-task y las RPC. */
export const nativePort: AlertsPort = {
  // getSession refresca un token vencido aunque el auto-refresh esté parado en segundo plano.
  async hasSession() {
    const { data, error } = await supabase.auth.getSession();
    return error === null && data.session !== null;
  },
  async readEnabled() {
    return (await AsyncStorage.getItem(PREFERENCE_KEY)) === '1';
  },
  async writeEnabled(on) {
    if (on) await AsyncStorage.setItem(PREFERENCE_KEY, '1');
    else await AsyncStorage.removeItem(PREFERENCE_KEY);
  },
  async readPermission() {
    return toPermissionState((await Notifications.getPermissionsAsync()).status);
  },
  async requestPermission() {
    // Android 13+: el canal debe existir antes de pedir el permiso.
    await ensureChannel();
    return toPermissionState((await Notifications.requestPermissionsAsync()).status);
  },
  claim: claimBudgetAlerts,
  silence: silenceBudgetAlerts,
  async present(alert) {
    await ensureChannel();
    // Mismo identificador por período: el aviso del 100 % reemplaza al del 80 % en la bandeja.
    await Notifications.scheduleNotificationAsync({
      identifier: `budget-${alert.period}`,
      content: budgetAlertContent(alert),
      trigger: { channelId: BUDGET_CHANNEL_ID },
    });
  },
  async registerTask() {
    if (await TaskManager.isTaskRegisteredAsync(BUDGET_ALERTS_TASK)) return;
    await BackgroundTask.registerTaskAsync(BUDGET_ALERTS_TASK, { minimumInterval: TASK_INTERVAL_MINUTES });
  },
  async unregisterTask() {
    if (!(await TaskManager.isTaskRegisteredAsync(BUDGET_ALERTS_TASK))) return;
    await BackgroundTask.unregisterTaskAsync(BUDGET_ALERTS_TASK);
  },
};

export function openNotificationSettings(): Promise<void> {
  return Linking.openSettings();
}
