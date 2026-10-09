import { useState } from 'react';
import { Text, View } from 'react-native';
import { FieldLabel } from '@/components/FieldLabel';
import { SectionHeader } from '@/components/SectionHeader';
import { SkewChip } from '@/components/SkewChip';
import { SkewRow } from '@/components/SkewRow';
import { useProfile, useUpdateProfile } from '@/features/profile/hooks';
import { usdRateText } from '@/features/profile/rate';
import { CURRENCY_LABELS } from '@/features/transactions/filters';
import { SAVE_ERROR } from '@/features/transactions/messages';
import { colors, fonts, typeScale } from '@/theme/tokens';
import { CURRENCIES } from '@/types/database';
import { UsdRateSheet } from './UsdRateSheet';

/** Moneda por defecto de un gasto nuevo (los totales siempre van en pesos) y tasa del dólar. */
export function MoneySection() {
  const profile = useProfile();
  const update = useUpdateProfile();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shown = (update.isPending ? update.variables?.primary_currency : undefined) ?? profile.data?.primaryCurrency;
  return (
    <View>
      <SectionHeader title="DINERO" />
      <FieldLabel text="Moneda por defecto al agregar un gasto" />
      <View style={{ flexDirection: 'row', marginBottom: 8 }}>
        {CURRENCIES.map((currency) => (
          <SkewChip
            key={currency}
            label={CURRENCY_LABELS[currency]}
            selected={shown === currency}
            onPress={() => {
              if (update.isPending || shown === currency) return;
              setError(null);
              update.mutate({ primary_currency: currency }, { onError: () => setError(SAVE_ERROR) });
            }}
          />
        ))}
      </View>
      {profile.data ? (
        <SkewRow title="Tasa del dólar" subtitle={usdRateText(profile.data.usdRate)} onPress={() => setOpen(true)} />
      ) : null}
      {error ? (
        <Text accessibilityLiveRegion="polite" style={{ fontFamily: fonts.bodyStrong, fontSize: typeScale.caption, color: colors.signal, marginTop: 8 }}>
          {error}
        </Text>
      ) : null}
      <UsdRateSheet visible={open} rate={profile.data?.usdRate ?? 0} onClose={() => setOpen(false)} />
    </View>
  );
}
