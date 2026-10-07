import type { ReactNode } from 'react';
import { FlatList, View, type FlatListProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BackdropIndex } from '@/theme/backdrops';
import { colors } from '@/theme/tokens';
import { RansomText } from './RansomText';
import { ScreenBackdrop } from './ScreenBackdrop';

type Props<T> = {
  title: string;
  backdrop: BackdropIndex;
  /** Contenido entre el título y la lista (p. ej. filtros). */
  header?: ReactNode;
  floating?: ReactNode;
} & Omit<FlatListProps<T>, 'ListHeaderComponent' | 'contentContainerStyle' | 'keyboardShouldPersistTaps'>;

/** Pantalla de lista larga: FlatList real (sin ScrollView padre), título como cabecera de la lista. */
export function ListScreen<T>({ title, backdrop, header, floating, ...list }: Props<T>) {
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.void }}>
      <ScreenBackdrop index={backdrop} />
      <FlatList
        {...list}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
        ListHeaderComponent={
          <View>
            <View style={{ marginTop: 12, marginBottom: 24 }}>
              <RansomText text={title} animate />
            </View>
            {header}
          </View>
        }
      />
      {floating}
    </SafeAreaView>
  );
}
