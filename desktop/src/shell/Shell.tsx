import { listen } from '@tauri-apps/api/event';
import { useEffect, useState } from 'react';
import { useLocalDay } from '../alerts/use-local-day';
import { useBudgetAlerts } from '../alerts/use-budget-alerts';
import { useTimeZone } from '@/features/profile/hooks';
import { AccountsScreen } from '../accounts/AccountsScreen';
import { BudgetScreen } from '../budget/BudgetScreen';
import { HistoryScreen } from '../history/HistoryScreen';
import { viewForCategory } from '../movements/movements-view';
import { MovementsScreen } from '../movements/MovementsScreen';
import { MonthScreen } from '../month/MonthScreen';
import { SettingsScreen } from '../settings/SettingsScreen';
import { openMovements, selectSection, START_ROUTE, type ShellRoute } from './navigation';
import { UpdateBanner } from '../updates/UpdateBanner';
import { Sidebar } from './Sidebar';

export function Shell() {
  const [route, setRoute] = useState<ShellRoute>(START_ROUTE);
  const day = useLocalDay(useTimeZone());
  useBudgetAlerts();

  // Rust emite `open-month` al tocar un aviso de Windows.
  useEffect(() => {
    const unlisten = listen('open-month', () => setRoute((r) => selectSection(r, 'month')));
    return () => void unlisten.then((off) => off());
  }, []);

  return (
    <div className="shell">
      <Sidebar active={route.section} onSelect={(section) => setRoute((r) => selectSection(r, section))} />
      <div className="shell-main">
      <UpdateBanner />
      <main className="content" key={day}>
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
    </div>
  );
}
