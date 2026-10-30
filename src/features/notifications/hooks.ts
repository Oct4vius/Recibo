import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { disableDeviceAlerts, enableDeviceAlerts } from './flows';
import { notificationKeys } from './keys';
import { nativePort } from './native-port';
import type { PermissionState } from './state';

interface DeviceAlertsState {
  enabled: boolean;
  permission: PermissionState;
}

/** Preferencia y permiso de este teléfono; se vuelven a leer al volver a la app (el usuario pudo tocar la configuración de Android). */
export function useDeviceAlerts() {
  const queryClient = useQueryClient();
  const query = useQuery<DeviceAlertsState>({
    queryKey: notificationKeys.device(),
    queryFn: async () => ({ enabled: await nativePort.readEnabled(), permission: await nativePort.readPermission() }),
    staleTime: 0,
  });
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void queryClient.invalidateQueries({ queryKey: notificationKeys.device() });
    });
    return () => subscription.remove();
  }, [queryClient]);
  return query;
}

export function useToggleDeviceAlerts() {
  const queryClient = useQueryClient();
  return useMutation<PermissionState | void, Error, boolean>({
    mutationFn: (on) => (on ? enableDeviceAlerts(nativePort) : disableDeviceAlerts(nativePort)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}
