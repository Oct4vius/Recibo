import { useState } from 'react';
import { Text, View } from 'react-native';
import { BackButton } from '@/components/BackButton';
import { PlaceholderRows } from '@/components/PlaceholderRows';
import { Screen } from '@/components/Screen';
import { SkewButton } from '@/components/SkewButton';
import { SkewRow } from '@/components/SkewRow';
import { colors, fonts, typeScale } from '@/theme/tokens';
import { useRules } from '../hooks';
import type { Rule } from '../mapping';
import { ruleSubtitle, ruleTitle } from '../presentation';
import { RuleSheet } from './RuleSheet';

const messageStyle = { fontFamily: fonts.body, fontSize: typeScale.body, color: colors.ash, marginVertical: 8 } as const;

/** Reglas de categoría: lista, "Nueva regla" y el resultado del último guardado bajo el título. */
export function RulesScreen() {
  const rules = useRules();
  const [editing, setEditing] = useState<Rule | 'new' | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const close = (message?: string) => {
    setEditing(null);
    if (message) setStatus(message);
  };
  return (
    <>
      <Screen title="REGLAS" backdrop={4} aboveTitle={<BackButton />}>
        {status ? (
          <Text accessibilityLiveRegion="polite" style={{ ...messageStyle, color: colors.paper, fontFamily: fonts.bodyStrong }}>
            {status}
          </Text>
        ) : null}
        {rules.isPending ? <PlaceholderRows count={3} /> : null}
        {rules.isError ? <Text style={{ ...messageStyle, color: colors.signal }}>No se pudieron cargar tus reglas.</Text> : null}
        {rules.isSuccess && rules.data.length === 0 ? (
          <Text style={messageStyle}>Aún no tienes reglas. Crea una aquí o desde un gasto con «Siempre poner…».</Text>
        ) : null}
        {(rules.data ?? []).map((rule) => (
          <SkewRow
            key={rule.id}
            title={ruleTitle(rule.pattern, rule.categoryName)}
            subtitle={ruleSubtitle(rule.matchField)}
            onPress={() => {
              setStatus(null);
              setEditing(rule);
            }}
          />
        ))}
        <View style={{ marginTop: 12 }}>
          <SkewButton
            label="Nueva regla"
            variant="ghost"
            onPress={() => {
              setStatus(null);
              setEditing('new');
            }}
          />
        </View>
      </Screen>
      <RuleSheet visible={editing !== null} rule={editing === 'new' ? null : editing} onClose={close} />
    </>
  );
}
