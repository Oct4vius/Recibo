import { useEffect, useState } from 'react';
import { Keyboard, Text, View } from 'react-native';
import { AmountDisplay } from '@/components/AmountDisplay';
import { AmountKeypad } from '@/components/AmountKeypad';
import { FieldLabel } from '@/components/FieldLabel';
import { SkewButton } from '@/components/SkewButton';
import { SkewChip } from '@/components/SkewChip';
import { TextField } from '@/components/TextField';
import { useProfile, useTimeZone } from '@/features/profile/hooks';
import { formatDayLabel, toLocalDate } from '@/lib/dates';
import { colors, fonts, typeScale } from '@/theme/tokens';
import { CURRENCIES } from '@/types/database';
import { pressKey, type AmountKey } from '../amount-input';
import { canSave, draftFromItem, draftToChanges, draftToNewExpense, emptyDraft, type ExpenseDraft } from '../expense-draft';
import { CURRENCY_LABELS } from '../filters';
import { useCreateExpense, useUpdateExpense } from '../hooks';
import type { TransactionListItem } from '../mapping';
import { AMOUNT_REQUIRED, SAVE_ERROR } from '../messages';
import { CategoryPicker } from './CategoryPicker';
import { ExpenseActions } from './ExpenseActions';
import { ExpenseDateChips } from './ExpenseDateChips';

interface Props {
  /** Sin `item` crea un gasto manual; con `item` lo edita. */
  item?: TransactionListItem;
  onDone: () => void;
}

/** Panel de gasto en el orden del mockup: monto, moneda, comercio, categoría, fecha, teclado y "Guardar". */
export function ExpenseForm({ item, onDone }: Props) {
  const timeZone = useTimeZone();
  const primaryCurrency = useProfile().data?.primaryCurrency ?? 'DOP';
  const [original] = useState<ExpenseDraft>(() =>
    item ? draftFromItem(item, new Date(), timeZone) : emptyDraft(primaryCurrency),
  );
  const [draft, setDraft] = useState<ExpenseDraft>(original);
  const [typingMerchant, setTypingMerchant] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  // La moneda y la fecha de un movimiento importado por correo son datos del banco: no se editan.
  const bankData = item !== undefined && item.source !== 'manual';
  const ready = canSave(draft);

  // El botón Atrás de Android oculta el teclado sin quitar el foco del campo: sin esto el teclado propio no vuelve.
  useEffect(() => {
    const subscription = Keyboard.addListener('keyboardDidHide', () => setTypingMerchant(false));
    return () => subscription.remove();
  }, []);

  const change = <K extends keyof ExpenseDraft>(key: K, value: ExpenseDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setError(null);
  };
  const onKey = (key: AmountKey) => {
    setDraft((current) => ({ ...current, amountText: pressKey(current.amountText, key) }));
    setError(null);
  };
  const save = () => {
    const now = new Date();
    const callbacks = { onSuccess: onDone, onError: () => setError(SAVE_ERROR) };
    if (item) {
      updateExpense.mutate({ id: item.id, changes: draftToChanges(draft, original, item.source, now, timeZone) }, callbacks);
    } else {
      createExpense.mutate(draftToNewExpense(draft, now, timeZone), callbacks);
    }
  };

  return (
    <View>
      <AmountDisplay
        text={draft.amountText}
        currency={draft.currency}
        active={!typingMerchant}
        onPress={() => Keyboard.dismiss()}
      />
      {bankData ? null : (
        <>
          <FieldLabel text="Moneda" />
          <View style={{ flexDirection: 'row', marginBottom: 12 }}>
            {CURRENCIES.map((currency) => (
              <SkewChip
                key={currency}
                label={CURRENCY_LABELS[currency]}
                selected={draft.currency === currency}
                onPress={() => change('currency', currency)}
              />
            ))}
          </View>
        </>
      )}
      <TextField
        label="Comercio o descripción"
        value={draft.merchant}
        onChangeText={(merchant) => change('merchant', merchant)}
        maxLength={80}
        autoCapitalize="sentences"
        returnKeyType="done"
        onFocus={() => setTypingMerchant(true)}
        onBlur={() => setTypingMerchant(false)}
      />
      <FieldLabel text="Categoría" />
      <CategoryPicker value={draft.categoryId} onChange={(categoryId) => change('categoryId', categoryId)} />
      <FieldLabel text="Fecha" />
      {item && bankData ? (
        <Text style={{ fontFamily: fonts.body, fontSize: typeScale.body, color: colors.paper, marginBottom: 12 }}>
          {formatDayLabel(toLocalDate(new Date(item.occurredAt), timeZone))} · fecha del banco
        </Text>
      ) : (
        <ExpenseDateChips value={draft.date} onChange={(date) => change('date', date)} />
      )}
      {typingMerchant ? null : <AmountKeypad onKey={onKey} />}
      <View style={{ marginTop: 16 }}>
        <SkewButton
          label="Guardar"
          onPress={save}
          disabled={!ready}
          loading={createExpense.isPending || updateExpense.isPending}
          accessibilityHint={ready ? undefined : AMOUNT_REQUIRED}
        />
      </View>
      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          style={{ fontFamily: fonts.bodyStrong, fontSize: typeScale.caption, color: colors.signal, marginTop: 8 }}
        >
          {error}
        </Text>
      ) : null}
      {item ? <ExpenseActions item={item} onDone={onDone} onError={setError} /> : null}
    </View>
  );
}
