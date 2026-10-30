import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { RefreshControl, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { SkewChip } from '@/components/SkewChip';
import { colors } from '@/theme/tokens';
import { DEFAULT_VIEW, HISTORY_VIEWS, type HistoryView } from '../granularity';
import { historyKeys } from '../keys';
import { VIEW_LABELS } from '../labels';
import { AllTimeHistory } from './AllTimeHistory';
import { PeriodHistory } from './PeriodHistory';

/** Historial: selector de vista (Semana, Mes, Año, Todo) y, debajo, la vista elegida. Abre en Mes. */
export function HistoryScreen() {
  const [view, setView] = useState<HistoryView>(DEFAULT_VIEW);
  const [pulling, setPulling] = useState(false);
  const queryClient = useQueryClient();
  // Tirar hacia abajo refresca todas las consultas activas del Historial, sin acoplar la pantalla a las de cada hijo.
  const refresh = () => {
    setPulling(true);
    queryClient.refetchQueries({ queryKey: historyKeys.all, type: 'active' }).finally(() => setPulling(false));
  };

  return (
    <Screen
      title="HISTORIAL"
      backdrop={2}
      refreshControl={<RefreshControl refreshing={pulling} onRefresh={refresh} colors={[colors.blood]} progressBackgroundColor={colors.panel} />}
    >
      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
        {HISTORY_VIEWS.map((option) => (
          <SkewChip key={option} label={VIEW_LABELS[option]} selected={view === option} onPress={() => setView(option)} />
        ))}
      </View>
      {view === 'all' ? <AllTimeHistory /> : <PeriodHistory key={view} granularity={view} />}
    </Screen>
  );
}
