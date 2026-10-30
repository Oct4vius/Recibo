import { useState } from 'react';
import { AccountsScreen } from '../accounts/AccountsScreen';
import { BudgetScreen } from '../budget/BudgetScreen';
import { HistoryScreen } from '../history/HistoryScreen';
import { viewForCategory } from '../movements/movements-view';
import { MovementsScreen } from '../movements/MovementsScreen';
import { MonthScreen } from '../month/MonthScreen';
import { SettingsScreen } from '../settings/SettingsScreen';
import { openMovements, selectSection, START_ROUTE, type ShellRoute } from './navigation';
import { Sidebar } from './Sidebar';

export function Shell() {
  const [route, setRoute] = useState<ShellRoute>(START_ROUTE);

  return (
    <div className="shell">
      <Sidebar active={route.section} onSelect={(section) => setRoute((r) => selectSection(r, section))} />
      <main className="content">
        {route.section === 'month' ? (
          <MonthScreen
            key={route.visit}
            onOpenCategory={(categoryId, start) => setRoute((r) => openMovements(r, viewForCategory(start, categoryId)))}
            onOpenBudget={() => setRoute((r) => selectSection(r, 'budget'))}
          />
        ) : route.section === 'movements' ? (
          <MovementsScreen key={route.visit} initial={route.movements} />
        ) : route.section === 'history' ? (
          <HistoryScreen onOpenMovements={(view) => setRoute((r) => openMovements(r, view))} />
        ) : route.section === 'budget' ? (
          <BudgetScreen />
        ) : route.section === 'accounts' ? (
          <AccountsScreen />
        ) : (
          <SettingsScreen />
        )}
      </main>
    </div>
  );
}
