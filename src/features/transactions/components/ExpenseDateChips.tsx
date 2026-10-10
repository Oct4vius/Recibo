import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { View } from 'react-native';
import { SkewChip } from '@/components/SkewChip';
import { formatDayLabel, localDate } from '@/lib/dates';
import type { DateChoice } from '../expense-date';

interface Props {
  value: DateChoice;
  onChange: (choice: DateChoice) => void;
}

/** Hoy / Ayer / Otro día. "Otro día" abre el calendario nativo de Android, sin días futuros. */
export function ExpenseDateChips({ value, onChange }: Props) {
  const openCalendar = () => {
    const initial = value.kind === 'other' ? new Date(value.date.year, value.date.month - 1, value.date.day) : new Date();
    DateTimePickerAndroid.open({
      value: initial,
      mode: 'date',
      maximumDate: new Date(),
      onValueChange: (_event, date) => {
        // El calendario devuelve el día elegido en la hora del dispositivo: se leen sus componentes locales.
        if (date) onChange({ kind: 'other', date: localDate(date.getFullYear(), date.getMonth() + 1, date.getDate()) });
      },
    });
  };
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
      <SkewChip label="Hoy" selected={value.kind === 'today'} onPress={() => onChange({ kind: 'today' })} />
      <SkewChip label="Ayer" selected={value.kind === 'yesterday'} onPress={() => onChange({ kind: 'yesterday' })} />
      <SkewChip
        label={value.kind === 'other' ? formatDayLabel(value.date) : 'Otro día'}
        selected={value.kind === 'other'}
        onPress={openCalendar}
      />
    </View>
  );
}
