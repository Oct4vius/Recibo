import { useState } from 'react';
import { Text, View } from 'react-native';
import { BackButton } from '@/components/BackButton';
import { PlaceholderRows } from '@/components/PlaceholderRows';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { SkewButton } from '@/components/SkewButton';
import { SkewRow } from '@/components/SkewRow';
import { colors, fonts, typeScale } from '@/theme/tokens';
import { useCategories } from '../hooks';
import type { Category } from '../mapping';
import { CategorySheet } from './CategorySheet';

const NOT_SPENDING = 'No cuenta como gasto';
const messageStyle = { fontFamily: fonts.body, fontSize: typeScale.body, color: colors.ash, marginVertical: 8 } as const;

/** Categorías propias (editables) y las 13 por defecto (solo lectura). */
export function CategoriesScreen() {
  const categories = useCategories();
  const [editing, setEditing] = useState<Category | 'new' | null>(null);
  const all = categories.data ?? [];
  const own = all.filter((category) => category.isOwn);
  const defaults = all.filter((category) => !category.isOwn);
  const subtitle = (category: Category) => (category.countsAsSpending ? undefined : NOT_SPENDING);
  return (
    <>
      <Screen title="CATEGORÍAS" backdrop={4} aboveTitle={<BackButton />}>
        {categories.isPending ? <PlaceholderRows count={4} /> : null}
        {categories.isError ? (
          <Text style={{ ...messageStyle, color: colors.signal }}>No se pudieron cargar tus categorías.</Text>
        ) : null}
        {categories.isSuccess ? (
          <>
            <SectionHeader title="TUYAS" />
            {own.length === 0 ? <Text style={messageStyle}>Aún no tienes categorías propias.</Text> : null}
            {own.map((category) => (
              <SkewRow key={category.id} title={category.name} subtitle={subtitle(category)} onPress={() => setEditing(category)} />
            ))}
            <View style={{ marginTop: 12 }}>
              <SkewButton label="Nueva categoría" variant="ghost" onPress={() => setEditing('new')} />
            </View>
            <SectionHeader title="POR DEFECTO" />
            {defaults.map((category) => (
              <SkewRow key={category.id} title={category.name} subtitle={subtitle(category)} />
            ))}
          </>
        ) : null}
      </Screen>
      <CategorySheet visible={editing !== null} category={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
    </>
  );
}
