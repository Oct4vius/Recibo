import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { checkBudgetAlerts, ensureTaskRegistered } from '../flows';
import { nativePort } from '../native-port';
import { isBudgetAlertData } from '../text';

/** Con sesión iniciada: asegura la tarea, revisa avisos al abrir o volver a la app y lleva a Inicio al tocar un aviso. */
export function BudgetAlertsBootstrap() {
  const router = useRouter();
  useEffect(() => {
    let running = false;
    const run = () => {
      if (running) return;
      running = true;
      // Independientes: si falla el registro de la tarea, la revisión de avisos igual corre (y al revés).
      Promise.allSettled([ensureTaskRegistered(nativePort), checkBudgetAlerts(nativePort)]).finally(() => {
        running = false;
      });
    };
    run();
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') run();
    });
    // En arranque en frío la ruta inicial ya es Inicio; esto cubre la app abierta en otra pestaña.
    const tap = Notifications.addNotificationResponseReceivedListener((response) => {
      if (isBudgetAlertData(response.notification.request.content.data)) router.navigate('/');
    });
    return () => {
      appState.remove();
      tap.remove();
    };
  }, [router]);
  return null;
}
