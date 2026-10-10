import type { ReactElement, ReactNode } from 'react';
import { ScrollView, View, type RefreshControlProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BackdropIndex } from '@/theme/backdrops';
import { colors } from '@/theme/tokens';
import { RansomText } from './RansomText';
import { ScreenBackdrop } from './ScreenBackdrop';

interface Props {
  title: string;
  backdrop: BackdropIndex;
  /** Contenido sobre el título (p. ej. la fecha de hoy en Inicio). */
  aboveTitle?: ReactNode;
  /** Elementos flotantes sobre el scroll (p. ej. el botón "+"). */
  floating?: ReactNode;
  refreshControl?: ReactElement<RefreshControlProps>;
  children?: ReactNode;
}

/** Pantalla con scroll: fondo `void`, forma roja de la pestaña, título en nota de rescate. */
export function Screen({ title, backdrop, aboveTitle, floating, refreshControl, children }: Props) {
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.void }}>
      <ScreenBackdrop index={backdrop} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        refreshControl={refreshControl}
        contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
      >
        {aboveTitle}
        <View style={{ marginTop: 12, marginBottom: 24 }}>
          <RansomText text={title} animate />
        </View>
        {children}
      </ScrollView>
      {floating}
    </SafeAreaView>
  );
}
