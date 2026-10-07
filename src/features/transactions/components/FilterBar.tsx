import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { OptionSheet, type Option } from '@/components/OptionSheet';
import { SkewChip } from '@/components/SkewChip';
import { useCategories } from '@/features/categories/hooks';
import { colors, fonts, typeScale } from '@/theme/tokens';
import type { BankCode, Currency } from '@/types/database';
import { BANK_LABELS, countLabel, CURRENCY_LABELS, PERIOD_LABELS, type Period, type TransactionFilters } from '../filters';

const PERIODS: readonly Period[] = ['week', 'month', 'all'];
const CURRENCIES: readonly Currency[] = ['DOP', 'USD'];
const BANKS: readonly BankCode[] = ['bhd', 'banreservas', 'popular', 'apap'];
const CURRENCY_OPTIONS: readonly Option<Currency>[] = CURRENCIES.map((value) => ({ value, label: CURRENCY_LABELS[value] }));
const BANK_OPTIONS: readonly Option<BankCode>[] = BANKS.map((value) => ({ value, label: BANK_LABELS[value] }));

type SheetName = 'category' | 'currency' | 'bank';

interface Props {
  filters: TransactionFilters;
  onChange: (filters: TransactionFilters) => void;
  /** Total de movimientos que cumplen los filtros; null mientras carga. */
  count: number | null;
}

/** Chips de período, filtros que abren una hoja de opciones, "Revisar" y el conteo total. */
export function FilterBar({ filters, onChange, count }: Props) {
  const [sheet, setSheet] = useState<SheetName | null>(null);
  const categories = useCategories().data ?? [];
  const categoryOptions = categories.map((category) => ({ value: category.id, label: category.name }));
  const categoryName = categories.find((category) => category.id === filters.categoryId)?.name;
  const close = () => setSheet(null);
  return (
    <View style={{ marginBottom: 12 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {PERIODS.map((period) => (
          <SkewChip
            key={period}
            label={PERIOD_LABELS[period]}
            selected={filters.period === period}
            onPress={() => onChange({ ...filters, period })}
          />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <SkewChip label={categoryName ?? 'Categoría'} selected={filters.categoryId !== null} onPress={() => setSheet('category')} />
        <SkewChip
          label={filters.currency ? CURRENCY_LABELS[filters.currency] : 'Moneda'}
          selected={filters.currency !== null}
          onPress={() => setSheet('currency')}
        />
        <SkewChip
          label={filters.bankCode ? BANK_LABELS[filters.bankCode] : 'Banco'}
          selected={filters.bankCode !== null}
          onPress={() => setSheet('bank')}
        />
        <SkewChip label="Revisar" selected={filters.review} onPress={() => onChange({ ...filters, review: !filters.review })} />
      </ScrollView>
      {count !== null ? (
        <Text
          accessibilityLiveRegion="polite"
          style={{ fontFamily: fonts.bodyStrong, fontSize: typeScale.caption, color: colors.ash, marginTop: 8 }}
        >
          {countLabel(count)}
        </Text>
      ) : null}
      <OptionSheet
        visible={sheet === 'category'}
        title="CATEGORÍA"
        options={categoryOptions}
        selected={filters.categoryId}
        noneLabel="Todas"
        onSelect={(categoryId) => onChange({ ...filters, categoryId })}
        onClose={close}
      />
      <OptionSheet
        visible={sheet === 'currency'}
        title="MONEDA"
        options={CURRENCY_OPTIONS}
        selected={filters.currency}
        noneLabel="Todas"
        onSelect={(currency) => onChange({ ...filters, currency })}
        onClose={close}
      />
      <OptionSheet
        visible={sheet === 'bank'}
        title="BANCO"
        options={BANK_OPTIONS}
        selected={filters.bankCode}
        noneLabel="Todos"
        onSelect={(bankCode) => onChange({ ...filters, bankCode })}
        onClose={close}
      />
    </View>
  );
}
