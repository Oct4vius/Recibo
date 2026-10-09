import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { FieldLabel } from '@/components/FieldLabel';
import { SkewButton } from '@/components/SkewButton';
import { SkewChip } from '@/components/SkewChip';
import { TextField } from '@/components/TextField';
import { CategoryPicker } from '@/features/transactions/components/CategoryPicker';
import { SAVE_ERROR } from '@/features/transactions/messages';
import { colors, fonts, typeScale } from '@/theme/tokens';
import { useDeleteRule, useSaveRule } from '../hooks';
import type { Rule } from '../mapping';
import {
  appliedRuleText,
  MATCH_FIELD_LABELS,
  MAX_RULE_PATTERN,
  ruleErrorMessage,
  rulePatternError,
  type MatchField,
} from '../presentation';

const MATCH_FIELDS: readonly MatchField[] = ['merchant', 'counterparty_last4'];

interface Props {
  /** null = regla nueva. */
  rule: Rule | null;
  /** `message`: qué se guardó (p. ej. "Regla guardada · se aplicó a 4 movimientos"). */
  onDone: (message?: string) => void;
}

/** Campo (comercio o cuenta destino), texto, categoría, Guardar y (al editar) Borrar. */
export function RuleForm({ rule, onDone }: Props) {
  const [matchField, setMatchField] = useState<MatchField>(rule?.matchField ?? 'merchant');
  const [pattern, setPattern] = useState(rule?.pattern ?? '');
  const [categoryId, setCategoryId] = useState<string | null>(rule?.categoryId ?? null);
  const [error, setError] = useState<string | null>(null);
  const save = useSaveRule();
  const remove = useDeleteRule();
  const account = matchField === 'counterparty_last4';

  const submit = () => {
    const invalid = rulePatternError(matchField, pattern);
    if (invalid || !categoryId) {
      setError(invalid ?? 'Elige una categoría.');
      return;
    }
    save.mutate(
      { id: rule?.id, matchField, pattern, categoryId },
      { onSuccess: (result) => onDone(appliedRuleText(result.appliedCount)), onError: (e) => setError(ruleErrorMessage(e)) },
    );
  };
  const confirmDelete = (target: Rule) =>
    Alert.alert('¿Borrar esta regla?', 'Los movimientos ya categorizados no cambian.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: () => remove.mutate(target.id, { onSuccess: () => onDone(), onError: () => setError(SAVE_ERROR) }),
      },
    ]);

  return (
    <View>
      <FieldLabel text="Buscar en" />
      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
        {MATCH_FIELDS.map((field) => (
          <SkewChip
            key={field}
            label={MATCH_FIELD_LABELS[field]}
            selected={matchField === field}
            onPress={() => {
              setMatchField(field);
              setError(null);
            }}
          />
        ))}
      </View>
      <TextField
        label={account ? 'Últimos 4 dígitos de la cuenta' : 'Texto del comercio'}
        value={pattern}
        onChangeText={(value) => {
          setPattern(value);
          setError(null);
        }}
        keyboardType={account ? 'number-pad' : 'default'}
        maxLength={account ? 4 : MAX_RULE_PATTERN}
        autoCapitalize={account ? 'none' : 'characters'}
      />
      <FieldLabel text="Categoría" />
      <CategoryPicker value={categoryId} onChange={setCategoryId} />
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
      {rule ? (
        <View style={{ marginTop: 12 }}>
          <SkewButton label="Borrar" variant="ghost" loading={remove.isPending} onPress={() => confirmDelete(rule)} />
        </View>
      ) : null}
    </View>
  );
}
