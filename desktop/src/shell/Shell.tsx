import { useState } from 'react';
import { HistoryScreen } from '../history/HistoryScreen';
import { viewForCategory } from '../movements/movements-view';
import { MovementsScreen } from '../movements/MovementsScreen';
import { MonthScreen } from '../month/MonthScreen';
import { ComingSoon } from './ComingSoon';
import { openMovements, selectSection, START_ROUTE, type ShellRoute } from './navigation';
import { Sidebar } from './Sidebar';
import { SECTIONS } from './sections';

export function Shell() {
  const [route, setRoute] = useState<ShellRoute>(START_ROUTE);
  const label = SECTIONS.find((s) => s.id === route.section)?.label;

  return (
    <div className="shell">
      <Sidebar active={route.section} onSelect={(section) => setRoute((r) => selectSection(r, section))} />
      <main className="content">
        {route.section === 'month' ? (
          <MonthScreen
            onOpenCategory={(categoryId, start) => setRoute((r) => openMovements(r, viewForCategory(start, categoryId)))}
            onOpenBudget={() => setRoute((r) => selectSection(r, 'budget'))}
          />
        ) : route.section === 'movements' ? (
          <MovementsScreen key={route.visit} initial={route.movements} />
        ) : route.section === 'history' ? (
          <HistoryScreen onOpenMovements={(view) => setRoute((r) => openMovements(r, view))} />
        ) : (
          <>
            <h1>{label}</h1>
            <ComingSoon />
          </>
        )}
      </main>
    </div>
  );
}
