import { useState } from 'react';
import { Text, View } from 'react-native';
import { SectionHeader } from '@/components/SectionHeader';
import { SkewToggle } from '@/components/SkewToggle';
import { ALERT_THRESHOLDS, nextThresholds, type AlertThreshold } from '@/features/profile/alerts';
import { useProfile, useUpdateProfile } from '@/features/profile/hooks';
import { SAVE_ERROR } from '@/features/transactions/messages';
import { colors, fonts, typeScale } from '@/theme/tokens';

/**
 * Un interruptor por umbral. Mientras se guarda se muestra el valor enviado y ambos interruptores se desactivan:
 * así dos toques seguidos no se pisan (el siguiente valor sale de lo que se ve).
 */
export function AlertsSection() {
  const profile = useProfile();
  const update = useUpdateProfile();
  const [error, setError] = useState<string | null>(null);
  const pending = update.isPending ? update.variables?.alert_thresholds : undefined;
  const shown = pending ?? profile.data?.alertThresholds ?? [];
  const toggle = (threshold: AlertThreshold, on: boolean) => {
    setError(null);
    update.mutate({ alert_thresholds: nextThresholds(shown, threshold, on) }, { onError: () => setError(SAVE_ERROR) });
  };
  return (
    <View>
      <SectionHeader title="AVISOS DE PRESUPUESTO" />
      {ALERT_THRESHOLDS.map((threshold) => (
        <SkewToggle
          key={threshold}
          label={`Aviso al ${threshold} %`}
          value={shown.includes(threshold)}
          onChange={(on) => toggle(threshold, on)}
          disabled={!profile.data || update.isPending}
        />
      ))}
      <Text style={{ fontFamily: fonts.body, fontSize: typeScale.caption, color: colors.ash, marginTop: 4 }}>
        Los avisos llegarán cuando se active la sincronización de correos.
      </Text>
      {error ? (
        <Text accessibilityLiveRegion="polite" style={{ fontFamily: fonts.bodyStrong, fontSize: typeScale.caption, color: colors.signal, marginTop: 8 }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
