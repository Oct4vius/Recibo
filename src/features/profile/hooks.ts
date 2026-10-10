import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useUserId } from '@/features/auth/hooks';
import { DEFAULT_TIME_ZONE } from '@/lib/dates';
import { deviceTimeZone } from './device-time-zone';
import { fetchProfile, updateProfile, type ProfilePatch } from './api';
import { profileKeys } from './keys';

export function useProfile() {
  const userId = useUserId();
  return useQuery({ queryKey: profileKeys.me(userId), queryFn: () => fetchProfile(userId), staleTime: 5 * 60_000 });
}

/** Zona horaria del perfil (o la por defecto mientras carga). */
export function useTimeZone(): string {
  return useProfile().data?.timeZone ?? DEFAULT_TIME_ZONE;
}

/** Zona del teléfono; se vuelve a leer cada vez que la app pasa a primer plano (el usuario pudo cambiarla en Android). */
export function useDeviceTimeZone(): string {
  const [zone, setZone] = useState(deviceTimeZone);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setZone(deviceTimeZone());
    });
    return () => subscription.remove();
  }, []);
  return zone;
}

/** La zona y la tasa cambian fechas y totales de todas las pantallas: con ellas se invalida todo. */
const GLOBAL_FIELDS: readonly (keyof ProfilePatch)[] = ['timezone', 'usd_rate'];

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const userId = useUserId();
  return useMutation({
    mutationFn: (patch: ProfilePatch) => updateProfile(userId, patch),
    onSuccess: (_data, patch) =>
      GLOBAL_FIELDS.some((field) => field in patch)
        ? queryClient.invalidateQueries()
        : queryClient.invalidateQueries({ queryKey: profileKeys.all }),
  });
}
