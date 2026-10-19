import * as BackgroundTask from 'expo-background-task';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { checkBudgetAlerts } from './flows';
import { nativePort } from './native-port';
import { BUDGET_ALERTS_TASK } from './task-name';

// Módulo de efecto: se importa desde index.ts, en el ámbito global, antes de que Android despierte la app sin interfaz.
TaskManager.defineTask(BUDGET_ALERTS_TASK, async () => {
  try {
    await checkBudgetAlerts(nativePort);
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

// Con la app abierta el aviso también se muestra (en Android, sin sonido no sale el banner).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
