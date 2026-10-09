import { useState } from 'react';
import { Text, View } from 'react-native';
import { PlaceholderRows } from '@/components/PlaceholderRows';
import { SectionHeader } from '@/components/SectionHeader';
import { SkewButton } from '@/components/SkewButton';
import { SkewRow } from '@/components/SkewRow';
import { deviceTimeZone } from '@/features/profile/device-time-zone';
import { useProfile, useUpdateProfile } from '@/features/profile/hooks';
import { timeZoneCity, timeZoneLabel } from '@/features/profile/time-zone';
import { SAVE_ERROR } from '@/features/transactions/messages';
import { colors, fonts, typeScale } from '@/theme/tokens';

/** Zona guardada y, si el teléfono está en otra, el botón para usarla. Una zona rechazada (22023) es un error de guardado. */
export function TimeZoneSection() {
  const profile = useProfile();
  const update = useUpdateProfile();
  // Se relee en cada render (barato): la pestaña sigue montada y el teléfono puede cambiar de zona.
  const device = deviceTimeZone();
  const [error, setError] = useState<string | null>(null);
  const current = profile.data?.timeZone;
  return (
    <View>
      <SectionHeader title="ZONA HORARIA" />
      {current ? <SkewRow title={timeZoneLabel(current, new Date())} /> : <PlaceholderRows count={1} />}
      {current && device !== current ? (
        <View style={{ marginTop: 8 }}>
          <SkewButton
            label={`Usar la de este teléfono (${timeZoneCity(device)})`}
            variant="ghost"
            loading={update.isPending}
            onPress={() => {
              setError(null);
              update.mutate({ timezone: device }, { onError: () => setError(SAVE_ERROR) });
            }}
          />
        </View>
      ) : null}
      {error ? (
        <Text accessibilityLiveRegion="polite" style={{ fontFamily: fonts.bodyStrong, fontSize: typeScale.caption, color: colors.signal, marginTop: 8 }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
