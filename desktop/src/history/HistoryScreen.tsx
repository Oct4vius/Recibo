import { useState } from 'react';
import type { HistoryView } from '@/features/history/granularity';
import { VIEW_LABELS } from '@/features/history/labels';
import type { MovementsView } from '../movements/movements-view';
import { Button } from '../ui/Button';
import { AllTimeView } from './AllTimeView';
import { DESKTOP_VIEWS } from './history-text';
import { PeriodView } from './PeriodView';
import './history.css';

export function HistoryScreen({ onOpenMovements }: { onOpenMovements: (view: MovementsView) => void }) {
  const [view, setView] = useState<HistoryView>('month');

  return (
    <div className="ticket history-screen">
      <h1>Meses anteriores</h1>
      <div className="history-views">
        {DESKTOP_VIEWS.map((id) => (
          <Button key={id} variant="secondary" aria-pressed={id === view} onClick={() => setView(id)}>
            {VIEW_LABELS[id]}
          </Button>
        ))}
      </div>
      {view === 'all' ? (
        <AllTimeView onOpenMovements={onOpenMovements} />
      ) : (
        // key: cada granularidad nace de cero (ventana y barra elegida propias).
        <PeriodView key={view} granularity={view} onOpenMovements={onOpenMovements} />
      )}
    </div>
  );
}
