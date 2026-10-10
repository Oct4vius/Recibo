import { useState } from 'react';
import { View } from 'react-native';
import { OptionSheet } from '@/components/OptionSheet';
import { SkewChip } from '@/components/SkewChip';
import { useCategories, useRecentCategories } from '@/features/categories/hooks';

interface Props {
  value: string | null;
  onChange: (categoryId: string | null) => void;
}

/** Las 3 categorías usadas más recientemente + "Más…" (lista completa). Tocar la elegida la quita. */
export function CategoryPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const recent = useRecentCategories();
  const all = useCategories().data ?? [];
  const chosen = all.find((category) => category.id === value);
  // Si la elegida no está entre las recientes (p. ej. al editar), se muestra también.
  const chips = chosen && !recent.some((category) => category.id === chosen.id) ? [...recent, chosen] : recent;
  const options = all.map((category) => ({ value: category.id, label: category.name }));
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
      {chips.map((category) => (
        <SkewChip
          key={category.id}
          label={category.name}
          selected={category.id === value}
          onPress={() => onChange(category.id === value ? null : category.id)}
        />
      ))}
      <SkewChip label="Más…" onPress={() => setOpen(true)} />
      <OptionSheet
        visible={open}
        title="CATEGORÍA"
        options={options}
        selected={value}
        noneLabel="Sin categoría"
        onSelect={onChange}
        onClose={() => setOpen(false)}
      />
    </View>
  );
}
