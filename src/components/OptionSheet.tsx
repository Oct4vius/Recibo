import { View } from 'react-native';
import { SkewChip } from './SkewChip';
import { SlamSheet } from './SlamSheet';

export interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  visible: boolean;
  title: string;
  options: readonly Option<T>[];
  selected: T | null;
  /** Si se pasa, agrega una opción "ninguna" (p. ej. "Todas") que selecciona `null`. */
  noneLabel?: string;
  onSelect: (value: T | null) => void;
  onClose: () => void;
}

/** Hoja para elegir una opción entre chips; se cierra al elegir. */
export function OptionSheet<T extends string>({ visible, title, options, selected, noneLabel, onSelect, onClose }: Props<T>) {
  const choose = (value: T | null) => {
    onSelect(value);
    onClose();
  };
  return (
    <SlamSheet visible={visible} onClose={onClose} title={title}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {noneLabel ? <SkewChip label={noneLabel} selected={selected === null} onPress={() => choose(null)} /> : null}
        {options.map((option) => (
          <SkewChip key={option.value} label={option.label} selected={selected === option.value} onPress={() => choose(option.value)} />
        ))}
      </View>
    </SlamSheet>
  );
}
