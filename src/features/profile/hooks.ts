import { useQuery } from '@tanstack/react-query';
import { useUserId } from '@/features/auth/hooks';
import { DEFAULT_TIME_ZONE } from '@/lib/dates';
import { fetchProfile } from './api';
import { profileKeys } from './keys';

export function useProfile() {
  const userId = useUserId();
  return useQuery({ queryKey: profileKeys.me(userId), queryFn: () => fetchProfile(userId), staleTime: 5 * 60_000 });
}

/** Zona horaria del perfil (o la por defecto mientras carga). */
export function useTimeZone(): string {
  return useProfile().data?.timeZone ?? DEFAULT_TIME_ZONE;
}
