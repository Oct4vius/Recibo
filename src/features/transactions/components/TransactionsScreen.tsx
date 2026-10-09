import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, Text, type ListRenderItem } from 'react-native';
import { AddFab } from '@/components/AddFab';
import { ListScreen } from '@/components/ListScreen';
import { PlaceholderRows } from '@/components/PlaceholderRows';
import { SectionHeader } from '@/components/SectionHeader';
import { useTimeZone } from '@/features/profile/hooks';
import { colors, fonts, typeScale } from '@/theme/tokens';
import { DEFAULT_FILTERS, emptyMessage, type TransactionFilters } from '../filters';
import { groupByDay, type ListEntry } from '../grouping';
import { useExpenseSheet, useTransactionList } from '../hooks';
import type { TransactionListItem } from '../mapping';
import { LOAD_TRANSACTIONS_ERROR } from '../messages';
import { ExpenseSheet } from './ExpenseSheet';
import { FilterBar } from './FilterBar';
import { TransactionRow } from './TransactionRow';

type Entry = ListEntry<TransactionListItem>;

/** Movimientos: lista paginada agrupada por día, filtros, "tirar para actualizar" y botón "+". */
export function TransactionsScreen() {
  const [filters, setFilters] = useState<TransactionFilters>(DEFAULT_FILTERS);
  const [pulling, setPulling] = useState(false);
  const timeZone = useTimeZone();
  const list = useTransactionList(filters);
  const { openNew, openEdit, sheet } = useExpenseSheet();

  const entries = useMemo(
    () => groupByDay(list.data?.pages.flatMap((page) => page.items) ?? [], new Date(), timeZone),
    [list.data, timeZone],
  );
  const renderItem = useCallback<ListRenderItem<Entry>>(
    ({ item }) =>
      item.kind === 'header' ? <SectionHeader title={item.title} /> : <TransactionRow item={item.item} onPress={openEdit} />,
    [openEdit],
  );
  const refresh = () => {
    setPulling(true);
    list.refetch().finally(() => setPulling(false));
  };
  const loadMore = () => {
    if (list.hasNextPage && !list.isFetching) list.fetchNextPage();
  };

  const messageStyle = { fontFamily: fonts.body, fontSize: typeScale.body, color: colors.ash, marginTop: 12 };
  const empty = list.isPending ? (
    <PlaceholderRows count={6} />
  ) : (
    <Text style={list.isError ? { ...messageStyle, color: colors.signal } : messageStyle}>
      {list.isError ? LOAD_TRANSACTIONS_ERROR : emptyMessage(filters)}
    </Text>
  );

  return (
    <>
      <ListScreen
        title="MOVIMIENTOS"
        backdrop={1}
        header={<FilterBar filters={filters} onChange={setFilters} count={list.data?.pages[0]?.count ?? null} />}
        data={entries}
        keyExtractor={(entry) => entry.key}
        renderItem={renderItem}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={pulling} onRefresh={refresh} colors={[colors.blood]} progressBackgroundColor={colors.panel} />
        }
        ListEmptyComponent={empty}
        ListFooterComponent={list.isFetchingNextPage ? <PlaceholderRows count={2} /> : null}
        floating={<AddFab onPress={openNew} />}
      />
      <ExpenseSheet {...sheet} />
    </>
  );
}
