import { useState } from 'react';
import { Alert, View } from 'react-native';
import { AmountForm } from '@/components/AmountForm';
import { SkewButton } from '@/components/SkewButton';
import { SAVE_ERROR } from '@/features/transactions/messages';
import { toCents } from '@/lib/money';
import type { BudgetPeriod } from '@/types/database';
import { useActiveBudgets, useRemoveBudget, useSaveBudget } from '../hooks';
import { removeBudgetPrompt } from '../text';

/** Límite en pesos con el teclado propio; "Quitar presupuesto" si ya existe. */
export function BudgetLimitForm({ period, onDone }: { period: BudgetPeriod; onDone: () => void }) {
  const budgets = useActiveBudgets();
  const save = useSaveBudget();
  const remove = useRemoveBudget();
  const [error, setError] = useState<string | null>(null);
  const limit = budgets.data?.[period] ?? null;
  const confirmRemove = () => {
    const prompt = removeBudgetPrompt(period);
    Alert.alert(prompt.title, prompt.message, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Quitar', style: 'destructive', onPress: () => remove.mutate(period, { onSuccess: onDone, onError: () => setError(SAVE_ERROR) }) },
    ]);
  };
  return (
    <View>
      <AmountForm
        key={String(limit)}
        currency="DOP"
        initialCents={limit === null ? 0 : toCents(limit)}
        saving={save.isPending}
        error={error}
        onSave={(cents) => {
          setError(null);
          save.mutate({ period, limitCents: cents }, { onSuccess: onDone, onError: () => setError(SAVE_ERROR) });
        }}
      />
      {limit !== null ? (
        <View style={{ marginTop: 12 }}>
          <SkewButton label="Quitar presupuesto" variant="ghost" loading={remove.isPending} onPress={confirmRemove} />
        </View>
      ) : null}
    </View>
  );
}
