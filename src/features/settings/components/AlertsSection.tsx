import { useState } from 'react';
import { Text, View } from 'react-native';
import { SectionHeader } from '@/components/SectionHeader';
import { SkewToggle } from '@/components/SkewToggle';
import { DeviceAlertsBlocked } from '@/features/notifications/components/DeviceAlertsBlocked';
import { useDeviceAlerts, useToggleDeviceAlerts, useUpdateAlertThresholds } from '@/features/notifications/hooks';
import { openNotificationSettings } from '@/features/notifications/native-port';
import { deviceAlertsView } from '@/features/notifications/state';
import { ALERT_THRESHOLDS, nextThresholds, type AlertThreshold } from '@/features/profile/alerts';
import { useProfile } from '@/features/profile/hooks';
import { SAVE_ERROR } from '@/features/transactions/messages';
import { colors, fonts, typeScale } from '@/theme/tokens';

/**
 * Interruptor de avisos de este teléfono y un interruptor por umbral. Mientras se guarda se muestra el valor enviado
 * y los interruptores se desactivan: así dos toques seguidos no se pisan (el siguiente valor sale de lo que se ve).
 */
export function AlertsSection() {
  const profile = useProfile();
  const update = useUpdateAlertThresholds();
  const device = useDeviceAlerts();
  const toggleDevice = useToggleDeviceAlerts();
  const [error, setError] = useState<string | null>(null);
  const pending = update.isPending ? update.variables.thresholds : undefined;
  const shown = pending ?? profile.data?.alertThresholds ?? [];
  const view = device.data ? deviceAlertsView(device.data.enabled, device.data.permission) : null;
  const deviceOn = toggleDevice.isPending ? toggleDevice.variables : (view?.on ?? false);
  const busy = update.isPending || toggleDevice.isPending;
  const toggleThreshold = (threshold: AlertThreshold, on: boolean) => {
    setError(null);
    update.mutate({ thresholds: nextThresholds(shown, threshold, on), turnedOn: on }, { onError: () => setError(SAVE_ERROR) });
  };
  const changeDevice = (on: boolean) => {
    setError(null);
    toggleDevice.mutate(on, { onError: () => setError(SAVE_ERROR) });
  };
  return (
    <View>
      <SectionHeader title="AVISOS DE PRESUPUESTO" />
      <SkewToggle label="Avisos en este teléfono" value={deviceOn} onChange={changeDevice} disabled={!view || busy} />
      {view?.blocked && !toggleDevice.isPending ? <DeviceAlertsBlocked onOpenSettings={() => void openNotificationSettings()} /> : null}
      {ALERT_THRESHOLDS.map((threshold) => (
        <SkewToggle
          key={threshold}
          label={`Aviso al ${threshold} %`}
          value={shown.includes(threshold)}
          onChange={(on) => toggleThreshold(threshold, on)}
          disabled={!profile.data || busy}
        />
      ))}
      <Text style={{ fontFamily: fonts.body, fontSize: typeScale.caption, color: colors.ash, marginTop: 4 }}>
        Pueden tardar unos minutos en llegar.
      </Text>
      {error ? (
        <Text accessibilityLiveRegion="polite" style={{ fontFamily: fonts.bodyStrong, fontSize: typeScale.caption, color: colors.signal, marginTop: 8 }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
