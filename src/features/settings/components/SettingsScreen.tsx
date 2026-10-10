import { Screen } from '@/components/Screen';
import { AccountSection } from './AccountSection';
import { AlertsSection } from './AlertsSection';
import { LinksSection } from './LinksSection';
import { MoneySection } from './MoneySection';
import { TimeZoneSection } from './TimeZoneSection';

/** Ajustes: cuenta, avisos, dinero, zona horaria y enlaces a Categorías y Reglas. */
export function SettingsScreen() {
  return (
    <Screen title="AJUSTES" backdrop={4}>
      <AccountSection />
      <AlertsSection />
      <MoneySection />
      <TimeZoneSection />
      <LinksSection />
    </Screen>
  );
}
