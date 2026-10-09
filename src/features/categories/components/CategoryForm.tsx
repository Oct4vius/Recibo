import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { SkewButton } from '@/components/SkewButton';
import { SkewToggle } from '@/components/SkewToggle';
import { TextField } from '@/components/TextField';
import { SAVE_ERROR } from '@/features/transactions/messages';
import { colors, fonts, typeScale } from '@/theme/tokens';
import { useCategoryRuleCount, useDeleteCategory, useSaveCategory } from '../hooks';
import type { Category } from '../mapping';
import { categoryErrorMessage, categoryNameError, deleteCategoryPrompt, MAX_CATEGORY_NAME } from '../validation';

interface Props {
  /** null = categoría nueva. */
  category: Category | null;
  onDone: () => void;
}

/** Nombre, "Cuenta como gasto", Guardar y (al editar) Borrar con confirmación. */
export function CategoryForm({ category, onDone }: Props) {
  const [name, setName] = useState(category?.name ?? '');
  const [countsAsSpending, setCountsAsSpending] = useState(category?.countsAsSpending ?? true);
  const [error, setError] = useState<string | null>(null);
  const save = useSaveCategory();
  const remove = useDeleteCategory();
  const ruleCount = useCategoryRuleCount(category?.id ?? null);

  const submit = () => {
    const invalid = categoryNameError(name);
    if (invalid) {
      setError(invalid);
      return;
    }
    save.mutate(
      { id: category?.id, name, countsAsSpending },
      { onSuccess: onDone, onError: (e) => setError(categoryErrorMessage(e)) },
    );
  };
  const confirmDelete = (target: Category) => {
    const prompt = deleteCategoryPrompt(target.name, ruleCount.data ?? 0, target.countsAsSpending);
    Alert.alert(prompt.title, prompt.message, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: () => remove.mutate(target.id, { onSuccess: onDone, onError: () => setError(SAVE_ERROR) }),
      },
    ]);
  };

  return (
    <View>
      <TextField
        label="Nombre"
        value={name}
        onChangeText={(value) => {
          setName(value);
          setError(null);
        }}
        maxLength={MAX_CATEGORY_NAME}
        autoCapitalize="sentences"
      />
      <SkewToggle label="Cuenta como gasto" value={countsAsSpending} onChange={setCountsAsSpending} />
      <View style={{ marginTop: 16 }}>
        <SkewButton label="Guardar" onPress={submit} loading={save.isPending} />
      </View>
      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          style={{ fontFamily: fonts.bodyStrong, fontSize: typeScale.caption, color: colors.signal, marginTop: 8 }}
        >
          {error}
        </Text>
      ) : null}
      {category ? (
        <View style={{ marginTop: 12 }}>
          <SkewButton
            label="Borrar"
            variant="ghost"
            disabled={!ruleCount.isSuccess}
            loading={remove.isPending}
            onPress={() => confirmDelete(category)}
          />
        </View>
      ) : null}
    </View>
  );
}
