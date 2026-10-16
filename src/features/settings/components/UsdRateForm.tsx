import { useState } from 'react';
import { Text } from 'react-native';
import { AmountForm } from '@/components/AmountForm';
import { useUpdateProfile } from '@/features/profile/hooks';
import { SAVE_ERROR } from '@/features/transactions/messages';
import { toCents } from '@/lib/money';
import { colors, fonts, typeScale } from '@/theme/tokens';

/** Pesos por dólar con el teclado propio (centavos enteros). Es la tasa de respaldo: la del BCRD tiene prioridad. */
export function UsdRateForm({ rate, onDone }: { rate: number; onDone: () => void }) {
  const update = useUpdateProfile();
  const [error, setError] = useState<string | null>(null);
  return (
    <AmountForm
      currency="DOP"
      initialCents={toCents(rate)}
      saving={update.isPending}
      error={error}
      onSave={(cents) => {
        setError(null);
        update.mutate({ usd_rate: cents / 100 }, { onSuccess: onDone, onError: () => setError(SAVE_ERROR) });
      }}
    >
      <Text style={{ fontFamily: fonts.body, fontSize: typeScale.body, color: colors.ash, marginBottom: 8 }}>
        Pesos por cada US$ 1. Solo se usa si no hay ninguna tasa del BCRD para la fecha del gasto.
      </Text>
    </AmountForm>
  );
}
